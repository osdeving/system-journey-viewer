/**
 * Purpose: Provide pure journey thread editing helpers that preserve SJV Script thread semantics.
 */

import type { JourneyModel, JourneyStep, JourneyThread } from '../model/types'
import { sortJourneySteps } from './playbackPlan'

export type JourneyThreadIndentTargetDirection = 'previous' | 'next'

export type JourneyThreadIndentTarget = {
  direction: JourneyThreadIndentTargetDirection
  anchorEdgeId: string
  anchorStepNumber: number
}

const cloneThreadSteps = (steps: JourneyThread['steps']): JourneyThread['steps'] =>
  steps
    .slice()
    .sort((left, right) => left.n - right.n)
    .map((step, index) => ({
      ...step,
      n: index + 1,
    }))

const cloneThread = (thread: JourneyThread): JourneyThread => ({
  id: thread.id,
  steps: cloneThreadSteps(thread.steps),
})

const cloneStep = (step: JourneyStep): JourneyStep => {
  const threads = (step.threads ?? [])
    .map(cloneThread)
    .filter((thread) => thread.steps.length > 0)
  return {
    ...step,
    ...(threads.length ? { threads } : {}),
  }
}

const normalizeJourneyStepsWithThreads = (steps: JourneyStep[]): JourneyStep[] =>
  steps.map((step, index) => {
    const threads = (step.threads ?? [])
      .map(cloneThread)
      .filter((thread) => thread.steps.length > 0)
    const normalized: JourneyStep = {
      ...step,
      n: index + 1,
    }
    if (threads.length) {
      normalized.threads = threads
    } else {
      delete normalized.threads
    }
    return normalized
  })

const sanitizeThreadTokenPart = (value: string): string =>
  value
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'step'

const collectThreadIds = (journey: JourneyModel): Set<string> => {
  const ids = new Set<string>()
  for (const step of journey.steps) {
    for (const thread of step.threads ?? []) {
      ids.add(thread.id)
    }
  }
  return ids
}

const resolveUniqueThreadId = (journey: JourneyModel, sourceEdgeId: string): string => {
  const usedIds = collectThreadIds(journey)
  const base = `t_${sanitizeThreadTokenPart(sourceEdgeId)}`
  if (!usedIds.has(base)) {
    return base
  }
  let suffix = 2
  while (usedIds.has(`${base}_${suffix}`)) {
    suffix += 1
  }
  return `${base}_${suffix}`
}

export const resolveJourneyThreadIndentTargets = (
  journey: JourneyModel | undefined,
  edgeId: string,
): JourneyThreadIndentTarget[] => {
  if (!journey) {
    return []
  }

  const ordered = sortJourneySteps(journey.steps)
  const sourceIndex = ordered.findIndex((step) => step.edgeId === edgeId)
  const sourceStep = ordered[sourceIndex]
  if (sourceIndex < 0 || !sourceStep || (sourceStep.threads?.length ?? 0) > 0) {
    return []
  }

  const targets: JourneyThreadIndentTarget[] = []
  const previousStep = ordered[sourceIndex - 1]
  if (previousStep) {
    targets.push({
      direction: 'previous',
      anchorEdgeId: previousStep.edgeId,
      anchorStepNumber: previousStep.n,
    })
  }

  const nextStep = ordered[sourceIndex + 1]
  if (nextStep) {
    targets.push({
      direction: 'next',
      anchorEdgeId: nextStep.edgeId,
      anchorStepNumber: nextStep.n,
    })
  }

  return targets
}

export const resolveDefaultJourneyThreadIndentTarget = (
  journey: JourneyModel | undefined,
  edgeId: string,
): JourneyThreadIndentTarget | null => {
  const targets = resolveJourneyThreadIndentTargets(journey, edgeId)
  return targets.find((target) => target.direction === 'previous') ?? null
}

