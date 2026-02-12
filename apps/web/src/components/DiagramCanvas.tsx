import { useMemo, useRef } from 'react'
import type {
  DragEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
} from 'react'
import type { EdgeModel, NodeModel } from '../model/types'
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

const centerPoint = (node: NodeModel) => ({
  x: node.bounds.x + node.bounds.w / 2,
  y: node.bounds.y + node.bounds.h / 2,
})

const edgePath = (edge: EdgeModel, nodes: Record<string, NodeModel>): string | null => {
  const from = nodes[edge.from.nodeId]
  const to = nodes[edge.to.nodeId]
  if (!from || !to) {
    return null
  }
  const p1 = centerPoint(from)
  const p2 = centerPoint(to)
  const mx = (p1.x + p2.x) / 2
  return `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`
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
  const setViewport = useEditorStore((state) => state.setViewport)
  const selectNode = useEditorStore((state) => state.selectNode)
  const selectEdge = useEditorStore((state) => state.selectEdge)
  const setNodeBounds = useEditorStore((state) => state.setNodeBounds)
  const addNode = useEditorStore((state) => state.addNode)
  const beginConnection = useEditorStore((state) => state.beginConnection)
  const connectPendingTo = useEditorStore((state) => state.connectPendingTo)

  const currentView = workspace.views[viewId]
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
      setNodeBounds(drag.nodeId, {
        ...drag.originBounds,
        x: drag.originBounds.x + dx,
        y: drag.originBounds.y + dy,
      })
      return
    }
    const minSize = 80
    setNodeBounds(drag.nodeId, {
      ...drag.originBounds,
      w: Math.max(minSize, drag.originBounds.w + dx),
      h: Math.max(minSize, drag.originBounds.h + dy),
    })
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
    const kind = event.dataTransfer.getData('application/x-node-kind')
    if (!kind) {
      return
    }
    const container = canvasRef.current
    if (!container) {
      return
    }
    const rect = container.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const x = (px - viewport.x) / viewport.zoom
    const y = (py - viewport.y) / viewport.zoom
    addNode(kind as NodeModel['kind'], x - 110, y - 60)
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
          {edges.map((edge) => {
            const path = edgePath(edge, workspace.nodes)
            if (!path) {
              return null
            }
            const isSelected = edge.id === selectedEdgeId
            return (
              <g
                key={edge.id}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  selectEdge(edge.id)
                }}
              >
                <path
                  d={path}
                  fill="none"
                  markerEnd="url(#edge-arrow)"
                  className={isSelected ? 'edge edge-selected' : 'edge'}
                />
                <text className="edge-label">
                  <textPath href={`#${edge.id}_path`} startOffset="50%">
                    {edge.label}
                  </textPath>
                </text>
                <path id={`${edge.id}_path`} d={path} fill="none" stroke="none" />
              </g>
            )
          })}

          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId
            const isPendingConnection = node.id === pendingConnectionFrom
            return (
              <g
                key={node.id}
                transform={`translate(${node.bounds.x}, ${node.bounds.y})`}
                onPointerDown={(event) => onNodePointerDown(event, node, 'move')}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
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
                      : isSelected
                        ? 'node node-selected'
                        : 'node'
                  }
                />
                <text x={16} y={34} className="node-title">
                  {node.name}
                </text>
                <text x={16} y={56} className="node-subtitle">
                  {node.tech?.label ?? node.kind}
                </text>
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
