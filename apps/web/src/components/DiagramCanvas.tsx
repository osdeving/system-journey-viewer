import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  DragEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
} from 'react'
import {
  DEFAULT_GRID_SIZE,
  nearestPortId,
  nodeCenter,
  portWorldPosition,
  snapBounds,
} from '../engine/geometry'
import type { EdgeModel, NodeModel } from '../model/types'
import { protocolPresets } from '../presets/catalog'
import { iconForKey } from '../presets/iconPipeline'
import { useEditorStore } from '../store/useEditorStore'
import {
  resolveEdgeJourneyBadge,
  type EdgeJourneyBadge,
  type EdgeJourneyMarker,
} from './edgeJourneyBadge'
import { resolveHexConnectorRole } from './hexConnectorRole'
import { JourneyEdge } from './JourneyEdge'
import { resolveDbCylinderShape, resolveQueueCylinderShape } from './nodeShapePaths'
import { curveToSvgPath, cubicPointAt, type EdgeCurvePath } from './edgePresentation'
import {
  resolveArrivalAdvance,
  resolveTravelProgress,
  STEP_ARRIVAL_HOLD_MS,
} from './playerStepTimeline'
import {
  buildTrailPoints,
  compactPositiveAlphaInPlace,
  trimArrayStartInPlace,
} from './trailMath'

type PanState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

type NodeDragState = {
  pointerId: number
  primaryNodeId: string
  nodeIds: string[]
  mode: 'move' | 'resize'
  resizeHandle?: ResizeHandle
  startClientX: number
  startClientY: number
  originBoundsByNodeId: Record<string, NodeModel['bounds']>
}

