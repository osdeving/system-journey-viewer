/**
 * Purpose: Verify timeline row generation for linear and threaded journey playback views.
 */

import { describe, expect, it } from 'vitest'
import type { JourneyModel } from '../model/types'
import { deriveThreadTimelineColor, resolveJourneyTimelineRows } from './timelineRows'

const threadedJourney: JourneyModel = {
  id: 'j_1',
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
          ],
        },
      ],
    },
    { n: 3, edgeId: 'e_3' },
  ],
  player: { loop: true, speedMs: 1000, pauseOnStep: false },
}

describe('resolveJourneyTimelineRows', () => {
  it('keeps linear journeys as single-row ticks', () => {
    const journey: JourneyModel = {
      ...threadedJourney,
      steps: [
        { n: 1, edgeId: 'e_1' },
        { n: 2, edgeId: 'e_2' },
      ],
    }
    const rows = resolveJourneyTimelineRows(journey)
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.showTickBadge)).toBe(true)
    expect(rows.map((row) => row.edgeId)).toEqual(['e_1', 'e_2'])
  })

  it('emits grouped rows for threaded ticks with thread rows after main rows', () => {
    const rows = resolveJourneyTimelineRows(threadedJourney)
    expect(rows.map((row) => [row.tickIndex, row.laneKind, row.edgeId, row.showTickBadge])).toEqual([
      [0, 'main', 'e_1', true],
      [1, 'main', 'e_2', true],
      [2, 'main', 'e_3', true],
      [2, 'thread', 'e_t1_1', false],
      [3, 'thread', 'e_t1_2', true],
    ])
    expect(rows[3]?.threadId).toBe('t_1')
    expect(rows[3]?.tickStepCount).toBe(2)
  })
})

describe('deriveThreadTimelineColor', () => {
  it('returns a stable derived tone distinct from the base for valid hex colors', () => {
    const derived = deriveThreadTimelineColor('#2563eb', 0)
    expect(derived).toMatch(/^#[0-9a-f]{6}$/i)
    expect(derived.toLowerCase()).not.toBe('#2563eb')
  })

  it('falls back to the original value for unsupported color formats', () => {
    expect(deriveThreadTimelineColor('var(--x)', 1)).toBe('var(--x)')
  })
})

