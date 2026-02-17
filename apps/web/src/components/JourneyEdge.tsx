import type { PointerEvent as ReactPointerEvent } from 'react'
import type { EdgeModel } from '../model/types'
import type { EdgeJourneyBadge } from './edgeJourneyBadge'
import { resolveJourneyEdgeClassName } from './journeyEdgeClassName'
import {
  composeEdgeDisplayLabel,
  cubicPointAt,
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
  onSelect,
}: JourneyEdgeProps) => {
  const pathId = `${edge.id}_path`
  const labelPosition = Math.max(0.08, Math.min(0.92, edge.style.labelPosition ?? 0.5))
  const labelStartOffset = `${(labelPosition * 100).toFixed(1)}%`
  const badgePoint = badge
    ? cubicPointAt(curve, resolveEdgeStepBadgeProgress(curve))
    : null
  const selectedPoint = isSelected ? cubicPointAt(curve, labelPosition) : null
  const displayLabel = composeEdgeDisplayLabel(edge.label, protocolLabel)

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
        id={pathId}
        d={path}
        fill="none"
        markerEnd="url(#edge-arrow)"
        className={resolveJourneyEdgeClassName({ isSelected, isPlayerEdge, isFlowAnimated, isDimmed })}
      />
      <text
        className={[
          isInteractive ? 'edge-label edge-label-draggable' : 'edge-label',
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
      >
        <textPath href={`#${pathId}`} startOffset={labelStartOffset}>
          {displayLabel}
        </textPath>
      </text>
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
          <text
            className="edge-step-number"
            x={badgePoint.x}
            y={badgePoint.y}
          >
            {badge.stepNumber}
          </text>
        </g>
      ) : null}
    </g>
  )
}
