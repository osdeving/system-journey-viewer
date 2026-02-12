import { useMemo, useRef } from 'react'
import type {
  DragEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
} from 'react'
import {
  DEFAULT_GRID_SIZE,
  portWorldPosition,
  snapBounds,
} from '../engine/geometry'
import type { EdgeModel, NodeModel } from '../model/types'
import { iconForKey } from '../presets/iconPipeline'
import { useEditorStore } from '../store/useEditorStore'

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

const ZOOM_SENSITIVITY = 0.0012

const edgePath = (edge: EdgeModel, nodes: Record<string, NodeModel>): string | null => {
  const from = nodes[edge.from.nodeId]
  const to = nodes[edge.to.nodeId]
  if (!from || !to) {
    return null
  }
  const p1 = portWorldPosition(from, edge.from.portId)
  const p2 = portWorldPosition(to, edge.to.portId)
  const mx = (p1.x + p2.x) / 2
  return `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`
}

const edgeMidpoint = (edge: EdgeModel, nodes: Record<string, NodeModel>) => {
  const from = nodes[edge.from.nodeId]
  const to = nodes[edge.to.nodeId]
  if (!from || !to) {
    return null
  }
  const p1 = portWorldPosition(from, edge.from.portId)
  const p2 = portWorldPosition(to, edge.to.portId)
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

export const DiagramCanvas = () => {
  const panStateRef = useRef<PanState | null>(null)
  const nodeDragStateRef = useRef<NodeDragState | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const workspace = useEditorStore((state) => state.workspace)
  const viewId = useEditorStore((state) => state.currentViewId)
  const viewport = useEditorStore((state) => state.viewport)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const selectedEdgeId = useEditorStore((state) => state.selectedEdgeId)
  const activeTool = useEditorStore((state) => state.activeTool)
  const pendingConnectionFrom = useEditorStore((state) => state.pendingConnectionFrom)
  const journeyFilterId = useEditorStore((state) => state.journeyFilterId)
  const playerJourneyId = useEditorStore((state) => state.playerJourneyId)
  const playerStepIndex = useEditorStore((state) => state.playerStepIndex)
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
    const markers: Record<
      string,
      Array<{ journeyId: string; colorKey: string; stepNumber: number }>
    > = {}
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

  const currentPlayerEdgeId = useMemo(() => {
    if (!playerJourneyId) {
      return null
    }
    const journey = workspace.journeys[playerJourneyId]
    if (!journey) {
      return null
    }
    const sortedSteps = journey.steps.slice().sort((left, right) => left.n - right.n)
    const currentStep = sortedSteps[playerStepIndex]
    return currentStep?.edgeId ?? null
  }, [playerJourneyId, playerStepIndex, workspace.journeys])

  const highlightedNodeIds = useMemo(() => {
    if (!playerHighlightNodes || !currentPlayerEdgeId) {
      return new Set<string>()
    }
    const edge = workspace.edges[currentPlayerEdgeId]
    if (!edge) {
      return new Set<string>()
    }
    const set = new Set<string>([edge.from.nodeId, edge.to.nodeId])
    const journey = playerJourneyId ? workspace.journeys[playerJourneyId] : undefined
    const sortedSteps = journey?.steps.slice().sort((left, right) => left.n - right.n) ?? []
    const currentStep = sortedSteps[playerStepIndex]
    for (const nodeId of currentStep?.highlightNodes ?? []) {
      set.add(nodeId)
    }
    return set
  }, [currentPlayerEdgeId, playerHighlightNodes, playerJourneyId, playerStepIndex, workspace.edges, workspace.journeys])

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
    const current = panStateRef.current
    if (!current || current.pointerId !== event.pointerId) {
      return
    }
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    setViewport({ x: current.originX + dx, y: current.originY + dy, zoom: viewport.zoom })
  }

  const onBackgroundPointerUp = (event: ReactPointerEvent<SVGSVGElement>): void => {
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
      if (!pendingConnectionFrom) {
        beginConnection(node.id)
      } else {
        connectPendingTo(node.id)
      }
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
            const path = edgePath(edge, workspace.nodes)
            if (!path) {
              return null
            }
            const isSelected = edge.id === selectedEdgeId
            const isPlayerEdge = edge.id === currentPlayerEdgeId
            const midpoint = edgeMidpoint(edge, workspace.nodes)
            const badges = edgeJourneyMarkers[edge.id] ?? []
            return (
              <g
                key={edge.id}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  selectEdge(edge.id)
                }}
              >
                <path
                  id={`${edge.id}_path`}
                  d={path}
                  fill="none"
                  markerEnd="url(#edge-arrow)"
                  className={
                    isPlayerEdge && playerIsRunning
                      ? 'edge edge-playing'
                      : isSelected
                        ? 'edge edge-selected'
                        : isPlayerEdge
                          ? 'edge edge-selected'
                          : 'edge'
                  }
                />
                <text className="edge-label">
                  <textPath href={`#${edge.id}_path`} startOffset="50%">
                    {edge.label}
                  </textPath>
                </text>
                {midpoint
                  ? badges.map((badge, index) => (
                      <g
                        key={`${badge.journeyId}-${badge.stepNumber}`}
                        transform={`translate(${midpoint.x + index * 18}, ${midpoint.y - 12})`}
                      >
                        <circle className="edge-step-badge" r={8} fill={badge.colorKey} />
                        <text className="edge-step-number" textAnchor="middle" dominantBaseline="middle">
                          {badge.stepNumber}
                        </text>
                      </g>
                    ))
                  : null}
              </g>
            )
          })}

          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId
            const isPendingConnection = node.id === pendingConnectionFrom
            const isPlayerHighlighted = highlightedNodeIds.has(node.id)
            return (
              <g
                key={node.id}
                transform={`translate(${node.bounds.x}, ${node.bounds.y})`}
                onPointerDown={(event) => onNodePointerDown(event, node, 'move')}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onDoubleClick={() => {
                  if (node.drilldownRef) {
                    openDrilldown(node.id)
                  }
                }}
              >
                <rect
                  x={0}
                  y={0}
                  width={node.bounds.w}
                  height={node.bounds.h}
                  rx={12}
                  className={
                    isPendingConnection
                      ? 'node node-pending'
                      : isPlayerHighlighted
                        ? 'node node-player-highlight'
                      : isSelected
                        ? 'node node-selected'
                        : node.drilldownRef
                          ? 'node node-drilldown'
                          : 'node'
                  }
                />
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
    </div>
  )
}
