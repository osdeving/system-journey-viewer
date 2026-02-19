import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { EdgeModel } from '../model/types'
import type { EdgeJourneyBadge } from './edgeJourneyBadge'
import { CanvasText } from './CanvasText'
import { resolveJourneyEdgeClassName } from './journeyEdgeClassName'
import {
  composeEdgeDisplayLabel,
  cubicPointAt,
  resolveEdgeLabelPlacement,
  resolveEdgeStepBadgeProgress,
  type EdgeCurvePath,
} from './edgePresentation'

interface JourneyEdgeProps {
  edge: EdgeModel
  curve: EdgeCurvePath
  path: string
  protocolLabel?: string
  badge?: EdgeJourneyBadge
  isSelected: boolean
  isPlayerEdge: boolean
  isFlowAnimated: boolean
  isDimmed: boolean
  isInteractive: boolean
  onEdgePointerStart?: (
    edgeId: string,
    event: ReactPointerEvent<SVGGElement>,
  ) => void
  onEdgeLabelPointerDown?: (
    edgeId: string,
    event: ReactPointerEvent<SVGTextElement>,
  ) => void
  onEdgeLabelDoubleClick?: (
    edgeId: string,
    event: ReactMouseEvent<SVGTextElement>,
  ) => void
  onSelect: () => void
}

export const JourneyEdge = ({
  edge,
  curve,
  path,
  protocolLabel,
  badge,
  isSelected,
  isPlayerEdge,
  isFlowAnimated,
  isDimmed,
  isInteractive,
  onEdgePointerStart,
  onEdgeLabelPointerDown,
  onEdgeLabelDoubleClick,
  onSelect,
}: JourneyEdgeProps) => {
  const labelPosition = Math.max(0.08, Math.min(0.92, edge.style.labelPosition ?? 0.5))
  const labelSide = edge.style.labelSide === 'right' ? 'right' : 'left'
  const labelPlacement = resolveEdgeLabelPlacement(curve, labelPosition, labelSide, 14)
  const badgePoint = badge
    ? cubicPointAt(curve, resolveEdgeStepBadgeProgress(curve))
    : null
  const selectedPoint = isSelected ? cubicPointAt(curve, labelPosition) : null
  const displayLabel = composeEdgeDisplayLabel(edge.label, protocolLabel)
  const labelFontSize = edge.style.labelFontSize ?? 11

  return (
    <g
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onSelect()
        if (isInteractive && event.button === 0) {
          onEdgePointerStart?.(edge.id, event)
        }
      }}
    >
      <path
        d={path}
        fill="none"
        markerEnd="url(#edge-arrow)"
        className={resolveJourneyEdgeClassName({ isSelected, isPlayerEdge, isFlowAnimated, isDimmed })}
      />
      <CanvasText
        x={labelPlacement.point.x}
        y={labelPlacement.point.y}
        transform={`rotate(${labelPlacement.angleDeg} ${labelPlacement.point.x} ${labelPlacement.point.y})`}
        className={[
          isInteractive ? 'edge-label edge-label-draggable' : 'edge-label',
          labelPlacement.isVertical ? 'edge-label-vertical' : '',
          isDimmed ? 'edge-label-dimmed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDown={(event) => {
          if (!isInteractive || event.button !== 0) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          onEdgeLabelPointerDown?.(edge.id, event)
        }}
        onDoubleClick={(event) => {
          if (!isInteractive) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          onEdgeLabelDoubleClick?.(edge.id, event)
        }}
        style={{ fontSize: `${labelFontSize}px` }}
      >
        {displayLabel}
      </CanvasText>
      {selectedPoint ? (
        <g className="edge-selected-indicator">
          <circle cx={selectedPoint.x} cy={selectedPoint.y} r={9} className="edge-selected-indicator-ring" />
          <path
            d={`M ${selectedPoint.x - 4.2} ${selectedPoint.y} L ${selectedPoint.x - 1} ${selectedPoint.y + 3.2} L ${
              selectedPoint.x + 4.8
            } ${selectedPoint.y - 3.4}`}
            className="edge-selected-indicator-check"
          />
        </g>
      ) : null}
      {badge && badgePoint ? (
        <g className="edge-step-badge-group">
          <circle
            className="edge-step-badge"
            cx={badgePoint.x}
            cy={badgePoint.y}
            r={8}
            style={{ fill: badge.colorKey }}
          />
          <CanvasText
            className="edge-step-number"
            x={badgePoint.x}
            y={badgePoint.y}
          >
            {badge.stepNumber}
          </CanvasText>
        </g>
      ) : null}
    </g>
  )
}
