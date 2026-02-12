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

const MIN_EDGE_STEP_BADGE_PROGRESS = 0.05
const MAX_EDGE_STEP_BADGE_PROGRESS = 0.2
const DEFAULT_EDGE_STEP_BADGE_PROGRESS = 0.1

export const resolveEdgeStepBadgeProgress = (
  preferredProgress = DEFAULT_EDGE_STEP_BADGE_PROGRESS,
): number =>
  Math.max(
    MIN_EDGE_STEP_BADGE_PROGRESS,
    Math.min(MAX_EDGE_STEP_BADGE_PROGRESS, preferredProgress),
  )

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
