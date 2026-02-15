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
  onSelect,
}: JourneyEdgeProps) => {
  const pathId = `${edge.id}_path`
  const badgePoint = badge
    ? cubicPointAt(curve, resolveEdgeStepBadgeProgress(curve))
    : null
  const displayLabel = composeEdgeDisplayLabel(edge.label, protocolLabel)

  return (
    <g
      onPointerDown={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      <path
        id={pathId}
        d={path}
        fill="none"
        markerEnd="url(#edge-arrow)"
        className={resolveJourneyEdgeClassName({ isSelected, isPlayerEdge })}
      />
      <text className="edge-label">
        <textPath href={`#${pathId}`} startOffset="50%">
          {displayLabel}
        </textPath>
      </text>
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
