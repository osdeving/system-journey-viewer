type JourneyEdgeClassState = {
  isSelected: boolean
  isPlayerEdge: boolean
  isFlowAnimated: boolean
  isDimmed: boolean
}

export const resolveJourneyEdgeClassName = ({
  isSelected,
  isPlayerEdge,
  isFlowAnimated,
  isDimmed,
}: JourneyEdgeClassState): string =>
  [
    'edge',
    isSelected ? 'edge-selected' : '',
    isPlayerEdge ? 'edge-player-active' : '',
    isDimmed ? 'edge-dimmed' : '',
    'edge-flowing',
    isFlowAnimated ? 'edge-flowing-animated' : '',
  ]
    .filter(Boolean)
    .join(' ')