export const indentJourneyStepToThreadSteps = (
  journey: JourneyModel | undefined,
  edgeId: string,
  anchorEdgeId?: string,
): JourneyStep[] | null => {
  if (!journey) {
    return null
  }

  const ordered = sortJourneySteps(journey.steps).map(cloneStep)
  const sourceIndex = ordered.findIndex((step) => step.edgeId === edgeId)
  const sourceStep = ordered[sourceIndex]
  if (sourceIndex < 0 || !sourceStep || (sourceStep.threads?.length ?? 0) > 0) {
    return null
  }

  const target = (anchorEdgeId
    ? resolveJourneyThreadIndentTargets(journey, edgeId).find(
        (candidate) => candidate.anchorEdgeId === anchorEdgeId,
      )
    : resolveDefaultJourneyThreadIndentTarget(journey, edgeId)) ?? null
  if (!target || target.anchorEdgeId === edgeId) {
    return null
  }

  const nextSteps = ordered.filter((step) => step.edgeId !== edgeId)
  const anchorIndex = nextSteps.findIndex((step) => step.edgeId === target.anchorEdgeId)
  const anchorStep = nextSteps[anchorIndex]
  if (anchorIndex < 0 || !anchorStep) {
    return null
  }

  const movedThreadStep: JourneyThread['steps'][number] = {
    n: 1,
    edgeId: sourceStep.edgeId,
    ...(sourceStep.highlightNodes ? { highlightNodes: [...sourceStep.highlightNodes] } : {}),
  }
  const thread: JourneyThread = {
    id: resolveUniqueThreadId(journey, sourceStep.edgeId),
    steps: [movedThreadStep],
  }
  nextSteps[anchorIndex] = {
    ...anchorStep,
    threads: [...(anchorStep.threads ?? []).map(cloneThread), thread],
  }

  return normalizeJourneyStepsWithThreads(nextSteps)
}

export const outdentJourneyThreadStepToMainSteps = (
  journey: JourneyModel | undefined,
  threadId: string,
  edgeId: string,
): JourneyStep[] | null => {
  if (!journey) {
    return null
  }

  const ordered = sortJourneySteps(journey.steps).map(cloneStep)
  for (let anchorIndex = 0; anchorIndex < ordered.length; anchorIndex += 1) {
    const anchorStep = ordered[anchorIndex]
    const threadIndex = (anchorStep.threads ?? []).findIndex((thread) => thread.id === threadId)
    const thread = anchorStep.threads?.[threadIndex]
    if (!thread) {
      continue
    }

    const threadStepIndex = thread.steps.findIndex((step) => step.edgeId === edgeId)
    const threadStep = thread.steps[threadStepIndex]
    if (!threadStep) {
      continue
    }

    const updatedThreads = (anchorStep.threads ?? [])
      .map((candidate, candidateIndex) => {
        if (candidateIndex !== threadIndex) {
          return cloneThread(candidate)
        }
        return {
          ...candidate,
          steps: cloneThreadSteps(candidate.steps.filter((_, index) => index !== threadStepIndex)),
        }
      })
      .filter((candidate) => candidate.steps.length > 0)

    if (updatedThreads.length) {
      anchorStep.threads = updatedThreads
    } else {
      delete anchorStep.threads
    }

    const mainStep: JourneyStep = {
      n: anchorStep.n + 1,
      edgeId: threadStep.edgeId,
      ...(threadStep.highlightNodes ? { highlightNodes: [...threadStep.highlightNodes] } : {}),
    }
    ordered.splice(anchorIndex + 1, 0, mainStep)
    return normalizeJourneyStepsWithThreads(ordered)
  }

  return null
}

export const removeEdgeFromJourneySteps = (
  journey: JourneyModel | undefined,
  edgeId: string,
): JourneyStep[] | null => {
  if (!journey) {
    return null
  }

  let removed = false
  const steps = sortJourneySteps(journey.steps)
    .filter((step) => {
      const keep = step.edgeId !== edgeId
      if (!keep) {
        removed = true
      }
      return keep
    })
    .map((step) => {
      const filteredThreads = (step.threads ?? [])
        .map((thread) => {
          const filteredSteps = thread.steps.filter((threadStep) => {
            const keep = threadStep.edgeId !== edgeId
            if (!keep) {
              removed = true
            }
            return keep
          })
          return {
            ...thread,
            steps: filteredSteps,
          }
        })
        .filter((thread) => thread.steps.length > 0)
      const normalizedStep: JourneyStep = {
        ...step,
      }
      if (filteredThreads.length) {
        normalizedStep.threads = filteredThreads
      } else {
        delete normalizedStep.threads
      }
      return normalizedStep
    })

  return removed ? normalizeJourneyStepsWithThreads(steps) : null
}
