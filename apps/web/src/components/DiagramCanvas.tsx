import { useMemo, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react'
import { useEditorStore } from '../store/useEditorStore'

type PanState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

const ZOOM_SENSITIVITY = 0.0012

export const DiagramCanvas = () => {
  const panStateRef = useRef<PanState | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const workspace = useEditorStore((state) => state.workspace)
  const viewId = useEditorStore((state) => state.currentViewId)
  const viewport = useEditorStore((state) => state.viewport)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const setViewport = useEditorStore((state) => state.setViewport)
  const selectNode = useEditorStore((state) => state.selectNode)

  const nodes = useMemo(() => {
    const currentView = workspace.views[viewId]
    return currentView.nodeIds
      .map((nodeId) => workspace.nodes[nodeId])
      .filter((node) => !!node)
  }, [workspace, viewId])

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

  return (
    <div className="canvas-shell" ref={canvasRef} onWheel={onWheel}>
      <svg
        className="diagram-canvas"
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
      >
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId
            return (
              <g
                key={node.id}
                transform={`translate(${node.bounds.x}, ${node.bounds.y})`}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  selectNode(node.id)
                }}
              >
                <rect
                  x={0}
                  y={0}
                  width={node.bounds.w}
                  height={node.bounds.h}
                  rx={12}
                  className={isSelected ? 'node node-selected' : 'node'}
                />
                <text x={16} y={34} className="node-title">
                  {node.name}
                </text>
                <text x={16} y={56} className="node-subtitle">
                  {node.tech?.label ?? node.kind}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
