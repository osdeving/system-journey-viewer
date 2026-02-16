type JourneyEdgeClassState = {
  isSelected: boolean
  isPlayerEdge: boolean
  isFlowAnimated: boolean
}

export const resolveJourneyEdgeClassName = ({
  isSelected,
  isPlayerEdge,
  isFlowAnimated,
}: JourneyEdgeClassState): string =>
  [
    'edge',
    isSelected ? 'edge-selected' : '',
    isPlayerEdge ? 'edge-player-active' : '',
    'edge-flowing',
    isFlowAnimated ? 'edge-flowing-animated' : '',
  ]
    .filter(Boolean)
    .join(' ')
