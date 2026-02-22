/**
 * Purpose: Provide journey-specific logic for focus, playback labels, and timeline behavior.
 */

import type { EdgeModel, JourneyModel, JourneyStep } from '../model/types'

const byStepOrder = (left: JourneyStep, right: JourneyStep): number => left.n - right.n

const resolveCurrentJourneyStep = (
  journey: JourneyModel | undefined,
  playerStepIndex: number,
): JourneyStep | null => {
  if (!journey) {
    return null
  }
  const sortedSteps = journey.steps.slice().sort(byStepOrder)
  return sortedSteps[playerStepIndex] ?? null
}

export const resolvePlayerStepLabel = (
  journey: JourneyModel | undefined,
  edges: Record<string, EdgeModel>,
  playerStepIndex: number,
): string | null => {
  const currentStep = resolveCurrentJourneyStep(journey, playerStepIndex)
  if (!currentStep) {
    return null
  }

  const edgeLabel = edges[currentStep.edgeId]?.label.trim()
  if (edgeLabel) {
    return edgeLabel
  }

  return currentStep.edgeId
}
