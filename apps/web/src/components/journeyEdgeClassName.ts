type JourneyEdgeClassState = {
  isSelected: boolean
  isPlayerEdge: boolean
}

export const resolveJourneyEdgeClassName = ({
  isSelected,
  isPlayerEdge,
}: JourneyEdgeClassState): string =>
  ['edge', isSelected ? 'edge-selected' : '', isPlayerEdge ? 'edge-player-active' : '', 'edge-flowing']
    .filter(Boolean)
    .join(' ')
