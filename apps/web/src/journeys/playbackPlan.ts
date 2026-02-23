/**
 * Purpose: Build a runtime playback plan (ticks/lanes) for linear and top-level threaded journeys.
 */

import type { JourneyModel, JourneyThread } from '../model/types'

export type JourneyPlaybackLaneKind = 'main' | 'thread'

export interface JourneyPlaybackTickStep {
  laneId: string
  laneKind: JourneyPlaybackLaneKind
  threadId?: string
  edgeId: string
  highlightNodes?: string[]
  n: number
}

export interface JourneyPlaybackTick {
  index: number
  steps: JourneyPlaybackTickStep[]
}

const byStepOrder = <T extends { n: number }>(left: T, right: T): number => left.n - right.n

export const sortJourneySteps = <T extends { n: number }>(steps: T[]): T[] =>
  steps.slice().sort(byStepOrder)

export const journeyHasParallelThreads = (journey: JourneyModel | undefined | null): boolean =>
  !!journey?.steps.some((step) => (step.threads?.length ?? 0) > 0)

type ActiveThreadLane = {
  id: string
  order: number
  steps: JourneyThread['steps']
  cursor: number
}

export const resolveJourneyPlaybackTicks = (
  journey: JourneyModel | undefined,
): JourneyPlaybackTick[] => {
  if (!journey) {
    return []
  }

  const mainSteps = sortJourneySteps(journey.steps)
  if (!mainSteps.length) {
    return []
  }

  const pendingThreadStarts = new Map<number, ActiveThreadLane[]>()
  let threadOrder = 0
  for (let anchorIndex = 0; anchorIndex < mainSteps.length; anchorIndex += 1) {
    const anchorStep = mainSteps[anchorIndex]
    for (const thread of anchorStep.threads ?? []) {
      const threadSteps = sortJourneySteps(thread.steps)
      const startMainIndex = anchorIndex + 1
      const bucket = pendingThreadStarts.get(startMainIndex) ?? []
      bucket.push({
        id: thread.id,
        order: threadOrder,
        steps: threadSteps,
        cursor: 0,
      })
      pendingThreadStarts.set(startMainIndex, bucket)
      threadOrder += 1
    }
  }

  let mainIndex = 0
  let activeThreads: ActiveThreadLane[] = []
  const ticks: JourneyPlaybackTick[] = []

  const activatePendingThreads = () => {
    const pending = pendingThreadStarts.get(mainIndex)
    if (!pending?.length) {
      return
    }
    activeThreads = [...activeThreads, ...pending].sort((left, right) => left.order - right.order)
    pendingThreadStarts.delete(mainIndex)
  }

  while (mainIndex < mainSteps.length || activeThreads.length > 0) {
    activatePendingThreads()
    const tickSteps: JourneyPlaybackTickStep[] = []

    if (mainIndex < mainSteps.length) {
      const mainStep = mainSteps[mainIndex]
      tickSteps.push({
        laneId: 'main',
        laneKind: 'main',
        edgeId: mainStep.edgeId,
        highlightNodes: mainStep.highlightNodes,
        n: mainStep.n,
      })
      mainIndex += 1
    }

    for (const lane of activeThreads) {
      const threadStep = lane.steps[lane.cursor]
      if (!threadStep) {
        continue
      }
      tickSteps.push({
        laneId: `thread:${lane.id}`,
        laneKind: 'thread',
        threadId: lane.id,
        edgeId: threadStep.edgeId,
        highlightNodes: threadStep.highlightNodes,
        n: threadStep.n,
      })
      lane.cursor += 1
    }

    activeThreads = activeThreads.filter((lane) => lane.cursor < lane.steps.length)

    if (!tickSteps.length) {
      continue
    }

    ticks.push({
      index: ticks.length,
      steps: tickSteps,
    })
  }

  return ticks
}

export const resolveJourneyPlaybackTick = (
  journey: JourneyModel | undefined,
  playerStepIndex: number,
): JourneyPlaybackTick | null => {
  const ticks = resolveJourneyPlaybackTicks(journey)
  return ticks[playerStepIndex] ?? null
}

export const resolveJourneyPlaybackLength = (journey: JourneyModel | undefined): number =>
  resolveJourneyPlaybackTicks(journey).length

export const resolveJourneyPrimaryTickStep = (
  tick: JourneyPlaybackTick | null | undefined,
): JourneyPlaybackTickStep | null =>
  tick?.steps.find((step) => step.laneKind === 'main') ?? tick?.steps[0] ?? null

export const resolveJourneyPlaybackEdgeIdsForTick = (
  journey: JourneyModel | undefined,
  playerStepIndex: number,
): string[] => {
  const tick = resolveJourneyPlaybackTick(journey, playerStepIndex)
  return tick?.steps.map((step) => step.edgeId) ?? []
}
