/**
 * Purpose: Provide journey-specific logic for focus, playback labels, and timeline behavior.
 */

import type { EdgeModel, JourneyModel } from '../model/types'
import { resolveJourneyPlaybackTick, resolveJourneyPrimaryTickStep } from './playbackPlan'

export const resolvePlayerStepLabel = (
  journey: JourneyModel | undefined,
  edges: Record<string, EdgeModel>,
  playerStepIndex: number,
): string | null => {
  const tick = resolveJourneyPlaybackTick(journey, playerStepIndex)
  const primaryStep = resolveJourneyPrimaryTickStep(tick)
  if (!primaryStep) {
    return null
  }

  const labels = tick?.steps
    .map((step) => edges[step.edgeId]?.label.trim() || step.edgeId)
    .filter((label) => !!label) ?? []

  if (!labels.length) {
    return edges[primaryStep.edgeId]?.label.trim() || primaryStep.edgeId
  }

  if (labels.length === 1) {
    return labels[0]
  }

  return `${labels[0]} (+${labels.length - 1} parallel)`
}
