/**
 * Purpose: Provide React canvas rendering components for nodes, edges, labels, and interactive diagram visuals.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  DragEvent,
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent,
} from 'react'
import {
  DEFAULT_GRID_SIZE,
  type AlignmentGuide,
  nearestPortId,
  nodeCenter,
  portWorldPosition,
  snapBounds,
  snapBoundsWithGuides,
} from '../../engine/geometry'
import { resolveEdgeCurve, type ResolvedEdgeCurve } from '../../engine/edgeCurve'
import type { BasicShapeKind, EdgeModel, NodeBounds, NodeModel } from '../../model/types'
import { resolveJourneyFocusScope } from '../../journeys/focus'
import {
  type JourneyPlaybackTickStep,
  resolveJourneyPlaybackTick,
  resolveJourneyPlaybackTicks,
  resolveJourneyPrimaryTickStep,
} from '../../journeys/playbackPlan'
import { deriveThreadTimelineColor } from '../../journeys/timelineRows'
import { protocolPresets } from '../../presets/catalog'
import { NODE_PRESET_DRAG_MIME_TYPE } from '../../presets/presetDragData'
import { TECH_ICON_DRAG_MIME_TYPE } from '../../icons/techIconCatalog'
import { useEditorStore } from '../../store/useEditorStore'
import {
  resolveEdgeJourneyBadge,
  type EdgeJourneyBadge,
  type EdgeJourneyMarker,
} from '../../diagram/edges/edgeJourneyBadge'
import { JourneyEdge } from './JourneyEdge'
import { DiagramNode, type DiagramNodeTechIconResizeHandle } from './DiagramNode'
import { Text } from '../text/Text'
import {
  estimateCanvasTextWidth,
  resolveNodeLabelLayout,
  type NodeLabelLayout,
} from '../../diagram/nodes/nodeLabelLayout'
import {
  clampNodeTechIconPlacement,
  resolveDefaultNodeTechIconPlacement,
  resolveResizedNodeTechIconPlacement,
  type NodeTechIconDefaultShapeKind,
  type NodeTechIconPlacement,
} from '../../diagram/nodes/nodeTechIconLayout'
import {
  resolveDiamondShape,
  resolveTriangleShape,
} from '../../diagram/nodes/nodeShapePaths'
import {
  curveToSvgPath,
  cubicPointAt,
  cubicTangentAt,
  resolveEdgeLabelPlacement,
  type EdgeCurvePath,
} from '../../diagram/edges/edgePresentation'
import {
  resolveArrivalAdvance,
  resolveTravelProgress,
  STEP_ARRIVAL_HOLD_MS,
} from '../../diagram/player/playerStepTimeline'
import {
  resolveNextEdgeLabelRotationAngle,
  resolveNextGlobalEdgeLabelRotationAngle,
} from '../../diagram/edges/edgeLabelWheel'
import {
  buildTrailPoints,
  compactPositiveAlphaInPlace,
  trimArrayStartInPlace,
} from '../../diagram/player/trailMath'
import {
  resolvePinchGestureMetrics,
  resolveViewportAfterPinch,
} from '../../diagram/canvas/pinchZoom'
import { sanitizeInlineTextEditValue } from '../../diagram/canvas/inlineTextEditing'
import {
  resolveMarqueeSelectionRect,
  resolveNodeIdsIntersectingMarquee,
} from '../../diagram/canvas/marqueeSelection'
import {
  hasDraggedFreeformShape,
  isFreeformShapeTool,
  resolveFreeformShapeBounds,
} from '../../diagram/canvas/freeformShapeDrawing'
import { isExperimentalShapeKind } from '../../model/experimentalShapes'

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

type EdgeLabelDragState = {
  pointerId: number
  edgeId: string
}

type NodeTechIconInteractionState = {
  pointerId: number
  nodeId: string
  mode: 'press' | 'move' | 'resize'
  resizeHandle?: DiagramNodeTechIconResizeHandle
  startClientX: number
  startClientY: number
  originPlacement: NodeTechIconPlacement
  holdTimerId?: number
}

type PinchGestureState = {
  startDistance: number
  startCenter: { x: number; y: number }
  startViewport: { x: number; y: number; zoom: number }
}

type MarqueeSelectionState = {
  pointerId: number
  additive: boolean
  startWorld: { x: number; y: number }
}

type FreeformShapeDrawingState = {
  pointerId: number
  shapeKind: BasicShapeKind
  startWorld: { x: number; y: number }
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

type PlayerLaneVisual = {
  laneId: string
  laneKind: 'main' | 'thread'
  threadId?: string
  edgeId: string
  color: string
  curve: EdgeCurvePath
  highlightNodes?: string[]
  shape: PlayerMarkerShape
}

type ConnectionTarget = {
  nodeId: string
  portId: string
}

type InlineTextEditMode = 'edge-label' | 'node-name' | 'node-tech'

type InlineTextEditState = {
  mode: InlineTextEditMode
  targetId: string
  value: string
  multiline?: boolean
  worldX: number
  worldY: number
  textAnchor: 'start' | 'middle' | 'end'
  width: number
  fontSize: number
  textColor?: string
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
const EDGE_ANCHOR_CAPTURE_RADIUS = 21
const EDGE_ANCHOR_RESOLVE_RADIUS = 20
const CONNECTION_TARGET_HOVER_RADIUS = 30
const PLAYER_TRACK_BASE_ALPHA = 0.18
const PLAYER_TRACK_PROGRESS_ALPHA = 0.88
const TRAIL_CANVAS_MAX_PIXEL_RATIO = 1.5
const TRAIL_MIN_VISIBLE_ALPHA = 0.015
const FINAL_STEP_ARRIVAL_HOLD_MS = 220
const MIN_EDGE_LABEL_FONT_SIZE = 9
const MAX_EDGE_LABEL_FONT_SIZE = 28
const DEFAULT_EDGE_LABEL_FONT_SIZE = 11
const NODE_TECH_ICON_HOLD_DELAY_MS = 360
const NODE_TECH_ICON_PRESS_MOVE_CANCEL_PX = 4

interface DiagramCanvasProps {
  presentationMode?: boolean
  forceGridHidden?: boolean
  exportFocusJourneyId?: string | null
  nodeDepthEffectsEnabled?: boolean
  draggedEdgeId?: string | null
  onEdgePointerStart?: (
    edgeId: string,
    event: ReactPointerEvent<SVGGElement>,
  ) => void
}

const resolveNearestCurveProgress = (
  curve: EdgeCurvePath,
  point: { x: number; y: number },
  segments = 80,
): number => {
  const safeSegments = Math.max(20, segments)
  let bestProgress = 0
  let minDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index <= safeSegments; index += 1) {
    const progress = index / safeSegments
    const curvePoint = cubicPointAt(curve, progress)
    const distance = Math.hypot(curvePoint.x - point.x, curvePoint.y - point.y)
    if (distance < minDistance) {
      minDistance = distance
      bestProgress = progress
    }
  }
  return bestProgress
}

const resolveLabelSideForPointer = (
  curve: EdgeCurvePath,
  progress: number,
  pointer: { x: number; y: number },
): 'left' | 'right' => {
  const anchor = cubicPointAt(curve, progress)
  const tangent = cubicTangentAt(curve, progress)
  const isVertical = Math.abs(tangent.y) > Math.abs(tangent.x) * 1.18
  if (isVertical) {
    return pointer.x <= anchor.x ? 'left' : 'right'
  }
  return pointer.y <= anchor.y ? 'left' : 'right'
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

const isEditableKeyboardTarget = (target: EventTarget | null): boolean => {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }
  return target instanceof HTMLElement && target.isContentEditable
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

type PlayerMarkerShape = 'orb' | 'square' | 'triangle'

const resolvePlayerMarkerShape = (
  laneKind: JourneyPlaybackTickStep['laneKind'],
  threadOrder?: number,
): PlayerMarkerShape => {
  if (laneKind === 'main') {
    return 'orb'
  }
  if ((threadOrder ?? 0) <= 0) {
    return 'square'
  }
  return 'triangle'
}

const drawPlayerMarker = (
  context: CanvasRenderingContext2D,
  position: { x: number; y: number },
  color: string,
  radius: number,
  inverseZoom: number,
  shape: PlayerMarkerShape,
) => {
  const drawShapePath = (scale = 1) => {
    const r = radius * scale
    if (shape === 'orb') {
      context.beginPath()
      context.arc(position.x, position.y, r, 0, Math.PI * 2)
      return
    }
    if (shape === 'square') {
      const half = r * 0.95
      const corner = Math.max(1.2 * inverseZoom, half * 0.24)
      context.beginPath()
      context.moveTo(position.x - half + corner, position.y - half)
      context.lineTo(position.x + half - corner, position.y - half)
      context.quadraticCurveTo(position.x + half, position.y - half, position.x + half, position.y - half + corner)
      context.lineTo(position.x + half, position.y + half - corner)
      context.quadraticCurveTo(position.x + half, position.y + half, position.x + half - corner, position.y + half)
      context.lineTo(position.x - half + corner, position.y + half)
      context.quadraticCurveTo(position.x - half, position.y + half, position.x - half, position.y + half - corner)
      context.lineTo(position.x - half, position.y - half + corner)
      context.quadraticCurveTo(position.x - half, position.y - half, position.x - half + corner, position.y - half)
      context.closePath()
      return
    }
    const top = { x: position.x, y: position.y - r * 1.16 }
    const right = { x: position.x + r * 1.08, y: position.y + r * 0.9 }
    const left = { x: position.x - r * 1.08, y: position.y + r * 0.9 }
    context.beginPath()
    context.moveTo(top.x, top.y)
    context.lineTo(right.x, right.y)
    context.lineTo(left.x, left.y)
    context.closePath()
  }

  drawShapePath(1.95)
  context.fillStyle = hexToRgba(color, 0.22)
  context.shadowColor = hexToRgba(color, 0.35)
  context.shadowBlur = ORB_SHADOW_BLUR * 1.3 * inverseZoom
  context.fill()

  drawShapePath(1)
  context.fillStyle = hexToRgba(color, 0.98)
  context.shadowColor = hexToRgba(color, 0.98)
  context.shadowBlur = ORB_SHADOW_BLUR * inverseZoom
  context.fill()

  context.beginPath()
  context.arc(position.x, position.y, radius * 0.34, 0, Math.PI * 2)
  context.fillStyle = 'rgba(255,255,255,0.95)'
  context.shadowBlur = 0
  context.fill()
}

export const DiagramCanvas = ({
  presentationMode = false,
  forceGridHidden = false,
  exportFocusJourneyId = null,
  nodeDepthEffectsEnabled = true,
  draggedEdgeId = null,
  onEdgePointerStart,
}: DiagramCanvasProps = {}) => {
  const panStateRef = useRef<PanState | null>(null)
  const nodeDragStateRef = useRef<NodeDragState | null>(null)
  const connectionDragRef = useRef<ConnectionDragState | null>(null)
  const edgeReconnectRef = useRef<EdgeReconnectState | null>(null)
  const edgeLabelDragRef = useRef<EdgeLabelDragState | null>(null)
  const nodeTechIconInteractionRef = useRef<NodeTechIconInteractionState | null>(null)
  const edgeAnchorCycleRef = useRef(new Map<string, number>())
  const pinchGestureRef = useRef<PinchGestureState | null>(null)
  const marqueeSelectionRef = useRef<MarqueeSelectionState | null>(null)
  const freeformShapeDrawingRef = useRef<FreeformShapeDrawingState | null>(null)
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
  const playerMarkerPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const lastTrailPositionByLaneRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const edgeLabelZoomRef = useRef<{ edgeId: string; pointerId: number } | null>(null)
  const inlineTextInputRef = useRef<HTMLInputElement | null>(null)
  const inlineTextTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [connectionPreview, setConnectionPreview] = useState<DragPreviewState>(null)
  const [hoverCursor, setHoverCursor] = useState<string | null>(null)
  const [dragCursor, setDragCursor] = useState<string | null>(null)
  const [isCtrlConnectorActive, setIsCtrlConnectorActive] = useState(false)
  const [hoveredConnectionTarget, setHoveredConnectionTarget] = useState<ConnectionTarget | null>(null)
  const [hoveredAnchorKey, setHoveredAnchorKey] = useState<string | null>(null)
  const [hoveredPortKey, setHoveredPortKey] = useState<string | null>(null)
  const [playerStepArrivedForUi, setPlayerStepArrivedForUi] = useState(false)
  const [inlineTextEdit, setInlineTextEdit] = useState<InlineTextEditState | null>(null)
  const [activeNodeIconEditId, setActiveNodeIconEditId] = useState<string | null>(null)
  const inlineTextEditFocusKey = inlineTextEdit
    ? `${inlineTextEdit.mode}:${inlineTextEdit.targetId}:${inlineTextEdit.multiline ? 'multi' : 'single'}`
    : null
  const inlineTextEditFocusIsMultiline = inlineTextEdit?.multiline ?? false
  const [marqueeSelectionRect, setMarqueeSelectionRect] = useState<NodeBounds | null>(null)
  const [freeformShapePreview, setFreeformShapePreview] = useState<{
    shapeKind: BasicShapeKind
    bounds: NodeBounds
  } | null>(null)
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([])

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
  const selectNodes = useEditorStore((state) => state.selectNodes)
  const selectEdge = useEditorStore((state) => state.selectEdge)
  const openDrilldown = useEditorStore((state) => state.openDrilldown)
  const createDrilldownForNode = useEditorStore((state) => state.createDrilldownForNode)
  const setNodeBounds = useEditorStore((state) => state.setNodeBounds)
  const setNodesBounds = useEditorStore((state) => state.setNodesBounds)
  const addAttachedNote = useEditorStore((state) => state.addAttachedNote)
  const attachNoteToNode = useEditorStore((state) => state.attachNoteToNode)
  const setNodeName = useEditorStore((state) => state.setNodeName)
  const setNodeTech = useEditorStore((state) => state.setNodeTech)
  const setNodeTechIcon = useEditorStore((state) => state.setNodeTechIcon)
  const setNodeTechIconPlacement = useEditorStore((state) => state.setNodeTechIconPlacement)
  const removeNodeTechIcon = useEditorStore((state) => state.removeNodeTechIcon)
  const addNode = useEditorStore((state) => state.addNode)
  const addBasicShape = useEditorStore((state) => state.addBasicShape)
  const beginConnection = useEditorStore((state) => state.beginConnection)
  const connectPendingTo = useEditorStore((state) => state.connectPendingTo)
  const cancelPendingConnection = useEditorStore((state) => state.cancelPendingConnection)
  const reconnectEdgeEndpoint = useEditorStore((state) => state.reconnectEdgeEndpoint)
  const setEdgeLabel = useEditorStore((state) => state.setEdgeLabel)
  const setEdgeLabelFontSize = useEditorStore((state) => state.setEdgeLabelFontSize)
  const setEdgeLabelPosition = useEditorStore((state) => state.setEdgeLabelPosition)
  const setEdgeLabelSide = useEditorStore((state) => state.setEdgeLabelSide)
  const setEdgeLabelAngle = useEditorStore((state) => state.setEdgeLabelAngle)
  const isConnectorMode = activeTool === 'connector' || isCtrlConnectorActive
  const activeShapeTool = isFreeformShapeTool(activeTool) ? activeTool : null

  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  useEffect(() => {
    const syncCtrlConnectorMode = (event: KeyboardEvent) => {
      const enableConnector = event.ctrlKey && !event.altKey && !event.metaKey
      setIsCtrlConnectorActive(enableConnector)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (presentationMode) {
        return
      }
      syncCtrlConnectorMode(event)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      syncCtrlConnectorMode(event)
    }

    const onWindowBlur = () => {
      setIsCtrlConnectorActive(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [presentationMode])

  const currentView = workspace.views[viewId]
  const gridEnabled = workspace.settings.grid
  const showGrid = gridEnabled && !forceGridHidden && !presentationMode
  const snapEnabled = workspace.settings.snap
  const journeyFocusSettings = workspace.settings.journeyFocus
  const effectiveJourneyFilterId = exportFocusJourneyId ?? journeyFilterId
  const effectiveOffscopeRenderMode =
    effectiveJourneyFilterId === null
      ? 'show'
      : exportFocusJourneyId
        ? 'hide'
        : journeyFocusSettings.offscopeRenderMode

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
  const journeyFocusScope = useMemo(
    () => resolveJourneyFocusScope(workspace, viewId, effectiveJourneyFilterId),
    [effectiveJourneyFilterId, viewId, workspace],
  )
  const focusedEdgeIdSet = journeyFocusScope?.edgeIds ?? null
  const focusedNodeIdSet = journeyFocusScope?.nodeIds ?? null

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
        journeyFilterId: effectiveJourneyFilterId,
        activeJourneyId,
        playerJourneyId,
      })
      if (badge) {
        badges[edge.id] = badge
      }
    }
    return badges
  }, [activeJourneyId, edgeJourneyMarkers, edges, effectiveJourneyFilterId, playerJourneyId])
  const protocolLabelById = useMemo(
    () =>
      Object.fromEntries(
        protocolPresets.map((preset) => [preset.id, preset.label]),
      ) as Record<string, string>,
    [],
  )

  const visibleEdges = useMemo(() => {
    if (!focusedEdgeIdSet || effectiveOffscopeRenderMode !== 'hide') {
      return edges
    }
    return edges.filter((edge) => focusedEdgeIdSet.has(edge.id))
  }, [edges, effectiveOffscopeRenderMode, focusedEdgeIdSet])
  const visibleNodes = useMemo(() => {
    if (!focusedNodeIdSet || effectiveOffscopeRenderMode !== 'hide') {
      return nodes
    }
    return nodes.filter((node) => focusedNodeIdSet.has(node.id))
  }, [effectiveOffscopeRenderMode, focusedNodeIdSet, nodes])
  const noteLinkItems = useMemo(
    () =>
      visibleNodes
        .filter((node) => node.kind === 'note' && !!node.noteTargetNodeId)
        .map((noteNode) => {
          const targetNode = noteNode.noteTargetNodeId
            ? workspace.nodes[noteNode.noteTargetNodeId]
            : undefined
          if (!targetNode || !visibleNodes.some((node) => node.id === targetNode.id)) {
            return null
          }
          return {
            key: `note-link-${noteNode.id}-${targetNode.id}`,
            from: nodeCenter(noteNode),
            to: nodeCenter(targetNode),
          }
        })
        .filter((item): item is { key: string; from: { x: number; y: number }; to: { x: number; y: number } } => !!item),
    [visibleNodes, workspace.nodes],
  )
  const selectedNodeIdSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds])
  const clearNodeTechIconInteraction = useCallback((): void => {
    const interaction = nodeTechIconInteractionRef.current
    if (interaction?.holdTimerId) {
      window.clearTimeout(interaction.holdTimerId)
    }
    nodeTechIconInteractionRef.current = null
  }, [])
  const resolveDefaultTechIconPlacementForNode = useCallback((node: NodeModel): NodeTechIconPlacement => {
    const shouldRenderHexagon =
      node.kind === 'gateway' ||
      node.kind === 'security' ||
      node.kind === 'load-balancer'
    const iconShapeKind: NodeTechIconDefaultShapeKind = shouldRenderHexagon
      ? 'hexagon'
      : node.kind === 'queue'
        ? 'queue-cylinder'
        : node.kind === 'db'
          ? 'db-cylinder'
          : 'rectangle'
    const labelLayout = resolveNodeLabelLayout(node, shouldRenderHexagon)
    return resolveDefaultNodeTechIconPlacement(
      node.bounds,
      labelLayout,
      node.tech?.label ?? node.kind,
      { shapeKind: iconShapeKind, title: node.name },
    )
  }, [])
  const resolvedActiveNodeIconEditId =
    activeNodeIconEditId && workspace.nodes[activeNodeIconEditId]?.uiIcon
      ? activeNodeIconEditId
      : null

  const edgeRenderItems = useMemo(
    () =>
      visibleEdges
        .map((edge): EdgeRenderItem | null => {
          const curve = resolveEdgeCurve(edge, workspace.nodes)
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
  const edgeCurveById = useMemo(
    () => new Map(edgeRenderItems.map((item) => [item.edge.id, item.curve])),
    [edgeRenderItems],
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
  const playerPlaybackTicks = useMemo(
    () => resolveJourneyPlaybackTicks(playerJourney),
    [playerJourney],
  )
  const currentPlayerTick = useMemo(
    () => resolveJourneyPlaybackTick(playerJourney, playerStepIndex),
    [playerJourney, playerStepIndex],
  )
  const currentPlayerTickPrimaryStep = resolveJourneyPrimaryTickStep(currentPlayerTick)
  const currentPlayerEdgeId = currentPlayerTickPrimaryStep?.edgeId ?? null
  const threadOrderById = useMemo(() => {
    const order = new Map<string, number>()
    let nextOrder = 0
    for (const tick of playerPlaybackTicks) {
      for (const tickStep of tick.steps) {
        if (tickStep.laneKind !== 'thread' || !tickStep.threadId || order.has(tickStep.threadId)) {
          continue
        }
        order.set(tickStep.threadId, nextOrder)
        nextOrder += 1
      }
    }
    return order
  }, [playerPlaybackTicks])
  const currentPlayerLaneVisuals = useMemo(() => {
    const baseColor = playerJourney?.colorKey ?? '#f59e0b'
    const lanes: PlayerLaneVisual[] = []
    for (const tickStep of currentPlayerTick?.steps ?? []) {
      const edge = workspace.edges[tickStep.edgeId]
      if (!edge) {
        continue
      }
      const curve = resolveEdgeCurve(edge, workspace.nodes)
      if (!curve) {
        continue
      }
      const color =
        tickStep.laneKind === 'thread' && tickStep.threadId
          ? deriveThreadTimelineColor(baseColor, threadOrderById.get(tickStep.threadId) ?? 0)
          : baseColor
      const threadOrder =
        tickStep.laneKind === 'thread' && tickStep.threadId
          ? (threadOrderById.get(tickStep.threadId) ?? 0)
          : undefined
      lanes.push({
        laneId: tickStep.laneId,
        laneKind: tickStep.laneKind,
        threadId: tickStep.threadId,
        edgeId: tickStep.edgeId,
        color,
        curve,
        highlightNodes: tickStep.highlightNodes,
        shape: resolvePlayerMarkerShape(tickStep.laneKind, threadOrder),
      })
    }
    return lanes
  }, [currentPlayerTick?.steps, playerJourney?.colorKey, threadOrderById, workspace.edges, workspace.nodes])
  const animatedEdgeIdSet = useMemo(() => {
    const ids = new Set<string>()
    if (selectedEdgeId) {
      ids.add(selectedEdgeId)
    }
    for (const step of currentPlayerTick?.steps ?? []) {
      ids.add(step.edgeId)
    }
    const contextJourneyId = effectiveJourneyFilterId ?? activeJourneyId
    if (contextJourneyId) {
      const journey = workspace.journeys[contextJourneyId]
      for (const step of journey?.steps ?? []) {
        ids.add(step.edgeId)
        for (const thread of step.threads ?? []) {
          for (const threadStep of thread.steps ?? []) {
            ids.add(threadStep.edgeId)
          }
        }
      }
    }
    return ids
  }, [activeJourneyId, currentPlayerTick?.steps, effectiveJourneyFilterId, selectedEdgeId, workspace.journeys])

  const highlightedNodeIds = useMemo(() => {
    if (!playerHighlightNodes || !(currentPlayerTick?.steps.length ?? 0)) {
      return new Set<string>()
    }
    const set = new Set<string>()
    for (const tickStep of currentPlayerTick?.steps ?? []) {
      const edge = workspace.edges[tickStep.edgeId]
      if (!edge) {
        continue
      }
      set.add(edge.from.nodeId)
      if (!playerIsRunning || playerStepArrivedForUi) {
        set.add(edge.to.nodeId)
      }
      for (const nodeId of tickStep.highlightNodes ?? []) {
        set.add(nodeId)
      }
    }
    return set
  }, [
    currentPlayerTick?.steps,
    playerHighlightNodes,
    playerIsRunning,
    playerStepArrivedForUi,
    workspace.edges,
  ])

  useEffect(() => {
    connectionDragRef.current = null
    edgeReconnectRef.current = null
    edgeLabelDragRef.current = null
    edgeLabelZoomRef.current = null
    clearNodeTechIconInteraction()
    let resetPreviewFrame = window.requestAnimationFrame(() => {
      setConnectionPreview(null)
      setHoveredConnectionTarget(null)
    })
    let resetCursorFrame = window.requestAnimationFrame(() => {
      setDragCursor(null)
    })
    if (!isConnectorMode) {
      cancelPendingConnection()
    }
    return () => {
      window.cancelAnimationFrame(resetPreviewFrame)
      resetPreviewFrame = 0
      window.cancelAnimationFrame(resetCursorFrame)
      resetCursorFrame = 0
    }
  }, [cancelPendingConnection, clearNodeTechIconInteraction, isConnectorMode])

  useEffect(() => {
    trailsRef.current = []
    playerMarkerPositionsRef.current.clear()
    lastTrailPositionByLaneRef.current.clear()
    stepKeyRef.current = null
    stepStartTsRef.current = null
    stepArrivalStartTsRef.current = null
    playerStepArrivedRef.current = false
    stepAdvanceRequestedRef.current = false
    connectionDragRef.current = null
    edgeReconnectRef.current = null
    edgeLabelDragRef.current = null
    edgeLabelZoomRef.current = null
    clearNodeTechIconInteraction()
    let resetPreviewFrame = window.requestAnimationFrame(() => {
      setConnectionPreview(null)
    })
    let resetFrame = window.requestAnimationFrame(() => {
      setPlayerStepArrivedForUi(false)
    })
    let resetCursorFrame = window.requestAnimationFrame(() => {
      setHoverCursor(null)
      setDragCursor(null)
      setHoveredConnectionTarget(null)
      setHoveredAnchorKey(null)
      setActiveNodeIconEditId(null)
      setInlineTextEdit(null)
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
  }, [clearNodeTechIconInteraction, viewId])

  useEffect(() => {
    if (!inlineTextEditFocusKey) {
      return
    }
    const frameId = window.requestAnimationFrame(() => {
      const editorElement = inlineTextEditFocusIsMultiline
        ? inlineTextTextareaRef.current
        : inlineTextInputRef.current
      editorElement?.focus()
      editorElement?.select()
    })
    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [inlineTextEditFocusIsMultiline, inlineTextEditFocusKey])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        presentationMode ||
        inlineTextEdit ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableKeyboardTarget(event.target)
      ) {
        return
      }
      const canvasElement = canvasRef.current
      const activeElement = document.activeElement
      const eventTarget = event.target instanceof Node ? event.target : null
      const eventStartedInCanvas = Boolean(eventTarget && canvasElement?.contains(eventTarget))
      const focusIsCanvasNeutral =
        activeElement === document.body ||
        activeElement === null ||
        Boolean(activeElement && canvasElement?.contains(activeElement))
      if (!eventStartedInCanvas && !focusIsCanvasNeutral) {
        return
      }
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        resolvedActiveNodeIconEditId
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
        removeNodeTechIcon(resolvedActiveNodeIconEditId)
        setActiveNodeIconEditId(null)
        clearNodeTechIconInteraction()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      if (!selectedEdgeId) {
        return
      }
      const edge = workspace.edges[selectedEdgeId]
      const curve = edgeCurveById.get(selectedEdgeId)
      if (!edge || !curve) {
        return
      }
      event.preventDefault()
      const labelPlacement = resolveEdgeLabelPlacement(
        curve,
        edge.style.labelPosition ?? 0.5,
        edge.style.labelSide === 'right' ? 'right' : 'left',
        14,
      )
      setEdgeLabelAngle(
        edge.id,
        resolveNextGlobalEdgeLabelRotationAngle(
          labelPlacement.angleDeg,
          edge.style.labelAngle ?? 0,
          event.shiftKey ? -1 : 1,
        ),
      )
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    clearNodeTechIconInteraction,
    edgeCurveById,
    inlineTextEdit,
    presentationMode,
    removeNodeTechIcon,
    resolvedActiveNodeIconEditId,
    selectedEdgeId,
    setEdgeLabelAngle,
    workspace.edges,
  ])

  useEffect(() => {
    if (playerTrailEnabled) {
      return
    }
    trailsRef.current = []
    lastTrailPositionByLaneRef.current.clear()
    const trailCanvas = trailCanvasRef.current
    const context = trailCanvas?.getContext('2d')
    if (trailCanvas && context) {
      context.clearRect(0, 0, trailCanvas.width, trailCanvas.height)
    }
  }, [playerTrailEnabled])

  useEffect(() => {
    if (playerIsRunning) {
      return
    }
    playerMarkerPositionsRef.current.clear()
    lastTrailPositionByLaneRef.current.clear()
    trailsRef.current = []
    const trailCanvas = trailCanvasRef.current
    const context = trailCanvas?.getContext('2d')
    if (!trailCanvas || !context) {
      return
    }
    context.clearRect(0, 0, trailCanvas.width, trailCanvas.height)
  }, [playerIsRunning])

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

      const stepKey =
        currentPlayerLaneVisuals.length > 0
          ? `${viewId}:${playerJourneyId ?? ''}:${playerStepIndex}:${currentPlayerLaneVisuals
              .map((lane) => `${lane.laneId}:${lane.edgeId}`)
              .join('|')}`
          : null

      if (stepKey !== stepKeyRef.current) {
        stepKeyRef.current = stepKey
        stepStartTsRef.current = timestamp
        stepArrivalStartTsRef.current = null
        playerStepArrivedRef.current = false
        stepAdvanceRequestedRef.current = false
        playerMarkerPositionsRef.current.clear()
        lastTrailPositionByLaneRef.current.clear()
        setPlayerStepArrivedForUi(false)
      }

      let travelProgress = 0
      let shouldAdvanceStep = false
      if (playerIsRunning && stepKey && currentPlayerLaneVisuals.length > 0) {
        const elapsed = Math.max(0, timestamp - (stepStartTsRef.current ?? timestamp))
        travelProgress = resolveTravelProgress(elapsed, playerSpeedMs)
        const hasArrived = travelProgress >= 1
        if (playerStepArrivedRef.current !== hasArrived) {
          playerStepArrivedRef.current = hasArrived
          setPlayerStepArrivedForUi(hasArrived)
        }
        const isFinalStep =
          playerPlaybackTicks.length > 0 &&
          playerStepIndex >= playerPlaybackTicks.length - 1
        const arrivalState = resolveArrivalAdvance({
          travelProgress,
          nowMs: timestamp,
          arrivalStartedAtMs: stepArrivalStartTsRef.current,
          alreadyAdvanced: stepAdvanceRequestedRef.current,
          holdMs: isFinalStep ? FINAL_STEP_ARRIVAL_HOLD_MS : STEP_ARRIVAL_HOLD_MS,
        })
        stepArrivalStartTsRef.current = arrivalState.arrivalStartedAtMs
        shouldAdvanceStep = arrivalState.shouldAdvance

        const markerPositions = playerMarkerPositionsRef.current
        markerPositions.clear()
        for (const lane of currentPlayerLaneVisuals) {
          const markerPoint = cubicPointAt(lane.curve, travelProgress)
          markerPositions.set(lane.laneId, markerPoint)
        }
        if (playerTrailEnabled) {
          const minSpacing = TRAIL_MIN_SPACING * inverseSafeZoom
          if (travelProgress > 0) {
            for (const lane of currentPlayerLaneVisuals) {
              const markerPoint = markerPositions.get(lane.laneId)
              if (!markerPoint) {
                continue
              }
              const previousTrailPoint = lastTrailPositionByLaneRef.current.get(lane.laneId) ?? null
              const trailPoints = buildTrailPoints(previousTrailPoint, markerPoint, minSpacing)
              if (!trailPoints.length) {
                continue
              }
              for (const point of trailPoints) {
                trailsRef.current.push({
                  id: nextTrailIdRef.current,
                  color: lane.color,
                  alpha: TRAIL_INITIAL_ALPHA,
                  radius: TRAIL_PARTICLE_RADIUS * inverseSafeZoom,
                  position: point,
                })
                nextTrailIdRef.current += 1
              }
              lastTrailPositionByLaneRef.current.set(
                lane.laneId,
                trailPoints[trailPoints.length - 1],
              )
            }
            if (trailsRef.current.length > MAX_TRAILS) {
              trimArrayStartInPlace(trailsRef.current, MAX_TRAILS)
            }
          } else {
            lastTrailPositionByLaneRef.current.clear()
          }
        } else {
          lastTrailPositionByLaneRef.current.clear()
        }
      } else {
        playerMarkerPositionsRef.current.clear()
        lastTrailPositionByLaneRef.current.clear()
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

      if (playerIsRunning && currentPlayerLaneVisuals.length > 0 && playerTrailEnabled) {
        for (const lane of currentPlayerLaneVisuals) {
          drawCurveTrack(context, lane.curve, {
            color: lane.color,
            alpha: PLAYER_TRACK_BASE_ALPHA,
            width: 2.2 * inverseSafeZoom,
            glow: 9 * inverseSafeZoom,
          })
          drawCurveProgress(context, lane.curve, travelProgress, {
            color: lane.color,
            alpha: PLAYER_TRACK_PROGRESS_ALPHA,
            width: 3.3 * inverseSafeZoom,
            glow: 16 * inverseSafeZoom,
          })
        }
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

      if (playerIsRunning && playerMarkerPositionsRef.current.size > 0) {
        const orbRadius = ORB_RADIUS * inverseSafeZoom
        for (const lane of currentPlayerLaneVisuals) {
          const markerPosition = playerMarkerPositionsRef.current.get(lane.laneId)
          if (!markerPosition) {
            continue
          }
          drawPlayerMarker(
            context,
            markerPosition,
            lane.color,
            orbRadius,
            inverseSafeZoom,
            lane.shape,
          )
        }
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
        playerMarkerPositionsRef.current.clear()
        lastTrailPositionByLaneRef.current.clear()
        trailsRef.current = []
        context.setTransform(metrics.pixelRatio, 0, 0, metrics.pixelRatio, 0, 0)
        context.clearRect(0, 0, metrics.width, metrics.height)
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
    currentPlayerEdgeId,
    currentPlayerLaneVisuals,
    playerIsRunning,
    playerJourneyId,
    playerSpeedMs,
    playerStepIndex,
    playerTrailEnabled,
    playerPlaybackTicks.length,
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

  const resolveTouchPointInCanvas = (
    touch: Pick<Touch, 'clientX' | 'clientY'>,
  ): { x: number; y: number } | null => {
    const container = canvasRef.current
    if (!container) {
      return null
    }
    const rect = container.getBoundingClientRect()
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
  }

  const startMarqueeSelection = (
    pointerId: number,
    clientX: number,
    clientY: number,
    svgElement: SVGSVGElement | null,
    additive: boolean,
  ): boolean => {
    const startWorld = clientToWorld(clientX, clientY)
    if (!startWorld) {
      return false
    }

    panStateRef.current = null
    nodeDragStateRef.current = null
    marqueeSelectionRef.current = {
      pointerId,
      additive,
      startWorld,
    }
    setMarqueeSelectionRect({
      x: startWorld.x,
      y: startWorld.y,
      w: 0,
      h: 0,
    })
    setAlignmentGuides([])
    setDragCursor('crosshair')
    svgElement?.setPointerCapture(pointerId)
    return true
  }

  const cancelActiveCanvasInteraction = (): void => {
    panStateRef.current = null
    nodeDragStateRef.current = null
    marqueeSelectionRef.current = null
    connectionDragRef.current = null
    edgeReconnectRef.current = null
    edgeLabelDragRef.current = null
    edgeLabelZoomRef.current = null
    clearNodeTechIconInteraction()
    setConnectionPreview(null)
    setMarqueeSelectionRect(null)
    setAlignmentGuides([])
    setHoveredConnectionTarget(null)
    setHoveredAnchorKey(null)
    setHoveredPortKey(null)
    setActiveNodeIconEditId(null)
    setDragCursor(null)
    setHoverCursor(null)
  }

  const resolveNodeAtPoint = (
    point: { x: number; y: number },
    options?: { excludeNodeId?: string; includeNotes?: boolean },
  ): NodeModel | null => {
    const includeNotes = options?.includeNotes ?? true
    for (let index = visibleNodes.length - 1; index >= 0; index -= 1) {
      const node = visibleNodes[index]
      if (options?.excludeNodeId && node.id === options.excludeNodeId) {
        continue
      }
      if (!includeNotes && node.kind === 'note') {
        continue
      }
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
    options?: { maxDistance?: number; excludeNodeId?: string },
  ): { nodeId: string; portId: string } | null => {
    const maxDistance = options?.maxDistance ?? EDGE_ANCHOR_RESOLVE_RADIUS
    const excludeNodeId = options?.excludeNodeId
    let best: { nodeId: string; portId: string; distance: number } | null = null
    for (const node of visibleNodes) {
      if (excludeNodeId && node.id === excludeNodeId) {
        continue
      }
      for (const port of node.ports) {
        const px = node.bounds.x + node.bounds.w * port.x
        const py = node.bounds.y + node.bounds.h * port.y
        const distance = Math.hypot(point.x - px, point.y - py)
        if (distance > maxDistance) {
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

  const resolveConnectionTargetAtPoint = (
    point: { x: number; y: number },
    sourceNodeId: string,
  ): ConnectionTarget | null => {
    const exactPort = resolveClosestPortTarget(point, {
      maxDistance: CONNECTION_TARGET_HOVER_RADIUS,
      excludeNodeId: sourceNodeId,
    })
    if (exactPort) {
      return exactPort
    }
    const targetNode = resolveNodeAtPoint(point, {
      excludeNodeId: sourceNodeId,
      includeNotes: false,
    })
    if (!targetNode) {
      return null
    }
    const nearestPort = nearestPortId(targetNode, point) ?? targetNode.ports[0]?.id
    if (!nearestPort) {
      return null
    }
    return {
      nodeId: targetNode.id,
      portId: nearestPort,
    }
  }

  const resolveReconnectTarget = (
    point: { x: number; y: number },
  ): { nodeId: string; portId?: string } | null => {
    const exactPort = resolveClosestPortTarget(point)
    if (exactPort) {
      return exactPort
    }
    const targetNode = resolveNodeAtPoint(point, { includeNotes: false })
    if (!targetNode) {
      return null
    }
    const nearestPort = nearestPortId(targetNode, point)
    return {
      nodeId: targetNode.id,
      portId: nearestPort,
    }
  }

  const closeInlineTextEditor = (commitChanges: boolean): void => {
    if (!inlineTextEdit) {
      return
    }
    if (commitChanges) {
      const nextValue = sanitizeInlineTextEditValue(inlineTextEdit.value, {
        multiline: inlineTextEdit.multiline,
      })
      const hasVisibleValue = nextValue.trim().length > 0
      if (inlineTextEdit.mode === 'edge-label') {
        setEdgeLabel(inlineTextEdit.targetId, nextValue)
      } else if (inlineTextEdit.mode === 'node-name') {
        const node = workspace.nodes[inlineTextEdit.targetId]
        if (node) {
          setNodeName(inlineTextEdit.targetId, hasVisibleValue ? nextValue : node.name)
        }
      } else if (inlineTextEdit.mode === 'node-tech') {
        const node = workspace.nodes[inlineTextEdit.targetId]
        if (node) {
          setNodeTech(inlineTextEdit.targetId, hasVisibleValue ? nextValue : node.tech?.label || node.kind)
        }
      }
    }
    setInlineTextEdit(null)
  }

  const startNodeInlineEdit = (
    event: ReactPointerEvent<SVGTextElement>,
    node: NodeModel,
    mode: InlineTextEditMode,
    layout: NodeLabelLayout,
  ): void => {
    if (presentationMode) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const isNodeName = mode === 'node-name'
    const isMultilineNote = isNodeName && node.kind === 'note'
    setInlineTextEdit({
      mode,
      targetId: node.id,
      value: isNodeName ? node.name : node.tech?.label ?? node.kind,
      multiline: isMultilineNote,
      worldX: node.bounds.x + (isNodeName ? layout.titleX : layout.subtitleX),
      worldY: node.bounds.y + (isNodeName ? layout.titleY : layout.subtitleY),
      textAnchor: layout.textAnchor,
      width: isNodeName ? layout.maxTitleWidth : layout.maxSubtitleWidth,
      fontSize: isNodeName ? 14 : 12,
      textColor: node.style?.textColor,
    })
  }

  const startEdgeLabelInlineEdit = (
    edgeId: string,
    event: ReactPointerEvent<SVGTextElement>,
  ): void => {
    if (presentationMode) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const edge = workspace.edges[edgeId]
    const curve = edgeCurveById.get(edgeId)
    if (!edge || !curve) {
      return
    }
    const labelPlacement = resolveEdgeLabelPlacement(
      curve,
      edge.style.labelPosition ?? 0.5,
      edge.style.labelSide === 'right' ? 'right' : 'left',
      14,
    )
    setInlineTextEdit({
      mode: 'edge-label',
      targetId: edgeId,
      value: edge.label,
      worldX: labelPlacement.point.x,
      worldY: labelPlacement.point.y,
      textAnchor: 'middle',
      width: Math.max(
        160,
        Math.min(420, estimateCanvasTextWidth(edge.label, edge.style.labelFontSize ?? 11) + 120),
      ),
      fontSize: edge.style.labelFontSize ?? DEFAULT_EDGE_LABEL_FONT_SIZE,
    })
  }

  const startConnectionDrag = (
    pointerId: number,
    sourceNodeId: string,
    sourcePortId: string,
    svgElement: SVGSVGElement | null,
  ): void => {
    const sourceNode = workspace.nodes[sourceNodeId]
    if (!sourceNode) {
      return
    }
    const start = portWorldPosition(sourceNode, sourcePortId)
    beginConnection(sourceNodeId, sourcePortId)
    connectionDragRef.current = {
      pointerId,
      sourceNodeId,
      sourcePortId,
    }
    setHoveredPortKey(null)
    setHoveredConnectionTarget(null)
    setConnectionPreview({
      from: start,
      to: start,
    })
    setDragCursor('crosshair')
    svgElement?.setPointerCapture(pointerId)
  }

  const resolveResizeHandleAtPointer = (
    node: NodeModel,
    event: ReactPointerEvent<SVGElement>,
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
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    if (event.button !== 0) {
      return
    }
    const pointerTarget = event.target instanceof Element ? event.target : null
    if (pointerTarget?.closest('.node-tech-icon')) {
      const nodeElement = pointerTarget.closest<SVGGElement>('.node-group')
      const nodeId = nodeElement?.dataset.nodeId
      const node = nodeId ? workspace.nodes[nodeId] : undefined
      if (node?.uiIcon) {
        onNodeTechIconPointerDown(event, node)
        return
      }
    }
    event.preventDefault()
    if (inlineTextEdit) {
      closeInlineTextEditor(true)
    }
    setActiveNodeIconEditId(null)
    clearNodeTechIconInteraction()
    if (!presentationMode && activeShapeTool) {
      const startWorld = clientToWorld(event.clientX, event.clientY)
      if (!startWorld) {
        return
      }
      freeformShapeDrawingRef.current = {
        pointerId: event.pointerId,
        shapeKind: activeShapeTool,
        startWorld,
      }
      setFreeformShapePreview({
        shapeKind: activeShapeTool,
        bounds: resolveFreeformShapeBounds(activeShapeTool, startWorld, startWorld),
      })
      setHoveredPortKey(null)
      setAlignmentGuides([])
      selectNode(null)
      selectEdge(null)
      setHoverCursor(null)
      setDragCursor('crosshair')
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (isConnectorMode) {
      return
    }
    if (
      !presentationMode &&
      activeTool === 'select' &&
      event.altKey &&
      startMarqueeSelection(
        event.pointerId,
        event.clientX,
        event.clientY,
        event.currentTarget,
        event.shiftKey || event.metaKey,
      )
    ) {
      setHoverCursor(null)
      return
    }
    setHoveredPortKey(null)
    setAlignmentGuides([])
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
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    const nodeTechIconInteraction = nodeTechIconInteractionRef.current
    if (nodeTechIconInteraction && nodeTechIconInteraction.pointerId === event.pointerId) {
      const dx = (event.clientX - nodeTechIconInteraction.startClientX) / viewport.zoom
      const dy = (event.clientY - nodeTechIconInteraction.startClientY) / viewport.zoom
      if (nodeTechIconInteraction.mode === 'press') {
        if (Math.hypot(event.clientX - nodeTechIconInteraction.startClientX, event.clientY - nodeTechIconInteraction.startClientY) > NODE_TECH_ICON_PRESS_MOVE_CANCEL_PX) {
          if (nodeTechIconInteraction.holdTimerId) {
            window.clearTimeout(nodeTechIconInteraction.holdTimerId)
            nodeTechIconInteraction.holdTimerId = undefined
          }
        }
        return
      }
      const node = workspace.nodes[nodeTechIconInteraction.nodeId]
      if (!node?.uiIcon) {
        return
      }
      const nextPlacement =
        nodeTechIconInteraction.mode === 'resize' && nodeTechIconInteraction.resizeHandle
          ? resolveResizedNodeTechIconPlacement(
              node.bounds,
              nodeTechIconInteraction.originPlacement,
              nodeTechIconInteraction.resizeHandle,
              dx,
              dy,
            )
          : clampNodeTechIconPlacement(node.bounds, {
              ...nodeTechIconInteraction.originPlacement,
              x: nodeTechIconInteraction.originPlacement.x + dx,
              y: nodeTechIconInteraction.originPlacement.y + dy,
            })
      setNodeTechIconPlacement(node.id, nextPlacement)
      return
    }

    const labelDrag = edgeLabelDragRef.current
    if (labelDrag && labelDrag.pointerId === event.pointerId) {
      const currentWorld = clientToWorld(event.clientX, event.clientY)
      if (currentWorld) {
        const curve = edgeCurveById.get(labelDrag.edgeId)
        if (curve) {
          const nextPosition = resolveNearestCurveProgress(curve, currentWorld)
          const nextSide = resolveLabelSideForPointer(curve, nextPosition, currentWorld)
          setEdgeLabelPosition(labelDrag.edgeId, nextPosition)
          setEdgeLabelSide(labelDrag.edgeId, nextSide)
        }
      }
      return
    }

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
        const hoveredTarget = resolveConnectionTargetAtPoint(
          currentWorld,
          connectionDrag.sourceNodeId,
        )
        setHoveredConnectionTarget(hoveredTarget)
        const targetNode = hoveredTarget ? workspace.nodes[hoveredTarget.nodeId] : undefined
        const previewPoint =
          hoveredTarget && targetNode
            ? portWorldPosition(targetNode, hoveredTarget.portId)
            : currentWorld
        setConnectionPreview((previous) =>
          previous
            ? {
                ...previous,
                to: previewPoint,
              }
            : previous,
        )
      } else {
        setHoveredConnectionTarget(null)
      }
      return
    }

    const marqueeSelection = marqueeSelectionRef.current
    if (marqueeSelection && marqueeSelection.pointerId === event.pointerId) {
      const currentWorld = clientToWorld(event.clientX, event.clientY)
      if (currentWorld) {
        setMarqueeSelectionRect(
          resolveMarqueeSelectionRect(marqueeSelection.startWorld, currentWorld),
        )
      }
      return
    }

    const freeformShapeDrawing = freeformShapeDrawingRef.current
    if (freeformShapeDrawing && freeformShapeDrawing.pointerId === event.pointerId) {
      const currentWorld = clientToWorld(event.clientX, event.clientY)
      if (currentWorld) {
        setFreeformShapePreview({
          shapeKind: freeformShapeDrawing.shapeKind,
          bounds: resolveFreeformShapeBounds(
            freeformShapeDrawing.shapeKind,
            freeformShapeDrawing.startWorld,
            currentWorld,
          ),
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
    const nodeTechIconInteraction = nodeTechIconInteractionRef.current
    if (nodeTechIconInteraction?.pointerId === event.pointerId) {
      const node = workspace.nodes[nodeTechIconInteraction.nodeId]
      const world = clientToWorld(event.clientX, event.clientY)
      if (
        node?.uiIcon &&
        world &&
        nodeTechIconInteraction.mode !== 'press' &&
        (world.x < node.bounds.x ||
          world.x > node.bounds.x + node.bounds.w ||
          world.y < node.bounds.y ||
          world.y > node.bounds.y + node.bounds.h)
      ) {
        setNodeTechIconPlacement(node.id, nodeTechIconInteraction.originPlacement)
      }
      clearNodeTechIconInteraction()
      setDragCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

    const freeformShapeDrawing = freeformShapeDrawingRef.current
    if (freeformShapeDrawing?.pointerId === event.pointerId) {
      const currentWorld =
        clientToWorld(event.clientX, event.clientY) ??
        freeformShapeDrawing.startWorld
      if (hasDraggedFreeformShape(freeformShapeDrawing.startWorld, currentWorld)) {
        addBasicShape(
          freeformShapeDrawing.shapeKind,
          resolveFreeformShapeBounds(
            freeformShapeDrawing.shapeKind,
            freeformShapeDrawing.startWorld,
            currentWorld,
          ),
        )
      }
      freeformShapeDrawingRef.current = null
      setFreeformShapePreview(null)
      setDragCursor(null)
      setHoverCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

    const marqueeSelection = marqueeSelectionRef.current
    if (marqueeSelection?.pointerId === event.pointerId) {
      const currentWorld =
        clientToWorld(event.clientX, event.clientY) ??
        marqueeSelection.startWorld
      const nextMarqueeRect = resolveMarqueeSelectionRect(
        marqueeSelection.startWorld,
        currentWorld,
      )
      const nextSelectedNodeIds = resolveNodeIdsIntersectingMarquee(
        visibleNodes,
        nextMarqueeRect,
      )
      if (nextSelectedNodeIds.length || !marqueeSelection.additive) {
        selectNodes(nextSelectedNodeIds, { additive: marqueeSelection.additive })
      }
      marqueeSelectionRef.current = null
      setMarqueeSelectionRect(null)
      setDragCursor(null)
      setHoverCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

    const labelDrag = edgeLabelDragRef.current
    if (labelDrag?.pointerId === event.pointerId) {
      edgeLabelDragRef.current = null
      edgeLabelZoomRef.current = null
      setDragCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

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
      setHoveredConnectionTarget(null)
      setDragCursor(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

    const connectionDrag = connectionDragRef.current
    if (connectionDrag?.pointerId === event.pointerId) {
      const world = clientToWorld(event.clientX, event.clientY)
      if (world) {
        const target = resolveConnectionTargetAtPoint(world, connectionDrag.sourceNodeId)
        if (target) {
          connectPendingTo(target.nodeId, target.portId)
        } else {
          cancelPendingConnection()
        }
      } else {
        cancelPendingConnection()
      }
      connectionDragRef.current = null
      setConnectionPreview(null)
      setHoveredConnectionTarget(null)
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
    if (edgeLabelZoomRef.current?.pointerId === event.pointerId) {
      edgeLabelZoomRef.current = null
    }
  }

  const onNodePointerDown = (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
    mode: 'move' | 'resize',
    resizeHandle?: ResizeHandle,
  ): void => {
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    if (presentationMode) {
      return
    }
    const pointerTarget = event.target instanceof Element ? event.target : null
    if (pointerTarget?.closest('.node-tech-icon')) {
      return
    }
    if (inlineTextEdit) {
      closeInlineTextEditor(true)
    }
    if (resolvedActiveNodeIconEditId) {
      setActiveNodeIconEditId(null)
      clearNodeTechIconInteraction()
    }
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (isConnectorMode) {
      if (node.kind === 'note') {
        return
      }
      const worldPoint = clientToWorld(event.clientX, event.clientY)
      const sourcePortId =
        (worldPoint ? nearestPortId(node, worldPoint) : nearestPortId(node, nodeCenter(node))) ??
        node.ports[0]?.id
      if (!sourcePortId) {
        return
      }
      startConnectionDrag(
        event.pointerId,
        node.id,
        sourcePortId,
        event.currentTarget.ownerSVGElement,
      )
      return
    }

    if (activeShapeTool) {
      return
    }

    if (
      mode === 'move' &&
      activeTool === 'select' &&
      event.altKey &&
      startMarqueeSelection(
        event.pointerId,
        event.clientX,
        event.clientY,
        event.currentTarget.ownerSVGElement,
        event.shiftKey || event.metaKey,
      )
    ) {
      setHoverCursor(null)
      return
    }

    if (mode === 'move' && (event.shiftKey || event.metaKey)) {
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
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
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
        const result = snapEnabled
          ? snapBoundsWithGuides(candidateBounds, drag.primaryNodeId, workspace.nodes, {
              gridSize: DEFAULT_GRID_SIZE,
              snapGrid: true,
              snapShapes: true,
              excludeNodeIds: drag.nodeIds,
            })
          : {
              bounds: candidateBounds,
              guides: [],
            }
        setNodeBounds(drag.primaryNodeId, result.bounds)
        setAlignmentGuides(result.guides)
        return
      }

      const primaryOrigin = drag.originBoundsByNodeId[drag.primaryNodeId]
      if (!primaryOrigin) {
        return
      }
      const snappedPrimary = snapEnabled
        ? snapBoundsWithGuides(
            {
              ...primaryOrigin,
              x: primaryOrigin.x + dx,
              y: primaryOrigin.y + dy,
            },
            drag.primaryNodeId,
            workspace.nodes,
            {
              gridSize: DEFAULT_GRID_SIZE,
              snapGrid: true,
              snapShapes: true,
              excludeNodeIds: drag.nodeIds,
            },
          )
        : {
            bounds: {
              ...primaryOrigin,
              x: primaryOrigin.x + dx,
              y: primaryOrigin.y + dy,
            },
            guides: [],
          }
      const snappedDx = snappedPrimary.bounds.x - primaryOrigin.x
      const snappedDy = snappedPrimary.bounds.y - primaryOrigin.y
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
      setAlignmentGuides(snappedPrimary.guides)
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
    setAlignmentGuides([])
  }

  const onNodePointerUp = (event: ReactPointerEvent<SVGGElement>): void => {
    const drag = nodeDragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const draggedNode = workspace.nodes[drag.primaryNodeId]
    if (drag.mode === 'move' && draggedNode?.kind === 'note') {
      const world = clientToWorld(event.clientX, event.clientY)
      if (world) {
        const targetNode = resolveNodeAtPoint(world, {
          excludeNodeId: draggedNode.id,
          includeNotes: false,
        })
        if (targetNode) {
          attachNoteToNode(draggedNode.id, targetNode.id)
        }
      }
    }
    nodeDragStateRef.current = null
    setAlignmentGuides([])
    setDragCursor(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onNodeBorderPointerMove = (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
  ): void => {
    if (presentationMode) {
      return
    }
    if (activeTool !== 'select' || isConnectorMode) {
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
    if (presentationMode) {
      return
    }
    if (!nodeDragStateRef.current) {
      setHoverCursor(null)
    }
  }

  const onNodeBorderPointerDown = (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
  ): void => {
    if (presentationMode) {
      return
    }
    if (activeTool !== 'select' || isConnectorMode) {
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
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    if (presentationMode) {
      return
    }
    const canStartConnectionFromPort = activeTool === 'select' || isConnectorMode
    if (!canStartConnectionFromPort || event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    startConnectionDrag(event.pointerId, node.id, portId, event.currentTarget.ownerSVGElement)
  }

  const onPortPointerEnter = (nodeId: string, portId: string): void => {
    if (presentationMode) {
      return
    }
    setHoveredPortKey(`${nodeId}:${portId}`)
    if (!connectionDragRef.current && !edgeReconnectRef.current && !nodeDragStateRef.current) {
      setHoverCursor('crosshair')
    }
  }

  const onPortPointerLeave = (nodeId: string, portId: string): void => {
    if (presentationMode) {
      return
    }
    const portKey = `${nodeId}:${portId}`
    setHoveredPortKey((current) => (current === portKey ? null : current))
    if (!connectionDragRef.current && !edgeReconnectRef.current && !nodeDragStateRef.current) {
      setHoverCursor(null)
    }
  }

  const onNodeTechIconPointerDown = (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
  ): void => {
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (presentationMode || activeTool !== 'select' || isConnectorMode || event.button !== 0 || !node.uiIcon) {
      return
    }
    closeInlineTextEditor(true)
    selectNode(node.id)
    selectEdge(null)
    const originPlacement = clampNodeTechIconPlacement(node.bounds, node.uiIcon)
    const isAlreadyEditing = resolvedActiveNodeIconEditId === node.id
    setActiveNodeIconEditId(isAlreadyEditing ? node.id : null)
    const interaction: NodeTechIconInteractionState = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode: isAlreadyEditing ? 'move' : 'press',
      startClientX: event.clientX,
      startClientY: event.clientY,
      originPlacement,
    }
    if (!isAlreadyEditing) {
      interaction.holdTimerId = window.setTimeout(() => {
        const current = nodeTechIconInteractionRef.current
        if (!current || current.pointerId !== event.pointerId || current.nodeId !== node.id) {
          return
        }
        current.mode = 'move'
        current.holdTimerId = undefined
        setActiveNodeIconEditId(node.id)
        setDragCursor('move')
      }, NODE_TECH_ICON_HOLD_DELAY_MS)
    } else {
      setDragCursor('move')
    }
    clearNodeTechIconInteraction()
    nodeTechIconInteractionRef.current = interaction
    const captureElement =
      event.currentTarget instanceof SVGSVGElement
        ? event.currentTarget
        : event.currentTarget.ownerSVGElement
    captureElement?.setPointerCapture(event.pointerId)
  }

  const onNodeTechIconResizePointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
    node: NodeModel,
    handle: DiagramNodeTechIconResizeHandle,
  ): void => {
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    if (presentationMode || activeTool !== 'select' || isConnectorMode || event.button !== 0 || !node.uiIcon) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    closeInlineTextEditor(true)
    selectNode(node.id)
    selectEdge(null)
    setActiveNodeIconEditId(node.id)
    clearNodeTechIconInteraction()
    nodeTechIconInteractionRef.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode: 'resize',
      resizeHandle: handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originPlacement: clampNodeTechIconPlacement(node.bounds, node.uiIcon),
    }
    setDragCursor(handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize')
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId)
  }

  const onEdgeLabelPointerDown = (
    edgeId: string,
    event: ReactPointerEvent<SVGTextElement>,
  ): void => {
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    if (presentationMode) {
      return
    }
    if (isConnectorMode) {
      return
    }
    closeInlineTextEditor(true)
    selectEdge(edgeId)
    edgeLabelDragRef.current = {
      pointerId: event.pointerId,
      edgeId,
    }
    edgeLabelZoomRef.current = {
      pointerId: event.pointerId,
      edgeId,
    }
    setDragCursor('move')
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId)
  }

  const onEdgeAnchorPointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    anchor: EdgeAnchorHandle,
  ): void => {
    if (pinchGestureRef.current && event.pointerType === 'touch') {
      return
    }
    if (presentationMode) {
      return
    }
    if (activeTool !== 'select' || event.button !== 0 || !anchor.candidates.length) {
      return
    }
    event.preventDefault()
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
    if (presentationMode) {
      return
    }
    if (activeTool !== 'select' || isConnectorMode) {
      return
    }
    setHoveredAnchorKey(anchorKey)
    setHoverCursor('grab')
  }

  const onEdgeAnchorPointerLeave = (): void => {
    if (presentationMode) {
      return
    }
    setHoveredAnchorKey((current) => (edgeReconnectRef.current ? current : null))
    if (!edgeReconnectRef.current) {
      setHoverCursor(null)
    }
  }

  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>): void => {
    if (event.targetTouches.length < 2) {
      return
    }
    const firstPoint = resolveTouchPointInCanvas(event.targetTouches[0])
    const secondPoint = resolveTouchPointInCanvas(event.targetTouches[1])
    if (!firstPoint || !secondPoint) {
      return
    }
    const metrics = resolvePinchGestureMetrics(firstPoint, secondPoint)
    cancelActiveCanvasInteraction()
    pinchGestureRef.current = {
      startDistance: Math.max(metrics.distance, 1),
      startCenter: metrics.center,
      startViewport: { ...viewportRef.current },
    }
    event.preventDefault()
  }

  const onTouchMove = (event: ReactTouchEvent<HTMLDivElement>): void => {
    const pinchGesture = pinchGestureRef.current
    if (!pinchGesture || event.targetTouches.length < 2) {
      return
    }
    const firstPoint = resolveTouchPointInCanvas(event.targetTouches[0])
    const secondPoint = resolveTouchPointInCanvas(event.targetTouches[1])
    if (!firstPoint || !secondPoint) {
      return
    }
    const metrics = resolvePinchGestureMetrics(firstPoint, secondPoint)
    setViewport(
      resolveViewportAfterPinch({
        startViewport: pinchGesture.startViewport,
        startCenter: pinchGesture.startCenter,
        currentCenter: metrics.center,
        distanceRatio: metrics.distance / pinchGesture.startDistance,
      }),
    )
    event.preventDefault()
  }

  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>): void => {
    if (pinchGestureRef.current && event.targetTouches.length < 2) {
      pinchGestureRef.current = null
    }
  }

  const onWheel = (event: WheelEvent<HTMLDivElement>): void => {
    const wheelTarget = event.target
    if (
      (wheelTarget instanceof HTMLInputElement ||
        wheelTarget instanceof HTMLTextAreaElement) &&
      wheelTarget.classList.contains('canvas-inline-editor-input')
    ) {
      return
    }
    const zoomEdgeLabel = edgeLabelZoomRef.current
    if (
      zoomEdgeLabel &&
      !presentationMode &&
      edgeLabelDragRef.current?.edgeId === zoomEdgeLabel.edgeId
    ) {
      event.preventDefault()
      const edge = workspace.edges[zoomEdgeLabel.edgeId]
      if (!edge) {
        return
      }
      if (event.altKey) {
        const currentAngle = edge.style.labelAngle ?? 0
        const nextAngle = resolveNextEdgeLabelRotationAngle(currentAngle, event.deltaY)
        if (nextAngle !== currentAngle) {
          setEdgeLabelAngle(zoomEdgeLabel.edgeId, nextAngle)
        }
        return
      }
      const currentFontSize = edge.style.labelFontSize ?? DEFAULT_EDGE_LABEL_FONT_SIZE
      const nextFontSize =
        event.deltaY < 0
          ? currentFontSize + 1
          : currentFontSize - 1
      const clampedFontSize = Math.min(MAX_EDGE_LABEL_FONT_SIZE, Math.max(MIN_EDGE_LABEL_FONT_SIZE, nextFontSize))
      if (clampedFontSize !== currentFontSize) {
        setEdgeLabelFontSize(zoomEdgeLabel.edgeId, clampedFontSize)
      }
      return
    }

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
    if (presentationMode) {
      return
    }
    const droppedTechIconId = event.dataTransfer.getData(TECH_ICON_DRAG_MIME_TYPE)
    const presetId = event.dataTransfer.getData(NODE_PRESET_DRAG_MIME_TYPE)
    if (!presetId && !droppedTechIconId) {
      return
    }
    const container = canvasRef.current
    if (!container) {
      return
    }
    const rect = container.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const worldPoint = {
      x: (px - viewport.x) / viewport.zoom,
      y: (py - viewport.y) / viewport.zoom,
    }
    if (droppedTechIconId) {
      const targetNode = resolveNodeAtPoint(worldPoint, { includeNotes: false })
      if (targetNode && !isExperimentalShapeKind(targetNode.kind)) {
        setNodeTechIcon(
          targetNode.id,
          droppedTechIconId,
          resolveDefaultTechIconPlacementForNode(targetNode),
        )
        selectNode(targetNode.id)
        selectEdge(null)
        setActiveNodeIconEditId(targetNode.id)
      }
      return
    }
    if (presetId === 'note') {
      const targetNode = resolveNodeAtPoint(worldPoint, { includeNotes: false })
      if (targetNode) {
        const attachedNoteId = addAttachedNote(targetNode.id)
        if (attachedNoteId) {
          return
        }
      }
    }
    const rawX = (px - viewport.x) / viewport.zoom - 110
    const rawY = (py - viewport.y) / viewport.zoom - 60
    const x = snapEnabled ? Math.round(rawX / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE : rawX
    const y = snapEnabled ? Math.round(rawY / DEFAULT_GRID_SIZE) * DEFAULT_GRID_SIZE : rawY
    addNode(presetId, x, y)
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
  }

  const onInlineTextInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    if (event.key === 'Enter') {
      if (inlineTextEdit?.multiline) {
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault()
          closeInlineTextEditor(true)
        }
        return
      }
      event.preventDefault()
      closeInlineTextEditor(true)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeInlineTextEditor(false)
    }
  }

  const inlineTextEditStyle = useMemo(() => {
    if (!inlineTextEdit) {
      return null
    }
    const left = viewport.x + inlineTextEdit.worldX * viewport.zoom
    const top = viewport.y + inlineTextEdit.worldY * viewport.zoom
    const width = Math.max(120, inlineTextEdit.width * viewport.zoom)
    const translateX =
      inlineTextEdit.textAnchor === 'middle' ? '-50%' : inlineTextEdit.textAnchor === 'end' ? '-100%' : '0'
    const baseFontSize = Math.max(11, inlineTextEdit.fontSize * viewport.zoom)
    const inlineRows = inlineTextEdit.multiline
      ? Math.max(3, Math.min(10, inlineTextEdit.value.split('\n').length + 1))
      : 1
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      minHeight: inlineTextEdit.multiline
        ? `${Math.round(baseFontSize * 1.35 * inlineRows)}px`
        : undefined,
      transform: `translate(${translateX}, ${inlineTextEdit.multiline ? '-44%' : '-50%'})`,
      fontSize: `${baseFontSize}px`,
      color: inlineTextEdit.textColor,
    }
  }, [inlineTextEdit, viewport.x, viewport.y, viewport.zoom])

  const canvasCursor =
    dragCursor ??
    hoverCursor ??
    (presentationMode ? 'grab' : isConnectorMode || activeShapeTool ? 'crosshair' : 'grab')

  return (
    <div
      className="canvas-shell"
      ref={canvasRef}
      onWheel={onWheel}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <svg
        className={
          nodeDepthEffectsEnabled
            ? 'diagram-canvas diagram-canvas-depth-on'
            : 'diagram-canvas diagram-canvas-depth-off'
        }
        style={{ cursor: canvasCursor }}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
      >
        <defs>
          <linearGradient id="node-depth-fill-vertical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
            <stop offset="38%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.14)" />
          </linearGradient>
          <linearGradient id="node-depth-sheen-diagonal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="34%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="70%" stopColor="rgba(15,23,42,0.03)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.14)" />
          </linearGradient>
          {showGrid ? (
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
          {showGrid ? (
            <rect
              x={-10000}
              y={-10000}
              width={20000}
              height={20000}
              fill="url(#grid-pattern)"
            />
          ) : null}
          {noteLinkItems.map((link) => (
            <line
              key={link.key}
              x1={link.from.x}
              y1={link.from.y}
              x2={link.to.x}
              y2={link.to.y}
              className="note-link"
            />
          ))}
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
              isDimmed={
                effectiveJourneyFilterId !== null &&
                effectiveOffscopeRenderMode === 'dim' &&
                !(focusedEdgeIdSet?.has(edge.id) ?? false)
              }
              isDraggingToJourney={draggedEdgeId === edge.id}
              isInteractive={!presentationMode}
              onEdgePointerStart={onEdgePointerStart}
              onEdgeLabelPointerDown={onEdgeLabelPointerDown}
              onEdgeLabelLongPress={startEdgeLabelInlineEdit}
              onSelect={() => {
                if (!presentationMode) {
                  if (inlineTextEdit) {
                    closeInlineTextEditor(true)
                  }
                  selectEdge(edge.id)
                }
              }}
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
          {freeformShapePreview ? (
            <g
              className="freeform-shape-preview"
              transform={`translate(${freeformShapePreview.bounds.x}, ${freeformShapePreview.bounds.y})`}
              aria-hidden="true"
            >
              {freeformShapePreview.shapeKind === 'shape-circle' ? (
                <ellipse
                  cx={freeformShapePreview.bounds.w / 2}
                  cy={freeformShapePreview.bounds.h / 2}
                  rx={freeformShapePreview.bounds.w / 2}
                  ry={freeformShapePreview.bounds.h / 2}
                />
              ) : freeformShapePreview.shapeKind === 'shape-triangle' ? (
                <path
                  d={resolveTriangleShape(
                    freeformShapePreview.bounds.w,
                    freeformShapePreview.bounds.h,
                  ).shellPath}
                />
              ) : freeformShapePreview.shapeKind === 'shape-diamond' ? (
                <path
                  d={resolveDiamondShape(
                    freeformShapePreview.bounds.w,
                    freeformShapePreview.bounds.h,
                  ).shellPath}
                />
              ) : (
                <rect
                  width={freeformShapePreview.bounds.w}
                  height={freeformShapePreview.bounds.h}
                />
              )}
            </g>
          ) : null}
          {!presentationMode && activeTool === 'select' && !isConnectorMode
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

          {visibleNodes.map((node) => {
            const isJourneyFocused = focusedNodeIdSet?.has(node.id) ?? true
            const isDimmedByJourney =
              effectiveJourneyFilterId !== null &&
              effectiveOffscopeRenderMode === 'dim' &&
              !isJourneyFocused
            return (
              <DiagramNode
                key={node.id}
                node={node}
                viewKind={currentView.kind}
                presentationMode={presentationMode}
                activeTool={activeTool}
                isConnectorMode={isConnectorMode}
                pendingConnectionFrom={pendingConnectionFrom}
                hoveredConnectionTarget={hoveredConnectionTarget}
                hoveredPortKey={hoveredPortKey}
                isSelected={selectedNodeIdSet.has(node.id)}
                activeNodeIconEditId={resolvedActiveNodeIconEditId}
                isPlayerHighlighted={highlightedNodeIds.has(node.id)}
                isDimmedByJourney={isDimmedByJourney}
                nodeDepthEffectsEnabled={nodeDepthEffectsEnabled}
                onNodePointerDown={onNodePointerDown}
                onNodePointerMove={onNodePointerMove}
                onNodePointerUp={onNodePointerUp}
                onNodePointerLeave={() => {
                  if (!nodeDragStateRef.current) {
                    setHoverCursor(null)
                  }
                }}
                onNodeTechIconPointerDown={onNodeTechIconPointerDown}
                onNodeTechIconResizePointerDown={onNodeTechIconResizePointerDown}
                onCreateDrilldown={createDrilldownForNode}
                onOpenDrilldown={openDrilldown}
                onNodeBorderPointerDown={onNodeBorderPointerDown}
                onNodeBorderPointerMove={onNodeBorderPointerMove}
                onNodeBorderPointerLeave={onNodeBorderPointerLeave}
                onStartInlineEdit={startNodeInlineEdit}
                onPortPointerEnter={onPortPointerEnter}
                onPortPointerLeave={onPortPointerLeave}
                onPortPointerDown={onPortPointerDown}
              />
            )
          })}
          {alignmentGuides.map((guide, index) =>
            guide.orientation === 'vertical' ? (
              <line
                key={`alignment-guide-v-${index}`}
                className="canvas-alignment-guide"
                x1={guide.x}
                y1={guide.y1}
                x2={guide.x}
                y2={guide.y2}
              />
            ) : (
              <line
                key={`alignment-guide-h-${index}`}
                className="canvas-alignment-guide"
                x1={guide.x1}
                y1={guide.y}
                x2={guide.x2}
                y2={guide.y}
              />
            ),
          )}
          {marqueeSelectionRect ? (
            <rect
              className="canvas-selection-marquee"
              x={marqueeSelectionRect.x}
              y={marqueeSelectionRect.y}
              width={marqueeSelectionRect.w}
              height={marqueeSelectionRect.h}
              rx={10}
            />
          ) : null}
        </g>
      </svg>
      <canvas ref={trailCanvasRef} className="trail-canvas" />
      {!presentationMode && inlineTextEdit && inlineTextEditStyle ? (
        <div className="canvas-inline-editor" style={inlineTextEditStyle}>
          <Text.InlineEditor
            multiline={inlineTextEdit.multiline}
            inputRef={inlineTextInputRef}
            textareaRef={inlineTextTextareaRef}
            className={
              inlineTextEdit.multiline
                ? 'canvas-inline-editor-input canvas-inline-editor-textarea'
                : 'canvas-inline-editor-input'
            }
            value={inlineTextEdit.value}
            onChange={(nextValue) => {
              setInlineTextEdit((current) =>
                current
                  ? {
                      ...current,
                      value: nextValue,
                    }
                  : current,
              )
            }}
            onKeyDown={onInlineTextInputKeyDown}
            onBlur={() => closeInlineTextEditor(true)}
            onPointerDown={(event) => {
              event.stopPropagation()
            }}
            onWheel={(event) => {
              event.stopPropagation()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
