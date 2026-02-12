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
import { JourneyEdge } from './JourneyEdge'
import { curveToSvgPath, cubicPointAt, type EdgeCurvePath } from './edgePresentation'
import { buildTrailPoints } from './trailMath'

type PanState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

type NodeDragState = {
  pointerId: number
  nodeId: string
  mode: 'move' | 'resize'
  startClientX: number
  startClientY: number
  originBounds: NodeModel['bounds']
}

type ConnectionDragState = {
  pointerId: number
  sourceNodeId: string
  sourcePortId: string
}

type TrailParticle = {
  id: number
  color: string
  alpha: number
  radius: number
  position: { x: number; y: number }
}

const ZOOM_SENSITIVITY = 0.0012
const STEP_NODE_GLOW_DELAY_RATIO = 0.12
const STEP_TRAVEL_COMPLETE_RATIO = 0.94
const NODE_HIT_PROGRESS_THRESHOLD = 0.98
const TRAIL_INITIAL_ALPHA = 0.6
const TRAIL_FADE_FACTOR = 0.0004
const TRAIL_PARTICLE_RADIUS = 3.6
const TRAIL_PARTICLE_SHADOW_BLUR = 15
const ORB_RADIUS = 5.4
const ORB_SHADOW_BLUR = 20
const TRAIL_MIN_SPACING = 1.4
const MAX_TRAILS = 500

