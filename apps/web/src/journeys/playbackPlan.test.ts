/**
 * Purpose: Verify journey playback tick planning for linear and top-level threaded journeys.
 */

import { describe, expect, it } from 'vitest'
import type { JourneyModel } from '../model/types'
import {
  journeyHasParallelThreads,
  resolveJourneyPlaybackLength,
  resolveJourneyPlaybackTick,
  resolveJourneyPlaybackTicks,
  resolveJourneyPrimaryTickStep,
} from './playbackPlan'

const linearJourney: JourneyModel = {
  id: 'j_linear',
  name: 'Linear',
  colorKey: '#2563eb',
  steps: [
    { n: 1, edgeId: 'e_1' },
    { n: 2, edgeId: 'e_2' },
    { n: 3, edgeId: 'e_3' },
  ],
  player: { loop: true, speedMs: 800, pauseOnStep: false },
}

const threadedJourney: JourneyModel = {
  id: 'j_threaded',
  name: 'Threaded',
  colorKey: '#2563eb',
  steps: [
    { n: 1, edgeId: 'e_1' },
    {
      n: 2,
      edgeId: 'e_2',
      threads: [
        {
          id: 't_1',
          steps: [
            { n: 1, edgeId: 'e_t1_1' },
            { n: 2, edgeId: 'e_t1_2' },
            { n: 3, edgeId: 'e_t1_3' },
          ],
        },
      ],
    },
    { n: 3, edgeId: 'e_3' },
    { n: 4, edgeId: 'e_4' },
  ],
  player: { loop: true, speedMs: 800, pauseOnStep: false },
}

describe('journey playback plan', () => {
  it('keeps linear journeys one step per tick', () => {
    const ticks = resolveJourneyPlaybackTicks(linearJourney)
    expect(ticks.map((tick) => tick.steps.map((step) => step.edgeId))).toEqual([
      ['e_1'],
      ['e_2'],
      ['e_3'],
    ])
    expect(resolveJourneyPlaybackLength(linearJourney)).toBe(3)
    expect(journeyHasParallelThreads(linearJourney)).toBe(false)
  })

  it('starts a top-level thread after the anchor main step and advances in parallel by tick', () => {
    const ticks = resolveJourneyPlaybackTicks(threadedJourney)

    expect(ticks.map((tick) => tick.steps.map((step) => step.edgeId))).toEqual([
      ['e_1'],
      ['e_2'],
      ['e_3', 'e_t1_1'],
      ['e_4', 'e_t1_2'],
      ['e_t1_3'],
    ])

    expect(resolveJourneyPlaybackLength(threadedJourney)).toBe(5)
    expect(resolveJourneyPlaybackTick(threadedJourney, 2)?.steps[1]?.threadId).toBe('t_1')
    expect(resolveJourneyPrimaryTickStep(resolveJourneyPlaybackTick(threadedJourney, 4))?.edgeId).toBe('e_t1_3')
    expect(journeyHasParallelThreads(threadedJourney)).toBe(true)
  })

  it('supports multiple threads attached to the same anchor preserving declaration order', () => {
    const journey: JourneyModel = {
      ...threadedJourney,
      steps: [
        { n: 1, edgeId: 'e_1' },
        {
          n: 2,
          edgeId: 'e_2',
          threads: [
            { id: 't_a', steps: [{ n: 1, edgeId: 'e_a1' }] },
            { id: 't_b', steps: [{ n: 1, edgeId: 'e_b1' }] },
          ],
        },
        { n: 3, edgeId: 'e_3' },
      ],
    }

    const ticks = resolveJourneyPlaybackTicks(journey)
    expect(ticks[2]?.steps.map((step) => `${step.laneKind}:${step.threadId ?? 'main'}:${step.edgeId}`)).toEqual([
      'main:main:e_3',
      'thread:t_a:e_a1',
      'thread:t_b:e_b1',
    ])
  })

  it('starts threads later when they are attached to a later main step anchor', () => {
    const journey: JourneyModel = {
      ...threadedJourney,
      steps: [
        { n: 1, edgeId: 'e_1' },
        {
          n: 2,
          edgeId: 'e_2',
          threads: [{ id: 't_early', steps: [{ n: 1, edgeId: 'e_te_1' }, { n: 2, edgeId: 'e_te_2' }] }],
        },
        { n: 3, edgeId: 'e_3' },
        {
          n: 4,
          edgeId: 'e_4',
          threads: [{ id: 't_late', steps: [{ n: 1, edgeId: 'e_tl_1' }, { n: 2, edgeId: 'e_tl_2' }] }],
        },
        { n: 5, edgeId: 'e_5' },
        { n: 6, edgeId: 'e_6' },
      ],
    }

    const ticks = resolveJourneyPlaybackTicks(journey)
    expect(ticks.map((tick) => tick.steps.map((step) => step.edgeId))).toEqual([
      ['e_1'],
      ['e_2'],
      ['e_3', 'e_te_1'],
      ['e_4', 'e_te_2'],
      ['e_5', 'e_tl_1'],
      ['e_6', 'e_tl_2'],
    ])
  })
})
