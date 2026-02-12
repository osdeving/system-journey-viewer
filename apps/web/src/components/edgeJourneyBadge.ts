export interface EdgeJourneyMarker {
  journeyId: string
  colorKey: string
  stepNumber: number
}

export interface EdgeJourneyBadgeContext {
  journeyFilterId: string | null
  activeJourneyId: string | null
  playerJourneyId: string | null
}

export interface EdgeJourneyBadge {
  stepNumber: number
  colorKey: string
}

export const resolveEdgeJourneyBadge = (
  markers: EdgeJourneyMarker[],
  context: EdgeJourneyBadgeContext,
): EdgeJourneyBadge | null => {
  if (markers.length === 0) {
    return null
  }

  const byJourney = (journeyId: string | null): EdgeJourneyMarker | null => {
    if (!journeyId) {
      return null
    }
    return markers.find((marker) => marker.journeyId === journeyId) ?? null
  }

  const winner =
    byJourney(context.journeyFilterId) ??
    byJourney(context.activeJourneyId) ??
    byJourney(context.playerJourneyId) ??
    (markers.length === 1
      ? markers[0]
      : markers
          .slice()
          .sort((left, right) => left.stepNumber - right.stepNumber)[0])

  return {
    stepNumber: winner.stepNumber,
    colorKey: winner.colorKey,
  }
}
