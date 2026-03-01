/**
 * Purpose: Provide pure helpers for edge geometry, badges, labels, and presentation styling in the diagram layer.
 */

type JourneyEdgeClassState = {
  isSelected: boolean
  isPlayerEdge: boolean
  isFlowAnimated: boolean
  isDimmed: boolean
  isDraggingToJourney?: boolean
}

export const resolveJourneyEdgeClassName = ({
  isSelected,
  isPlayerEdge,
  isFlowAnimated,
  isDimmed,
  isDraggingToJourney = false,
}: JourneyEdgeClassState): string =>
  [
    'edge',
    isSelected ? 'edge-selected' : '',
    isPlayerEdge ? 'edge-player-active' : '',
    isDimmed ? 'edge-dimmed' : '',
    isDraggingToJourney ? 'edge-journey-dragging' : '',
    'edge-flowing',
    isFlowAnimated ? 'edge-flowing-animated' : '',
  ]
    .filter(Boolean)
    .join(' ')