const resolveCurveFromEdge = (
  edge: EdgeModel,
  nodes: Record<string, NodeModel>,
): EdgeCurvePath | null => {
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
  }
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
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const trailsRef = useRef<TrailParticle[]>([])
  const lastFrameTsRef = useRef<number | null>(null)
  const nextTrailIdRef = useRef(1)
  const stepKeyRef = useRef<string | null>(null)
  const stepStartTsRef = useRef<number | null>(null)
  const orbPositionRef = useRef<{ x: number; y: number } | null>(null)
  const lastTrailPositionRef = useRef<{ x: number; y: number } | null>(null)
  const travelProgressRef = useRef(0)
  const [connectionPreview, setConnectionPreview] = useState<{
    start: { x: number; y: number }
    current: { x: number; y: number }
  } | null>(null)
  const [travelProgressForUi, setTravelProgressForUi] = useState(0)

  const workspace = useEditorStore((state) => state.workspace)
  const viewId = useEditorStore((state) => state.currentViewId)
  const viewport = useEditorStore((state) => state.viewport)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const selectedEdgeId = useEditorStore((state) => state.selectedEdgeId)
  const activeTool = useEditorStore((state) => state.activeTool)
  const pendingConnectionFrom = useEditorStore((state) => state.pendingConnectionFrom)
  const activeJourneyId = useEditorStore((state) => state.activeJourneyId)
  const journeyFilterId = useEditorStore((state) => state.journeyFilterId)
  const playerJourneyId = useEditorStore((state) => state.playerJourneyId)
  const playerStepIndex = useEditorStore((state) => state.playerStepIndex)
  const playerSpeedMs = useEditorStore((state) => state.playerSpeedMs)
  const playerHighlightNodes = useEditorStore((state) => state.playerHighlightNodes)
  const playerIsRunning = useEditorStore((state) => state.playerIsRunning)
  const setViewport = useEditorStore((state) => state.setViewport)
  const selectNode = useEditorStore((state) => state.selectNode)
  const selectEdge = useEditorStore((state) => state.selectEdge)
  const openDrilldown = useEditorStore((state) => state.openDrilldown)
  const setNodeBounds = useEditorStore((state) => state.setNodeBounds)
  const addNode = useEditorStore((state) => state.addNode)
  const beginConnection = useEditorStore((state) => state.beginConnection)
  const connectPendingTo = useEditorStore((state) => state.connectPendingTo)
  const cancelPendingConnection = useEditorStore((state) => state.cancelPendingConnection)

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

  const highlightedNodeIds = useMemo(() => {
    if (!playerHighlightNodes || !currentPlayerEdgeId) {
      return new Set<string>()
    }
    const edge = workspace.edges[currentPlayerEdgeId]
    if (!edge) {
      return new Set<string>()
    }
    const set = new Set<string>([edge.from.nodeId])
    if (!playerIsRunning || travelProgressForUi >= NODE_HIT_PROGRESS_THRESHOLD) {
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
    travelProgressForUi,
    workspace.edges,
  ])
  const impactedNodeId = useMemo(() => {
    if (!playerIsRunning || travelProgressForUi < NODE_HIT_PROGRESS_THRESHOLD) {
      return null
    }
    if (!currentPlayerEdgeId) {
      return null
    }
    const edge = workspace.edges[currentPlayerEdgeId]
    return edge?.to.nodeId ?? null
  }, [currentPlayerEdgeId, playerIsRunning, travelProgressForUi, workspace.edges])

  useEffect(() => {
    connectionDragRef.current = null
    let resetPreviewFrame = window.requestAnimationFrame(() => {
      setConnectionPreview(null)
    })
    if (activeTool !== 'connector') {
      cancelPendingConnection()
    }
    return () => {
      window.cancelAnimationFrame(resetPreviewFrame)
      resetPreviewFrame = 0
    }
  }, [activeTool, cancelPendingConnection])

  useEffect(() => {
    trailsRef.current = []
    orbPositionRef.current = null
    lastTrailPositionRef.current = null
    stepKeyRef.current = null
    stepStartTsRef.current = null
    travelProgressRef.current = 0
    connectionDragRef.current = null
    let resetPreviewFrame = window.requestAnimationFrame(() => {
      setConnectionPreview(null)
    })
    let resetFrame = window.requestAnimationFrame(() => {
      setTravelProgressForUi(0)
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
    }
  }, [viewId])

  useEffect(() => {
    const trailCanvas = trailCanvasRef.current
    if (!trailCanvas) {
      return
    }
    const context = trailCanvas.getContext('2d')
    if (!context) {
      return
    }

    const updateUiProgress = (nextProgress: number) => {
      if (Math.abs(nextProgress - travelProgressRef.current) >= 0.02 || nextProgress === 0 || nextProgress === 1) {
        travelProgressRef.current = nextProgress
        setTravelProgressForUi(nextProgress)
      }
    }

    let rafId: number | null = null
    const drawFrame = (timestamp: number) => {
      const width = Math.max(1, Math.floor(trailCanvas.clientWidth))
      const height = Math.max(1, Math.floor(trailCanvas.clientHeight))
      if (trailCanvas.width !== width || trailCanvas.height !== height) {
        trailCanvas.width = width
        trailCanvas.height = height
      }

      const previousTs = lastFrameTsRef.current ?? timestamp
      const dt = Math.max(0, timestamp - previousTs)
      lastFrameTsRef.current = timestamp

      const stepKey = currentPlayerEdgeId
        ? `${viewId}:${playerJourneyId ?? ''}:${playerStepIndex}:${currentPlayerEdgeId}`
        : null

      if (stepKey !== stepKeyRef.current) {
        stepKeyRef.current = stepKey
        stepStartTsRef.current = timestamp
        orbPositionRef.current = null
        lastTrailPositionRef.current = null
        updateUiProgress(0)
      }

      let travelProgress = 0
      if (playerIsRunning && stepKey && currentPlayerCurve) {
        const elapsed = Math.max(0, timestamp - (stepStartTsRef.current ?? timestamp))
        const effectiveDuration = Math.max(
          120,
          playerSpeedMs * STEP_TRAVEL_COMPLETE_RATIO,
        )
        const baseProgress = Math.max(0, Math.min(1, elapsed / effectiveDuration))
        travelProgress = Math.max(
          0,
          Math.min(
            1,
            (baseProgress - STEP_NODE_GLOW_DELAY_RATIO) / (1 - STEP_NODE_GLOW_DELAY_RATIO),
          ),
        )

        if (travelProgress > 0) {
          const orbPoint = cubicPointAt(currentPlayerCurve, travelProgress)
          orbPositionRef.current = orbPoint
          const lastTrail = lastTrailPositionRef.current
          const minSpacing = TRAIL_MIN_SPACING / Math.max(viewport.zoom, 0.25)
          const trailPoints = buildTrailPoints(lastTrail, orbPoint, minSpacing)
          if (trailPoints.length > 0) {
            for (const point of trailPoints) {
              trailsRef.current.push({
                id: nextTrailIdRef.current,
                color: currentPlayerColor,
                alpha: TRAIL_INITIAL_ALPHA,
                radius: TRAIL_PARTICLE_RADIUS / Math.max(viewport.zoom, 0.25),
                position: point,
              })
              nextTrailIdRef.current += 1
            }
            lastTrailPositionRef.current = trailPoints[trailPoints.length - 1]
            if (trailsRef.current.length > MAX_TRAILS) {
              trailsRef.current = trailsRef.current.slice(-MAX_TRAILS)
            }
          }
        } else {
          orbPositionRef.current = null
          lastTrailPositionRef.current = null
        }
      } else {
        orbPositionRef.current = null
        lastTrailPositionRef.current = null
      }

      updateUiProgress(travelProgress)

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, width, height)

      context.save()
      context.globalCompositeOperation = 'screen'
      context.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.x, viewport.y)

      for (const trail of trailsRef.current) {
        context.beginPath()
        context.arc(trail.position.x, trail.position.y, trail.radius, 0, Math.PI * 2)
        context.fillStyle = hexToRgba(trail.color, trail.alpha)
        context.shadowColor = hexToRgba(trail.color, Math.min(1, trail.alpha + 0.2))
        context.shadowBlur = TRAIL_PARTICLE_SHADOW_BLUR / Math.max(viewport.zoom, 0.25)
        context.fill()
        trail.alpha -= dt * TRAIL_FADE_FACTOR
      }
      trailsRef.current = trailsRef.current.filter((trail) => trail.alpha > 0)

      if (playerIsRunning && orbPositionRef.current) {
        const orbRadius = ORB_RADIUS / Math.max(viewport.zoom, 0.25)
        context.beginPath()
        context.arc(orbPositionRef.current.x, orbPositionRef.current.y, orbRadius, 0, Math.PI * 2)
        context.fillStyle = hexToRgba(currentPlayerColor, 0.95)
        context.shadowColor = hexToRgba(currentPlayerColor, 0.95)
        context.shadowBlur = ORB_SHADOW_BLUR / Math.max(viewport.zoom, 0.25)
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

      if (playerIsRunning || trailsRef.current.length > 0) {
        rafId = window.requestAnimationFrame(drawFrame)
      } else {
        lastFrameTsRef.current = null
        if (travelProgressRef.current !== 0) {
          travelProgressRef.current = 0
          setTravelProgressForUi(0)
        }
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
    viewId,
    viewport.x,
    viewport.y,
    viewport.zoom,
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
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onBackgroundPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const connectionDrag = connectionDragRef.current
    if (connectionDrag && connectionDrag.pointerId === event.pointerId) {
      const currentWorld = clientToWorld(event.clientX, event.clientY)
      if (currentWorld) {
        setConnectionPreview((previous) =>
          previous
            ? {
                ...previous,
                current: currentWorld,
              }
            : previous,
        )
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
    if (connectionDragRef.current?.pointerId === event.pointerId) {
      connectionDragRef.current = null
      setConnectionPreview(null)
      cancelPendingConnection()
    }
    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onNodePointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    node: NodeModel,
    mode: 'move' | 'resize',
  ): void => {
    if (event.button !== 0) {
      return
    }
    event.stopPropagation()
    if (activeTool === 'connector') {
      selectNode(node.id)
      return
    }
    selectNode(node.id)
    nodeDragStateRef.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originBounds: { ...node.bounds },
    }
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
      const candidateBounds = {
        ...drag.originBounds,
        x: drag.originBounds.x + dx,
        y: drag.originBounds.y + dy,
      }
      const bounds = snapEnabled
        ? snapBounds(candidateBounds, drag.nodeId, workspace.nodes, {
            gridSize: DEFAULT_GRID_SIZE,
            snapGrid: true,
            snapShapes: true,
          })
        : candidateBounds
      setNodeBounds(drag.nodeId, bounds)
      return
    }
    const minSize = 80
    const candidateBounds = {
      ...drag.originBounds,
      w: Math.max(minSize, drag.originBounds.w + dx),
      h: Math.max(minSize, drag.originBounds.h + dy),
    }
    const bounds = snapEnabled
      ? snapBounds(candidateBounds, drag.nodeId, workspace.nodes, {
          gridSize: DEFAULT_GRID_SIZE,
          snapGrid: true,
          snapShapes: false,
        })
      : candidateBounds
    setNodeBounds(drag.nodeId, bounds)
  }

  const onNodePointerUp = (event: ReactPointerEvent<SVGGElement>): void => {
    const drag = nodeDragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    nodeDragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
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
      start,
      current: start,
    })
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
      return
    }
    event.stopPropagation()
    connectPendingTo(node.id, portId)
    connectionDragRef.current = null
    setConnectionPreview(null)
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

  return (
    <div className="canvas-shell" ref={canvasRef} onWheel={onWheel} onDrop={onDrop} onDragOver={onDragOver}>
      <svg
        className="diagram-canvas"
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
                stroke="#dbe4ff"
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
            <path d="M0,0 L8,4 L0,8 z" fill="#475569" />
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
          {visibleEdges.map((edge) => {
            const curve = resolveCurveFromEdge(edge, workspace.nodes)
            if (!curve) {
              return null
            }
            const path = curveToSvgPath(curve)
            return (
              <JourneyEdge
                key={edge.id}
                edge={edge}
                curve={curve}
                path={path}
                protocolLabel={protocolLabelById[edge.protocolPresetId]}
                badge={edgeBadgeById[edge.id]}
                isSelected={edge.id === selectedEdgeId}
                isPlayerEdge={edge.id === currentPlayerEdgeId}
                isFlowing={playerIsRunning && edge.id === currentPlayerEdgeId}
                onSelect={() => selectEdge(edge.id)}
              />
            )
          })}
          {connectionPreview ? (
            <path
              d={`M ${connectionPreview.start.x} ${connectionPreview.start.y} C ${
                (connectionPreview.start.x + connectionPreview.current.x) / 2
              } ${connectionPreview.start.y}, ${
                (connectionPreview.start.x + connectionPreview.current.x) / 2
              } ${connectionPreview.current.y}, ${connectionPreview.current.x} ${connectionPreview.current.y}`}
              fill="none"
              markerEnd="url(#edge-arrow)"
              className="edge edge-preview"
            />
          ) : null}

          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId
            const isPendingConnection = node.id === pendingConnectionFrom
            const isPlayerHighlighted = highlightedNodeIds.has(node.id)
            const isPlayerImpacted = node.id === impactedNodeId
            const nodeClassName = [
              'node',
              node.kind === 'boundary' ? 'node-boundary' : '',
              isPendingConnection ? 'node-pending' : '',
              isSelected ? 'node-selected' : '',
              node.drilldownRef ? 'node-drilldown' : '',
              isPlayerHighlighted ? 'node-player-highlight' : '',
              isPlayerImpacted ? 'node-player-impact' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const nodeFillColor =
              node.kind === 'boundary' ? undefined : node.style?.fillColor
            const dbCapHeight = Math.max(
              10,
              Math.min(20, node.bounds.h * 0.18),
            )
            const dbBottomY = node.bounds.h - dbCapHeight
            const queueRadius = Math.max(
              14,
              Math.min(node.bounds.h / 2, 34),
            )
            return (
              <g
                key={node.id}
                transform={`translate(${node.bounds.x}, ${node.bounds.y})`}
                className={isPlayerImpacted ? 'node-group-impact' : ''}
                onPointerDown={(event) => onNodePointerDown(event, node, 'move')}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onDoubleClick={() => {
                  if (node.drilldownRef) {
                    openDrilldown(node.id)
                  }
                }}
              >
                {node.kind === 'db' ? (
                  <g>
                    <path
                      d={`M 0 ${dbCapHeight} C 0 ${
                        dbCapHeight * 0.45
                      }, ${node.bounds.w} ${dbCapHeight * 0.45}, ${
                        node.bounds.w
                      } ${dbCapHeight} L ${node.bounds.w} ${dbBottomY} C ${
                        node.bounds.w
                      } ${dbBottomY + dbCapHeight * 0.55}, 0 ${
                        dbBottomY + dbCapHeight * 0.55
                      }, 0 ${dbBottomY} Z`}
                      className={nodeClassName}
                      style={nodeFillColor ? { fill: nodeFillColor } : undefined}
                    />
                    <ellipse
                      cx={node.bounds.w / 2}
                      cy={dbCapHeight}
                      rx={node.bounds.w / 2}
                      ry={dbCapHeight}
                      className="node-shape-detail"
                    />
                    <path
                      d={`M 0 ${dbBottomY} C 0 ${
                        dbBottomY + dbCapHeight * 0.55
                      }, ${node.bounds.w} ${
                        dbBottomY + dbCapHeight * 0.55
                      }, ${node.bounds.w} ${dbBottomY}`}
                      className="node-shape-detail"
                    />
                  </g>
                ) : node.kind === 'queue' ? (
                  <g>
                    <rect
                      x={0}
                      y={0}
                      width={node.bounds.w}
                      height={node.bounds.h}
                      rx={queueRadius}
                      className={nodeClassName}
                      style={nodeFillColor ? { fill: nodeFillColor } : undefined}
                    />
                    <path
                      d={`M ${queueRadius * 0.9} ${node.bounds.h * 0.34} H ${
                        node.bounds.w - queueRadius * 0.9
                      }`}
                      className="node-shape-detail"
                    />
                    <path
                      d={`M ${queueRadius * 0.9} ${node.bounds.h * 0.66} H ${
                        node.bounds.w - queueRadius * 0.9
                      }`}
                      className="node-shape-detail"
                    />
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
                    r={4}
                    onPointerDown={(event) => onPortPointerDown(event, node, port.id)}
                    onPointerEnter={(event) => onPortPointerEnter(event, node, port.id)}
                    onPointerUp={(event) => onPortPointerUp(event, node, port.id)}
                  />
                ))}
                {isSelected && activeTool === 'select' ? (
                  <g
                    transform={`translate(${node.bounds.w - 14}, ${node.bounds.h - 14})`}
                    onPointerDown={(event) => onNodePointerDown(event, node, 'resize')}
                    onPointerMove={onNodePointerMove}
                    onPointerUp={onNodePointerUp}
                  >
                    <rect className="resize-handle" x={0} y={0} width={14} height={14} rx={3} />
                  </g>
                ) : null}
              </g>
            )
          })}
        </g>
      </svg>
      <canvas ref={trailCanvasRef} className="trail-canvas" />
    </div>
  )
}