type ConnectionDragState = {
  pointerId: number
  sourceNodeId: string
  sourcePortId: string
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

type DragPreviewState = {
  from: { x: number; y: number }
  to: { x: number; y: number }
} | null

type EdgeEndpointKey = 'from' | 'to'

type EdgeReconnectState = {
  pointerId: number
  edgeId: string
  endpoint: EdgeEndpointKey
  fixedPoint: { x: number; y: number }
}

type ResolvedEdgeCurve = EdgeCurvePath & {
  fromPortId?: string
  toPortId?: string
}

type EdgeRenderItem = {
  edge: EdgeModel
  curve: ResolvedEdgeCurve
  path: string
}

type EdgeAnchorCandidate = {
  edgeId: string
  endpoint: EdgeEndpointKey
  curve: ResolvedEdgeCurve
}

type EdgeAnchorHandle = {
  key: string
  nodeId: string
  portId: string
  x: number
  y: number
  candidates: EdgeAnchorCandidate[]
}

type TrailParticle = {
  id: number
  color: string
  alpha: number
  radius: number
  position: { x: number; y: number }
}

const ZOOM_SENSITIVITY = 0.0012
const TRAIL_INITIAL_ALPHA = 0.72
const TRAIL_FADE_FACTOR = 0.0003
const TRAIL_PARTICLE_RADIUS = 4.2
const TRAIL_PARTICLE_SHADOW_BLUR = 18
const ORB_RADIUS = 6.2
const ORB_SHADOW_BLUR = 24
const TRAIL_MIN_SPACING = 1.1
const MAX_TRAILS = 700
const MIN_NODE_SIZE = 80
const RESIZE_BORDER_HIT_SIZE = 10
const EDGE_ANCHOR_CAPTURE_RADIUS = 11
const EDGE_ANCHOR_RESOLVE_RADIUS = 12
const PLAYER_TRACK_BASE_ALPHA = 0.18
const PLAYER_TRACK_PROGRESS_ALPHA = 0.88
const TRAIL_CANVAS_MAX_PIXEL_RATIO = 1.5
const TRAIL_MIN_VISIBLE_ALPHA = 0.015
const FINAL_STEP_ARRIVAL_HOLD_MS = 220

const resolveCurveFromEdge = (
  edge: EdgeModel,
  nodes: Record<string, NodeModel>,
): ResolvedEdgeCurve | null => {
  const from = nodes[edge.from.nodeId]
  const to = nodes[edge.to.nodeId]
  if (!from || !to) {
    return null
  }

  const fromPortId = edge.from.portId ?? nearestPortId(from, nodeCenter(to))
  const toPortId = edge.to.portId ?? nearestPortId(to, nodeCenter(from))
  const start = portWorldPosition(from, fromPortId)
  const end = portWorldPosition(to, toPortId)
  const middleX = (start.x + end.x) / 2

  return {
    start,
    control1: { x: middleX, y: start.y },
    control2: { x: middleX, y: end.y },
    end,
    fromPortId,
    toPortId,
  }
}

const resolveResizeHandleCursor = (handle: ResizeHandle): string => {
  if (handle === 'n' || handle === 's') {
    return 'ns-resize'
  }
  if (handle === 'e' || handle === 'w') {
    return 'ew-resize'
  }
  if (handle === 'ne' || handle === 'sw') {
    return 'nesw-resize'
  }
  return 'nwse-resize'
}

const resolveResizeHandleFromLocalPoint = (
  node: NodeModel,
  localX: number,
  localY: number,
): ResizeHandle | null => {
  const threshold = Math.min(RESIZE_BORDER_HIT_SIZE, Math.min(node.bounds.w, node.bounds.h) / 3)
  const nearLeft = localX <= threshold
  const nearRight = localX >= node.bounds.w - threshold
  const nearTop = localY <= threshold
  const nearBottom = localY >= node.bounds.h - threshold

  if (nearTop && nearLeft) {
    return 'nw'
  }
  if (nearTop && nearRight) {
    return 'ne'
  }
  if (nearBottom && nearLeft) {
    return 'sw'
  }
  if (nearBottom && nearRight) {
    return 'se'
  }
  if (nearTop) {
    return 'n'
  }
  if (nearBottom) {
    return 's'
  }
  if (nearLeft) {
    return 'w'
  }
  if (nearRight) {
    return 'e'
  }
  return null
}

const distancePointToCurve = (
  curve: EdgeCurvePath,
  target: { x: number; y: number },
): number => {
  let min = Number.POSITIVE_INFINITY
  for (let step = 0; step <= 24; step += 1) {
    const point = cubicPointAt(curve, step / 24)
    const distance = Math.hypot(point.x - target.x, point.y - target.y)
    if (distance < min) {
      min = distance
    }
  }
  return min
}

const drawCurveTrack = (
  context: CanvasRenderingContext2D,
  curve: EdgeCurvePath,
  options: {
    color: string
    alpha: number
    width: number
    glow: number
  },
): void => {
  context.save()
  context.strokeStyle = hexToRgba(options.color, options.alpha)
  context.lineWidth = options.width
  context.shadowColor = hexToRgba(options.color, Math.min(1, options.alpha + 0.14))
  context.shadowBlur = options.glow
  context.beginPath()
  context.moveTo(curve.start.x, curve.start.y)
  context.bezierCurveTo(
    curve.control1.x,
    curve.control1.y,
    curve.control2.x,
    curve.control2.y,
    curve.end.x,
    curve.end.y,
  )
  context.stroke()
  context.restore()
}

const drawCurveProgress = (
  context: CanvasRenderingContext2D,
  curve: EdgeCurvePath,
  progress: number,
  options: {
    color: string
    alpha: number
    width: number
    glow: number
  },
): void => {
  const clampedProgress = Math.max(0, Math.min(1, progress))
  if (clampedProgress <= 0) {
    return
  }
  const steps = Math.max(8, Math.ceil(28 * clampedProgress))
  context.save()
  context.strokeStyle = hexToRgba(options.color, options.alpha)
  context.lineWidth = options.width
  context.shadowColor = hexToRgba(options.color, Math.min(1, options.alpha + 0.16))
  context.shadowBlur = options.glow
  context.beginPath()
  context.moveTo(curve.start.x, curve.start.y)
  for (let index = 1; index <= steps; index += 1) {
    const t = (clampedProgress * index) / steps
    const point = cubicPointAt(curve, t)
    context.lineTo(point.x, point.y)
  }
  context.stroke()
  context.restore()
}

const hexToRgba = (color: string, alpha: number): string => {
  if (!color.startsWith('#')) {
    return `rgba(96, 165, 250, ${alpha})`
  }
  const hex = color.replace('#', '')
  const normalized =
    hex.length === 3
      ? hex
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : hex
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export const DiagramCanvas = () => {
  const panStateRef = useRef<PanState | null>(null)
  const nodeDragStateRef = useRef<NodeDragState | null>(null)
  const connectionDragRef = useRef<ConnectionDragState | null>(null)
  const edgeReconnectRef = useRef<EdgeReconnectState | null>(null)
  const edgeAnchorCycleRef = useRef(new Map<string, number>())
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const trailCanvasMetricsRef = useRef({ width: 0, height: 0, pixelRatio: 1 })
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 })
  const trailsRef = useRef<TrailParticle[]>([])
  const lastFrameTsRef = useRef<number | null>(null)
  const nextTrailIdRef = useRef(1)
  const stepKeyRef = useRef<string | null>(null)
  const stepStartTsRef = useRef<number | null>(null)
  const stepArrivalStartTsRef = useRef<number | null>(null)
  const playerStepArrivedRef = useRef(false)
  const stepAdvanceRequestedRef = useRef(false)
  const orbPositionRef = useRef<{ x: number; y: number } | null>(null)
  const lastTrailPositionRef = useRef<{ x: number; y: number } | null>(null)
  const [connectionPreview, setConnectionPreview] = useState<DragPreviewState>(null)
  const [hoverCursor, setHoverCursor] = useState<string | null>(null)
  const [dragCursor, setDragCursor] = useState<string | null>(null)
  const [hoveredAnchorKey, setHoveredAnchorKey] = useState<string | null>(null)
  const [playerStepArrivedForUi, setPlayerStepArrivedForUi] = useState(false)

  const workspace = useEditorStore((state) => state.workspace)
  const viewId = useEditorStore((state) => state.currentViewId)
  const viewport = useEditorStore((state) => state.viewport)
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds)
  const selectedEdgeId = useEditorStore((state) => state.selectedEdgeId)
  const activeTool = useEditorStore((state) => state.activeTool)
  const pendingConnectionFrom = useEditorStore((state) => state.pendingConnectionFrom)
  const activeJourneyId = useEditorStore((state) => state.activeJourneyId)
  const journeyFilterId = useEditorStore((state) => state.journeyFilterId)
  const playerJourneyId = useEditorStore((state) => state.playerJourneyId)
  const playerStepIndex = useEditorStore((state) => state.playerStepIndex)
  const playerSpeedMs = useEditorStore((state) => state.playerSpeedMs)
  const playerHighlightNodes = useEditorStore((state) => state.playerHighlightNodes)
  const playerTrailEnabled = useEditorStore((state) => state.playerTrailEnabled)
  const playerIsRunning = useEditorStore((state) => state.playerIsRunning)
  const stepPlayer = useEditorStore((state) => state.stepPlayer)
  const setViewport = useEditorStore((state) => state.setViewport)
  const selectNode = useEditorStore((state) => state.selectNode)
  const selectEdge = useEditorStore((state) => state.selectEdge)
  const openDrilldown = useEditorStore((state) => state.openDrilldown)
  const setNodeBounds = useEditorStore((state) => state.setNodeBounds)
  const setNodesBounds = useEditorStore((state) => state.setNodesBounds)
  const addNode = useEditorStore((state) => state.addNode)
  const beginConnection = useEditorStore((state) => state.beginConnection)
  const connectPendingTo = useEditorStore((state) => state.connectPendingTo)
  const cancelPendingConnection = useEditorStore((state) => state.cancelPendingConnection)
  const reconnectEdgeEndpoint = useEditorStore((state) => state.reconnectEdgeEndpoint)

  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  const currentView = workspace.views[viewId]
  const gridEnabled = workspace.settings.grid
  const snapEnabled = workspace.settings.snap
  const nodes = useMemo(
    () =>
      currentView.nodeIds
        .map((nodeId) => workspace.nodes[nodeId])
        .filter((node): node is NodeModel => !!node),
    [currentView.nodeIds, workspace.nodes],
  )
  const edges = useMemo(
    () =>
      currentView.edgeIds
        .map((edgeId) => workspace.edges[edgeId])
        .filter((edge): edge is EdgeModel => !!edge),
    [currentView.edgeIds, workspace.edges],
  )

  const edgeJourneyMarkers = useMemo(() => {
    const markers: Record<string, EdgeJourneyMarker[]> = {}
    for (const journeyId of currentView.journeyIds) {
      const journey = workspace.journeys[journeyId]
      if (!journey) {
        continue
      }
      for (const step of journey.steps) {
        if (!markers[step.edgeId]) {
          markers[step.edgeId] = []
        }
        markers[step.edgeId].push({
          journeyId,
          colorKey: journey.colorKey,
          stepNumber: step.n,
        })
      }
    }
    return markers
  }, [currentView.journeyIds, workspace.journeys])

  const edgeBadgeById = useMemo(() => {
    const badges: Record<string, EdgeJourneyBadge> = {}
    for (const edge of edges) {
      const markers = edgeJourneyMarkers[edge.id] ?? []
      const badge = resolveEdgeJourneyBadge(markers, {
        journeyFilterId,
        activeJourneyId,
        playerJourneyId,
      })
      if (badge) {
        badges[edge.id] = badge
      }
    }
    return badges
  }, [activeJourneyId, edgeJourneyMarkers, edges, journeyFilterId, playerJourneyId])
  const protocolLabelById = useMemo(
    () =>
      Object.fromEntries(
        protocolPresets.map((preset) => [preset.id, preset.label]),
      ) as Record<string, string>,
    [],
  )

  const visibleEdges = useMemo(() => {
    if (!journeyFilterId) {
      return edges
    }
    const journey = workspace.journeys[journeyFilterId]
    if (!journey) {
      return edges
    }
    const edgeSet = new Set(journey.steps.map((step) => step.edgeId))
    return edges.filter((edge) => edgeSet.has(edge.id))
  }, [edges, journeyFilterId, workspace.journeys])
  const selectedNodeIdSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds])
  const edgeRenderItems = useMemo(
    () =>
      visibleEdges
        .map((edge): EdgeRenderItem | null => {
          const curve = resolveCurveFromEdge(edge, workspace.nodes)
          if (!curve) {
            return null
          }
          return {
            edge,
            curve,
            path: curveToSvgPath(curve),
          }
        })
        .filter((item): item is EdgeRenderItem => !!item),
    [visibleEdges, workspace.nodes],
  )
  const edgeAnchorHandles = useMemo(() => {
    const handlesByKey = new Map<string, EdgeAnchorHandle>()
    for (const item of edgeRenderItems) {
      const fromPortId = item.curve.fromPortId
      const toPortId = item.curve.toPortId
      if (fromPortId) {
        const key = `${item.edge.from.nodeId}:${fromPortId}`
        const existing = handlesByKey.get(key)
        if (existing) {
          existing.candidates.push({
            edgeId: item.edge.id,
            endpoint: 'from',
            curve: item.curve,
          })
        } else {
          handlesByKey.set(key, {
            key,
            nodeId: item.edge.from.nodeId,
            portId: fromPortId,
            x: item.curve.start.x,
            y: item.curve.start.y,
            candidates: [
              {
                edgeId: item.edge.id,
                endpoint: 'from',
                curve: item.curve,
              },
            ],
          })
        }
      }
      if (toPortId) {
        const key = `${item.edge.to.nodeId}:${toPortId}`
        const existing = handlesByKey.get(key)
        if (existing) {
          existing.candidates.push({
            edgeId: item.edge.id,
            endpoint: 'to',
            curve: item.curve,
          })
        } else {
          handlesByKey.set(key, {
            key,
            nodeId: item.edge.to.nodeId,
            portId: toPortId,
            x: item.curve.end.x,
            y: item.curve.end.y,
            candidates: [
              {
                edgeId: item.edge.id,
                endpoint: 'to',
                curve: item.curve,
              },
            ],
          })
        }
      }
    }
    return Array.from(handlesByKey.values())
  }, [edgeRenderItems])

  const playerJourney = playerJourneyId
    ? workspace.journeys[playerJourneyId]
    : undefined
  const sortedPlayerSteps = useMemo(
    () =>
      playerJourney
        ? playerJourney.steps.slice().sort((left, right) => left.n - right.n)
        : [],
    [playerJourney],
  )
  const currentPlayerStep = sortedPlayerSteps[playerStepIndex]
  const currentPlayerEdgeId = currentPlayerStep?.edgeId ?? null
  const currentPlayerCurve = useMemo(() => {
    if (!currentPlayerEdgeId) {
      return null
    }
    const edge = workspace.edges[currentPlayerEdgeId]
    return edge ? resolveCurveFromEdge(edge, workspace.nodes) : null
  }, [currentPlayerEdgeId, workspace.edges, workspace.nodes])
  const currentPlayerColor = playerJourney?.colorKey ?? '#f59e0b'
  const animatedEdgeIdSet = useMemo(() => {
    const ids = new Set<string>()
    if (selectedEdgeId) {
      ids.add(selectedEdgeId)
    }
    if (currentPlayerEdgeId) {
      ids.add(currentPlayerEdgeId)
    }
    const contextJourneyId = journeyFilterId ?? activeJourneyId
    if (contextJourneyId) {
      const journey = workspace.journeys[contextJourneyId]
      for (const step of journey?.steps ?? []) {
        ids.add(step.edgeId)
      }
    }
    return ids
  }, [activeJourneyId, currentPlayerEdgeId, journeyFilterId, selectedEdgeId, workspace.journeys])

  const highlightedNodeIds = useMemo(() => {
    if (!playerHighlightNodes || !currentPlayerEdgeId) {
      return new Set<string>()
    }
    const edge = workspace.edges[currentPlayerEdgeId]
    if (!edge) {
      return new Set<string>()
    }
    const set = new Set<string>([edge.from.nodeId])
    if (!playerIsRunning || playerStepArrivedForUi) {
      set.add(edge.to.nodeId)
    }
    for (const nodeId of currentPlayerStep?.highlightNodes ?? []) {
      set.add(nodeId)
    }
    return set
  }, [
    currentPlayerEdgeId,
    currentPlayerStep?.highlightNodes,
    playerHighlightNodes,
    playerIsRunning,
    playerStepArrivedForUi,
    workspace.edges,
  ])

  useEffect(() => {
    connectionDragRef.current = null
    edgeReconnectRef.current = null
    let resetPreviewFrame = window.requestAnimationFrame(() => {
      setConnectionPreview(null)
    })
    let resetCursorFrame = window.requestAnimationFrame(() => {
      setDragCursor(null)
    })
    if (activeTool !== 'connector') {
      cancelPendingConnection()
    }
    return () => {
      window.cancelAnimationFrame(resetPreviewFrame)
      resetPreviewFrame = 0
      window.cancelAnimationFrame(resetCursorFrame)
      resetCursorFrame = 0
    }
  }, [activeTool, cancelPendingConnection])

  useEffect(() => {
    trailsRef.current = []
    orbPositionRef.current = null
    lastTrailPositionRef.current = null
    stepKeyRef.current = null
    stepStartTsRef.current = null
    stepArrivalStartTsRef.current = null
    playerStepArrivedRef.current = false
    stepAdvanceRequestedRef.current = false
    connectionDragRef.current = null
    edgeReconnectRef.current = null
    let resetPreviewFrame = window.requestAnimationFrame(() => {
      setConnectionPreview(null)
    })
    let resetFrame = window.requestAnimationFrame(() => {
      setPlayerStepArrivedForUi(false)
    })
    let resetCursorFrame = window.requestAnimationFrame(() => {
      setHoverCursor(null)
      setDragCursor(null)
      setHoveredAnchorKey(null)
    })
    const trailCanvas = trailCanvasRef.current
    const context = trailCanvas?.getContext('2d')
    if (trailCanvas && context) {
      context.clearRect(0, 0, trailCanvas.width, trailCanvas.height)
    }
    return () => {
      window.cancelAnimationFrame(resetPreviewFrame)
      resetPreviewFrame = 0
      window.cancelAnimationFrame(resetFrame)
      resetFrame = 0
      window.cancelAnimationFrame(resetCursorFrame)
      resetCursorFrame = 0
    }
  }, [viewId])

  useEffect(() => {
    if (playerTrailEnabled) {
      return
    }
    trailsRef.current = []
    lastTrailPositionRef.current = null
    const trailCanvas = trailCanvasRef.current
    const context = trailCanvas?.getContext('2d')
    if (trailCanvas && context) {
      context.clearRect(0, 0, trailCanvas.width, trailCanvas.height)
    }
  }, [playerTrailEnabled])

  useEffect(() => {
    const trailCanvas = trailCanvasRef.current
    if (!trailCanvas) {
      return
    }
    const context = trailCanvas.getContext('2d')
    if (!context) {
      return
    }

    const updateCanvasMetrics = () => {
      const width = Math.max(1, Math.floor(trailCanvas.clientWidth))
      const height = Math.max(1, Math.floor(trailCanvas.clientHeight))
      const pixelRatio = Math.max(
        1,
        Math.min(window.devicePixelRatio || 1, TRAIL_CANVAS_MAX_PIXEL_RATIO),
      )
      const nextWidth = Math.floor(width * pixelRatio)
      const nextHeight = Math.floor(height * pixelRatio)
      if (
        trailCanvas.width === nextWidth &&
        trailCanvas.height === nextHeight &&
        trailCanvasMetricsRef.current.pixelRatio === pixelRatio
      ) {
        return
      }

      trailCanvas.width = nextWidth
      trailCanvas.height = nextHeight
      trailCanvasMetricsRef.current = { width, height, pixelRatio }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)
    }

    updateCanvasMetrics()
    window.addEventListener('resize', updateCanvasMetrics)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateCanvasMetrics()
      })
      observer.observe(trailCanvas)
    }

    return () => {
      window.removeEventListener('resize', updateCanvasMetrics)
      observer?.disconnect()
    }
  }, [])

  useEffect(() => {
    const trailCanvas = trailCanvasRef.current
    if (!trailCanvas) {
      return
    }
    const context = trailCanvas.getContext('2d')
    if (!context) {
      return
    }

    let rafId: number | null = null
    const drawFrame = (timestamp: number) => {
      const metrics = trailCanvasMetricsRef.current
      if (metrics.width <= 0 || metrics.height <= 0) {
        rafId = window.requestAnimationFrame(drawFrame)
        return
      }

      const previousTs = lastFrameTsRef.current ?? timestamp
      const dt = Math.max(0, timestamp - previousTs)
      lastFrameTsRef.current = timestamp
      const viewportSnapshot = viewportRef.current
      const safeZoom = Math.max(viewportSnapshot.zoom, 0.25)
      const inverseSafeZoom = 1 / safeZoom

      const stepKey = currentPlayerEdgeId
        ? `${viewId}:${playerJourneyId ?? ''}:${playerStepIndex}:${currentPlayerEdgeId}`
        : null

      if (stepKey !== stepKeyRef.current) {
        stepKeyRef.current = stepKey
        stepStartTsRef.current = timestamp
        stepArrivalStartTsRef.current = null
        playerStepArrivedRef.current = false
        stepAdvanceRequestedRef.current = false
        orbPositionRef.current = null
        lastTrailPositionRef.current = null
        setPlayerStepArrivedForUi(false)
      }

      let travelProgress = 0
      let shouldAdvanceStep = false
      if (playerIsRunning && stepKey && currentPlayerCurve) {
        const elapsed = Math.max(0, timestamp - (stepStartTsRef.current ?? timestamp))
        travelProgress = resolveTravelProgress(elapsed, playerSpeedMs)
        const hasArrived = travelProgress >= 1
        if (playerStepArrivedRef.current !== hasArrived) {
          playerStepArrivedRef.current = hasArrived
          setPlayerStepArrivedForUi(hasArrived)
        }
        const isFinalStep =
          sortedPlayerSteps.length > 0 &&
          playerStepIndex >= sortedPlayerSteps.length - 1
        const arrivalState = resolveArrivalAdvance({
          travelProgress,
          nowMs: timestamp,
          arrivalStartedAtMs: stepArrivalStartTsRef.current,
          alreadyAdvanced: stepAdvanceRequestedRef.current,
          holdMs: isFinalStep ? FINAL_STEP_ARRIVAL_HOLD_MS : STEP_ARRIVAL_HOLD_MS,
        })
        stepArrivalStartTsRef.current = arrivalState.arrivalStartedAtMs
        shouldAdvanceStep = arrivalState.shouldAdvance

        if (travelProgress > 0) {
          const orbPoint = cubicPointAt(currentPlayerCurve, travelProgress)
          orbPositionRef.current = orbPoint
          if (playerTrailEnabled) {
            const lastTrail = lastTrailPositionRef.current
            const minSpacing = TRAIL_MIN_SPACING * inverseSafeZoom
            const trailPoints = buildTrailPoints(lastTrail, orbPoint, minSpacing)
            if (trailPoints.length > 0) {
              for (const point of trailPoints) {
                trailsRef.current.push({
                  id: nextTrailIdRef.current,
                  color: currentPlayerColor,
                  alpha: TRAIL_INITIAL_ALPHA,
                  radius: TRAIL_PARTICLE_RADIUS * inverseSafeZoom,
                  position: point,
                })
                nextTrailIdRef.current += 1
              }
              lastTrailPositionRef.current = trailPoints[trailPoints.length - 1]
              if (trailsRef.current.length > MAX_TRAILS) {
                trimArrayStartInPlace(trailsRef.current, MAX_TRAILS)
              }
            }
          } else {
            lastTrailPositionRef.current = null
          }
        } else {
          orbPositionRef.current = null
          lastTrailPositionRef.current = null
        }
      } else {
        orbPositionRef.current = null
        lastTrailPositionRef.current = null
        stepArrivalStartTsRef.current = null
        if (playerStepArrivedRef.current) {
          playerStepArrivedRef.current = false
          setPlayerStepArrivedForUi(false)
        }
        stepAdvanceRequestedRef.current = false
      }

      context.setTransform(metrics.pixelRatio, 0, 0, metrics.pixelRatio, 0, 0)
      context.clearRect(0, 0, metrics.width, metrics.height)

      context.save()
      context.globalCompositeOperation = 'screen'
      context.setTransform(
        metrics.pixelRatio * viewportSnapshot.zoom,
        0,
        0,
        metrics.pixelRatio * viewportSnapshot.zoom,
        metrics.pixelRatio * viewportSnapshot.x,
        metrics.pixelRatio * viewportSnapshot.y,
      )

      if (playerIsRunning && currentPlayerCurve && playerTrailEnabled) {
        drawCurveTrack(context, currentPlayerCurve, {
          color: currentPlayerColor,
          alpha: PLAYER_TRACK_BASE_ALPHA,
          width: 2.2 * inverseSafeZoom,
          glow: 9 * inverseSafeZoom,
        })
        drawCurveProgress(context, currentPlayerCurve, travelProgress, {
          color: currentPlayerColor,
          alpha: PLAYER_TRACK_PROGRESS_ALPHA,
          width: 3.3 * inverseSafeZoom,
          glow: 16 * inverseSafeZoom,
        })
      }

      if (playerTrailEnabled) {
        for (const trail of trailsRef.current) {
          trail.alpha -= dt * TRAIL_FADE_FACTOR
          if (trail.alpha <= TRAIL_MIN_VISIBLE_ALPHA) {
            continue
          }
          context.beginPath()
          context.arc(trail.position.x, trail.position.y, trail.radius, 0, Math.PI * 2)
          context.fillStyle = hexToRgba(trail.color, trail.alpha)
          context.shadowColor = hexToRgba(trail.color, Math.min(1, trail.alpha + 0.2))
          context.shadowBlur = TRAIL_PARTICLE_SHADOW_BLUR * inverseSafeZoom
          context.fill()
        }
        compactPositiveAlphaInPlace(trailsRef.current)
      }

      if (playerIsRunning && orbPositionRef.current) {
        const orbRadius = ORB_RADIUS * inverseSafeZoom
        context.beginPath()
        context.arc(orbPositionRef.current.x, orbPositionRef.current.y, orbRadius * 1.95, 0, Math.PI * 2)
        context.fillStyle = hexToRgba(currentPlayerColor, 0.22)
        context.shadowColor = hexToRgba(currentPlayerColor, 0.35)
        context.shadowBlur = ORB_SHADOW_BLUR * 1.3 * inverseSafeZoom
        context.fill()

        context.beginPath()
        context.arc(orbPositionRef.current.x, orbPositionRef.current.y, orbRadius, 0, Math.PI * 2)
        context.fillStyle = hexToRgba(currentPlayerColor, 0.98)
        context.shadowColor = hexToRgba(currentPlayerColor, 0.98)
        context.shadowBlur = ORB_SHADOW_BLUR * inverseSafeZoom
        context.fill()

        context.beginPath()
        context.arc(
          orbPositionRef.current.x,
          orbPositionRef.current.y,
          orbRadius * 0.4,
          0,
          Math.PI * 2,
        )
        context.fillStyle = 'rgba(255,255,255,0.95)'
        context.shadowBlur = 0
        context.fill()
      }

      context.restore()

      if (shouldAdvanceStep) {
        stepAdvanceRequestedRef.current = true
        stepPlayer()
      }

      if (playerIsRunning || trailsRef.current.length > 0) {
        rafId = window.requestAnimationFrame(drawFrame)
      } else {
        lastFrameTsRef.current = null
        playerStepArrivedRef.current = false
        setPlayerStepArrivedForUi(false)
      }
    }

    if (playerIsRunning || trailsRef.current.length > 0) {
      rafId = window.requestAnimationFrame(drawFrame)
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [
    currentPlayerColor,
    currentPlayerCurve,
    currentPlayerEdgeId,
    playerIsRunning,
    playerJourneyId,
    playerSpeedMs,
    playerStepIndex,
    playerTrailEnabled,
    sortedPlayerSteps.length,
    stepPlayer,
    viewId,
  ])

  const clientToWorld = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const container = canvasRef.current
    if (!container) {
      return null
    }
    const rect = container.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    return {
      x: (px - viewport.x) / viewport.zoom,
      y: (py - viewport.y) / viewport.zoom,
    }
  }

  const resolveNodeAtPoint = (point: { x: number; y: number }): NodeModel | null => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]
      if (
        point.x >= node.bounds.x &&
        point.x <= node.bounds.x + node.bounds.w &&
        point.y >= node.bounds.y &&
        point.y <= node.bounds.y + node.bounds.h
      ) {
        return node
      }
    }
    return null
  }

  const resolveClosestPortTarget = (
    point: { x: number; y: number },
  ): { nodeId: string; portId: string } | null => {
    let best: { nodeId: string; portId: string; distance: number } | null = null
    for (const node of nodes) {
      for (const port of node.ports) {
        const px = node.bounds.x + node.bounds.w * port.x
        const py = node.bounds.y + node.bounds.h * port.y
        const distance = Math.hypot(point.x - px, point.y - py)
        if (distance > EDGE_ANCHOR_RESOLVE_RADIUS) {
          continue
        }
        if (!best || distance < best.distance) {
          best = { nodeId: node.id, portId: port.id, distance }
        }
      }
    }
    if (!best) {
      return null
    }
    return { nodeId: best.nodeId, portId: best.portId }
  }

  const resolveReconnectTarget = (
    point: { x: number; y: number },
  ): { nodeId: string; portId?: string } | null => {
    const exactPort = resolveClosestPortTarget(point)
    if (exactPort) {
      return exactPort
    }
    const targetNode = resolveNodeAtPoint(point)
    if (!targetNode) {
      return null
    }
    const nearestPort = nearestPortId(targetNode, point)
    return {
      nodeId: targetNode.id,
      portId: nearestPort,
    }
  }

  const resolveResizeHandleAtPointer = (
    node: NodeModel,
    event: ReactPointerEvent<SVGRectElement>,
  ): ResizeHandle | null => {
    const world = clientToWorld(event.clientX, event.clientY)
    if (!world) {
      return null
    }
    const localX = world.x - node.bounds.x
    const localY = world.y - node.bounds.y
    return resolveResizeHandleFromLocalPoint(node, localX, localY)
  }

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (event.button !== 0) {
      return
    }
    panStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    }
    selectNode(null)
    selectEdge(null)
    setHoverCursor(null)
    setDragCursor('grabbing')
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onBackgroundPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const edgeReconnect = edgeReconnectRef.current
    if (edgeReconnect && edgeReconnect.pointerId === event.pointerId) {
      const currentWorld = clientToWorld(event.clientX, event.clientY)
      if (currentWorld) {
        if (edgeReconnect.endpoint === 'from') {
          setConnectionPreview({
            from: currentWorld,
            to: edgeReconnect.fixedPoint,
          })
        } else {
          setConnectionPreview({
            from: edgeReconnect.fixedPoint,
            to: currentWorld,
          })
        }
      }
      return
    }

    const connectionDrag = connectionDragRef.current
    if (connectionDrag && connectionDrag.pointerId === event.pointerId) {
      const currentWorld = clientToWorld(event.clientX, event.clientY)
      if (currentWorld) {
        setConnectionPreview((previous) => {
          if (!previous) {
            return previous
          }
          return {
            ...previous,
            to: currentWorld,
          }
        })
      }
      return
    }

    const current = panStateRef.current
    if (!current || current.pointerId !== event.pointerId) {
      return
    }
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    setViewport({ x: current.originX + dx, y: current.originY + dy, zoom: viewport.zoom })
  }

  const onBackgroundPointerUp = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const reconnectDrag = edgeReconnectRef.current
    if (reconnectDrag?.pointerId === event.pointerId) {
      const world = clientToWorld(event.clientX, event.clientY)
      if (world) {
        const target = resolveReconnectTarget(world)
        if (target) {
          reconnectEdgeEndpoint(
            reconnectDrag.edgeId,
            reconnectDrag.endpoint,
            target.nodeId,
            target.portId,
          )
        }
      }
      edgeReconnectRef.current = null
      setConnectionPreview(null)
      setDragCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

    if (connectionDragRef.current?.pointerId === event.pointerId) {
      connectionDragRef.current = null
      setConnectionPreview(null)
      cancelPendingConnection()
      setDragCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    }
    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null
      setDragCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    }
  }

  const onNodePointerDown = (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
    mode: 'move' | 'resize',
    resizeHandle?: ResizeHandle,
  ): void => {
    if (event.button !== 0) {
      return
    }
    event.stopPropagation()
    if (activeTool === 'connector') {
      selectNode(node.id)
      return
    }

    if (mode === 'move' && (event.shiftKey || event.metaKey || event.ctrlKey)) {
      selectNode(node.id, { additive: true })
      return
    }

    const isNodeInSelection = selectedNodeIdSet.has(node.id)
    const moveGroupNodeIds =
      mode === 'move' && isNodeInSelection && selectedNodeIds.length > 1
        ? selectedNodeIds
        : [node.id]
    const dragNodeIds = mode === 'resize' ? [node.id] : moveGroupNodeIds
    const originBoundsByNodeId = Object.fromEntries(
      dragNodeIds.map((nodeId) => [nodeId, { ...workspace.nodes[nodeId].bounds }]),
    )

    if (mode === 'resize' || !isNodeInSelection || selectedNodeIds.length <= 1) {
      selectNode(node.id)
    }

    nodeDragStateRef.current = {
      pointerId: event.pointerId,
      primaryNodeId: node.id,
      nodeIds: dragNodeIds,
      mode,
      resizeHandle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originBoundsByNodeId,
    }
    setDragCursor(
      mode === 'resize' && resizeHandle
        ? resolveResizeHandleCursor(resizeHandle)
        : 'grabbing',
    )
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onNodePointerMove = (event: ReactPointerEvent<SVGGElement>): void => {
    const drag = nodeDragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    event.stopPropagation()
    const dx = (event.clientX - drag.startClientX) / viewport.zoom
    const dy = (event.clientY - drag.startClientY) / viewport.zoom
    if (drag.mode === 'move') {
      if (drag.nodeIds.length === 1) {
        const originBounds = drag.originBoundsByNodeId[drag.primaryNodeId]
        if (!originBounds) {
          return
        }
        const candidateBounds = {
          ...originBounds,
          x: originBounds.x + dx,
          y: originBounds.y + dy,
        }
        const bounds = snapEnabled
          ? snapBounds(candidateBounds, drag.primaryNodeId, workspace.nodes, {
              gridSize: DEFAULT_GRID_SIZE,
              snapGrid: true,
              snapShapes: true,
            })
          : candidateBounds
        setNodeBounds(drag.primaryNodeId, bounds)
        return
      }

      const primaryOrigin = drag.originBoundsByNodeId[drag.primaryNodeId]
      if (!primaryOrigin) {
        return
      }
      const snappedDx = snapEnabled
        ? Math.round((primaryOrigin.x + dx) / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE -
          primaryOrigin.x
        : dx
      const snappedDy = snapEnabled
        ? Math.round((primaryOrigin.y + dy) / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE -
          primaryOrigin.y
        : dy
      setNodesBounds(
        drag.nodeIds.map((nodeId) => {
          const origin = drag.originBoundsByNodeId[nodeId]
          return {
            nodeId,
            bounds: {
              ...origin,
              x: origin.x + snappedDx,
              y: origin.y + snappedDy,
            },
          }
        }),
      )
      return
    }

    const originBounds = drag.originBoundsByNodeId[drag.primaryNodeId]
    if (!originBounds) {
      return
    }
    const handle = drag.resizeHandle ?? 'se'
    let nextX = originBounds.x
    let nextY = originBounds.y
    let nextW = originBounds.w
    let nextH = originBounds.h

    if (handle.includes('e')) {
      nextW = Math.max(MIN_NODE_SIZE, originBounds.w + dx)
    }
    if (handle.includes('s')) {
      nextH = Math.max(MIN_NODE_SIZE, originBounds.h + dy)
    }
    if (handle.includes('w')) {
      nextW = Math.max(MIN_NODE_SIZE, originBounds.w - dx)
      nextX = originBounds.x + (originBounds.w - nextW)
    }
    if (handle.includes('n')) {
      nextH = Math.max(MIN_NODE_SIZE, originBounds.h - dy)
      nextY = originBounds.y + (originBounds.h - nextH)
    }
    const candidateBounds = {
      ...originBounds,
      x: nextX,
      y: nextY,
      w: nextW,
      h: nextH,
    }
    const bounds = snapEnabled
      ? snapBounds(candidateBounds, drag.primaryNodeId, workspace.nodes, {
          gridSize: DEFAULT_GRID_SIZE,
          snapGrid: true,
          snapShapes: false,
        })
      : candidateBounds
    setNodeBounds(drag.primaryNodeId, bounds)
  }

  const onNodePointerUp = (event: ReactPointerEvent<SVGGElement>): void => {
    const drag = nodeDragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    nodeDragStateRef.current = null
    setDragCursor(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onNodeBorderPointerMove = (
    event: ReactPointerEvent<SVGRectElement>,
    node: NodeModel,
  ): void => {
    if (activeTool !== 'select') {
      return
    }
    const drag = nodeDragStateRef.current
    if (drag && drag.pointerId === event.pointerId) {
      return
    }
    const handle = resolveResizeHandleAtPointer(node, event)
    setHoverCursor(handle ? resolveResizeHandleCursor(handle) : null)
  }

  const onNodeBorderPointerLeave = (): void => {
    if (!nodeDragStateRef.current) {
      setHoverCursor(null)
    }
  }

  const onNodeBorderPointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
    node: NodeModel,
  ): void => {
    if (activeTool !== 'select') {
      return
    }
    const resizeHandle = resolveResizeHandleAtPointer(node, event)
    if (!resizeHandle) {
      return
    }
    onNodePointerDown(event, node, 'resize', resizeHandle)
  }

  const onPortPointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    node: NodeModel,
    portId: string,
  ): void => {
    if (activeTool !== 'connector' || event.button !== 0) {
      return
    }
    event.stopPropagation()
    const start = portWorldPosition(node, portId)
    beginConnection(node.id, portId)
    connectionDragRef.current = {
      pointerId: event.pointerId,
      sourceNodeId: node.id,
      sourcePortId: portId,
    }
    setConnectionPreview({
      from: start,
      to: start,
    })
    setDragCursor('crosshair')
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId)
  }

  const onPortPointerEnter = (
    event: ReactPointerEvent<SVGCircleElement>,
    node: NodeModel,
    portId: string,
  ): void => {
    if (activeTool !== 'connector') {
      return
    }
    const drag = connectionDragRef.current
    if (!drag || drag.pointerId !== event.pointerId || (event.buttons & 1) === 0) {
      return
    }
    if (drag.sourceNodeId === node.id) {
      return
    }
    event.stopPropagation()
    connectPendingTo(node.id, portId)
    connectionDragRef.current = null
    setConnectionPreview(null)
    setDragCursor(null)
  }

  const onPortPointerUp = (
    event: ReactPointerEvent<SVGCircleElement>,
    node: NodeModel,
    portId: string,
  ): void => {
    if (activeTool !== 'connector') {
      return
    }
    const drag = connectionDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    if (drag.sourceNodeId === node.id) {
      connectionDragRef.current = null
      setConnectionPreview(null)
      cancelPendingConnection()
      setDragCursor(null)
      return
    }
    event.stopPropagation()
    connectPendingTo(node.id, portId)
    connectionDragRef.current = null
    setConnectionPreview(null)
    setDragCursor(null)
  }

  const onEdgeAnchorPointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    anchor: EdgeAnchorHandle,
  ): void => {
    if (activeTool !== 'select' || event.button !== 0 || !anchor.candidates.length) {
      return
    }
    event.stopPropagation()

    const world = clientToWorld(event.clientX, event.clientY) ?? { x: anchor.x, y: anchor.y }
    const selectedCandidate = selectedEdgeId
      ? anchor.candidates.find((candidate) => candidate.edgeId === selectedEdgeId)
      : undefined
    const rankedCandidates = anchor.candidates
      .slice()
      .sort((left, right) => {
        const leftDistance = distancePointToCurve(left.curve, world)
        const rightDistance = distancePointToCurve(right.curve, world)
        if (Math.abs(leftDistance - rightDistance) > 0.01) {
          return leftDistance - rightDistance
        }
        if (left.edgeId !== right.edgeId) {
          return left.edgeId.localeCompare(right.edgeId)
        }
        return left.endpoint.localeCompare(right.endpoint)
      })

    const nextCycleIndex = edgeAnchorCycleRef.current.get(anchor.key) ?? 0
    const fallbackCandidate = rankedCandidates[nextCycleIndex % rankedCandidates.length]
    edgeAnchorCycleRef.current.set(anchor.key, (nextCycleIndex + 1) % rankedCandidates.length)
    const candidate = selectedCandidate ?? fallbackCandidate

    const edge = workspace.edges[candidate.edgeId]
    if (!edge) {
      return
    }
    const fixedEndpoint = candidate.endpoint === 'from' ? edge.to : edge.from
    const fixedNode = workspace.nodes[fixedEndpoint.nodeId]
    if (!fixedNode) {
      return
    }
    const fixedPortId =
      fixedEndpoint.portId ??
      nearestPortId(fixedNode, candidate.endpoint === 'from' ? candidate.curve.end : candidate.curve.start)
    const fixedPoint = portWorldPosition(fixedNode, fixedPortId)

    edgeReconnectRef.current = {
      pointerId: event.pointerId,
      edgeId: edge.id,
      endpoint: candidate.endpoint,
      fixedPoint,
    }
    selectEdge(edge.id)
    setConnectionPreview(
      candidate.endpoint === 'from'
        ? {
            from: world,
            to: fixedPoint,
          }
        : {
            from: fixedPoint,
            to: world,
          },
    )
    setDragCursor('grabbing')
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId)
  }

  const onEdgeAnchorPointerEnter = (anchorKey: string): void => {
    if (activeTool !== 'select') {
      return
    }
    setHoveredAnchorKey(anchorKey)
    setHoverCursor('grab')
  }

  const onEdgeAnchorPointerLeave = (): void => {
    setHoveredAnchorKey((current) => (edgeReconnectRef.current ? current : null))
    if (!edgeReconnectRef.current) {
      setHoverCursor(null)
    }
  }

  const onWheel = (event: WheelEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const container = canvasRef.current
    if (!container) {
      return
    }
    const rect = container.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const worldX = (px - viewport.x) / viewport.zoom
    const worldY = (py - viewport.y) / viewport.zoom
    const zoomFactor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY)
    const zoom = viewport.zoom * zoomFactor
    const x = px - worldX * zoom
    const y = py - worldY * zoom
    setViewport({ x, y, zoom })
  }

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const presetId = event.dataTransfer.getData('application/x-node-preset-id')
    if (!presetId) {
      return
    }
    const container = canvasRef.current
    if (!container) {
      return
    }
    const rect = container.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const rawX = (px - viewport.x) / viewport.zoom - 110
    const rawY = (py - viewport.y) / viewport.zoom - 60
    const x = snapEnabled ? Math.round(rawX / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE : rawX
    const y = snapEnabled ? Math.round(rawY / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE : rawY
    addNode(presetId, x, y)
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
  }

  const canvasCursor = dragCursor ?? hoverCursor ?? (activeTool === 'connector' ? 'crosshair' : 'grab')

  return (
    <div className="canvas-shell" ref={canvasRef} onWheel={onWheel} onDrop={onDrop} onDragOver={onDragOver}>
      <svg
        className="diagram-canvas"
        style={{ cursor: canvasCursor }}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
      >
        <defs>
          {gridEnabled ? (
            <pattern
              id="grid-pattern"
              width={DEFAULT_GRID_SIZE}
              height={DEFAULT_GRID_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${DEFAULT_GRID_SIZE} 0 L 0 0 0 ${DEFAULT_GRID_SIZE}`}
                fill="none"
                stroke="var(--sjv-grid-line)"
                strokeWidth={1}
              />
            </pattern>
          ) : null}
          <marker
            id="edge-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L8,4 L0,8 z" className="edge-arrow-head" />
          </marker>
        </defs>
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {gridEnabled ? (
            <rect
              x={-10000}
              y={-10000}
              width={20000}
              height={20000}
              fill="url(#grid-pattern)"
            />
          ) : null}
          {edgeRenderItems.map(({ edge, curve, path }) => (
            <JourneyEdge
              key={edge.id}
              edge={edge}
              curve={curve}
              path={path}
              protocolLabel={protocolLabelById[edge.protocolPresetId]}
              badge={edgeBadgeById[edge.id]}
              isSelected={edge.id === selectedEdgeId}
              isPlayerEdge={edge.id === currentPlayerEdgeId}
              isFlowAnimated={animatedEdgeIdSet.has(edge.id)}
              onSelect={() => selectEdge(edge.id)}
            />
          ))}
          {connectionPreview ? (
            <path
              d={`M ${connectionPreview.from.x} ${connectionPreview.from.y} C ${
                (connectionPreview.from.x + connectionPreview.to.x) / 2
              } ${connectionPreview.from.y}, ${
                (connectionPreview.from.x + connectionPreview.to.x) / 2
              } ${connectionPreview.to.y}, ${connectionPreview.to.x} ${connectionPreview.to.y}`}
              fill="none"
              markerEnd="url(#edge-arrow)"
              className="edge edge-preview"
            />
          ) : null}
          {activeTool === 'select'
            ? edgeAnchorHandles.map((anchor) => {
                const isSelectedAnchor = anchor.candidates.some(
                  (candidate) => candidate.edgeId === selectedEdgeId,
                )
                const isHovered = hoveredAnchorKey === anchor.key
                return (
                  <circle
                    key={anchor.key}
                    cx={anchor.x}
                    cy={anchor.y}
                    r={EDGE_ANCHOR_CAPTURE_RADIUS}
                    className={
                      isSelectedAnchor || isHovered
                        ? 'edge-anchor-handle edge-anchor-handle-active'
                        : 'edge-anchor-handle'
                    }
                    onPointerDown={(event) => onEdgeAnchorPointerDown(event, anchor)}
                    onPointerEnter={() => onEdgeAnchorPointerEnter(anchor.key)}
                    onPointerLeave={onEdgeAnchorPointerLeave}
                  />
                )
              })
            : null}

          {nodes.map((node) => {
            const isSelected = selectedNodeIdSet.has(node.id)
            const isPendingConnection = node.id === pendingConnectionFrom
            const isPlayerHighlighted = highlightedNodeIds.has(node.id)
            const nodeClassName = [
              'node',
              node.kind === 'boundary' ? 'node-boundary' : '',
              isPendingConnection ? 'node-pending' : '',
              isSelected ? 'node-selected' : '',
              node.drilldownRef ? 'node-drilldown' : '',
              isPlayerHighlighted ? 'node-player-highlight' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const nodeFillColor =
              node.kind === 'boundary' ? undefined : node.style?.fillColor
            const dbShape = resolveDbCylinderShape(node.bounds.w, node.bounds.h)
            const queueShape = resolveQueueCylinderShape(node.bounds.w, node.bounds.h)
            const connectorRole =
              currentView.kind === 'hex'
                ? resolveHexConnectorRole(node.kind)
                : null
            const connectorIconX = node.bounds.w - 34
            const connectorIconY = 12
            return (
              <g
                key={node.id}
                transform={`translate(${node.bounds.x}, ${node.bounds.y})`}
                onPointerDown={(event) => onNodePointerDown(event, node, 'move')}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onPointerLeave={() => {
                  if (!nodeDragStateRef.current) {
                    setHoverCursor(null)
                  }
                }}
                onDoubleClick={() => {
                  if (node.drilldownRef) {
                    openDrilldown(node.id)
                  }
                }}
              >
                {node.kind === 'db' ? (
                  <g>
                    <path
                      d={dbShape.shellPath}
                      className={nodeClassName}
                      style={nodeFillColor ? { fill: nodeFillColor } : undefined}
                    />
                    <path
                      d={dbShape.topFrontArcPath}
                      className="node-shape-detail"
                    />
                    <path d={dbShape.bottomBackArcPath} className="node-shape-detail" />
                  </g>
                ) : node.kind === 'queue' ? (
                  <g>
                    <path
                      d={queueShape.shellPath}
                      className={nodeClassName}
                      style={nodeFillColor ? { fill: nodeFillColor } : undefined}
                    />
                    <path d={queueShape.frontCapPath} className="node-shape-detail" />
                    <path d={queueShape.rearInnerArcPath} className="node-shape-detail" />
                  </g>
                ) : (
                  <rect
                    x={0}
                    y={0}
                    width={node.bounds.w}
                    height={node.bounds.h}
                    rx={12}
                    className={nodeClassName}
                    style={nodeFillColor ? { fill: nodeFillColor } : undefined}
                  />
                )}
                {activeTool === 'select' ? (
                  <rect
                    className="node-border-hitarea"
                    x={0}
                    y={0}
                    width={node.bounds.w}
                    height={node.bounds.h}
                    rx={12}
                    onPointerDown={(event) => onNodeBorderPointerDown(event, node)}
                    onPointerMove={(event) => onNodeBorderPointerMove(event, node)}
                    onPointerLeave={onNodeBorderPointerLeave}
                  />
                ) : null}
                {connectorRole === 'female' ? (
                  <g className="node-connector-icon node-connector-female">
                    <rect
                      x={connectorIconX + 2}
                      y={connectorIconY + 3}
                      width={16}
                      height={10}
                      rx={3}
                      className="node-connector-shell"
                    />
                    <circle
                      cx={connectorIconX + 8}
                      cy={connectorIconY + 8}
                      r={1.2}
                      className="node-connector-dot"
                    />
                    <circle
                      cx={connectorIconX + 12}
                      cy={connectorIconY + 8}
                      r={1.2}
                      className="node-connector-dot"
                    />
                    <path
                      d={`M ${connectorIconX + 10} ${connectorIconY + 13} V ${
                        connectorIconY + 16
                      }`}
                      className="node-connector-line"
                    />
                  </g>
                ) : null}
                {connectorRole === 'male' ? (
                  <g className="node-connector-icon node-connector-male">
                    <rect
                      x={connectorIconX + 4}
                      y={connectorIconY + 5}
                      width={12}
                      height={8}
                      rx={2}
                      className="node-connector-shell"
                    />
                    <path
                      d={`M ${connectorIconX + 7} ${connectorIconY + 5} V ${
                        connectorIconY + 2
                      } M ${connectorIconX + 13} ${connectorIconY + 5} V ${
                        connectorIconY + 2
                      } M ${connectorIconX + 10} ${connectorIconY + 13} V ${
                        connectorIconY + 16
                      }`}
                      className="node-connector-line"
                    />
                  </g>
                ) : null}
                <text x={16} y={34} className="node-title">
                  {iconForKey(node.tech?.iconKey)} {node.name}
                </text>
                <text x={16} y={56} className="node-subtitle">
                  {node.tech?.label ?? node.kind}
                </text>
                {node.ports.map((port) => (
                  <circle
                    key={port.id}
                    className="node-port"
                    cx={node.bounds.w * port.x}
                    cy={node.bounds.h * port.y}
                    r={3}
                    onPointerDown={(event) => onPortPointerDown(event, node, port.id)}
                    onPointerEnter={(event) => onPortPointerEnter(event, node, port.id)}
                    onPointerUp={(event) => onPortPointerUp(event, node, port.id)}
                  />
                ))}
              </g>
            )
          })}
        </g>
      </svg>
      <canvas ref={trailCanvasRef} className="trail-canvas" />
    </div>
  )
}
