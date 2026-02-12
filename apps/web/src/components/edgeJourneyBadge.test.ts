import { describe, expect, it } from 'vitest'
import {
  resolveEdgeJourneyBadge,
  resolveEdgeStepBadgeProgress,
  type EdgeJourneyMarker,
} from './edgeJourneyBadge'

const markers: EdgeJourneyMarker[] = [
  {
    journeyId: 'j_a',
    colorKey: '#2563eb',
    stepNumber: 3,
  },
  {
    journeyId: 'j_b',
    colorKey: '#16a34a',
    stepNumber: 2,
  },
  {
    journeyId: 'j_c',
    colorKey: '#9333ea',
    stepNumber: 4,
  },
]

describe('resolveEdgeJourneyBadge', () => {
  it('returns null when edge has no journey marker', () => {
    expect(
      resolveEdgeJourneyBadge([], {
        journeyFilterId: null,
        activeJourneyId: null,
        playerJourneyId: null,
      }),
    ).toBeNull()
  })

  it('prefers filter journey over others', () => {
    expect(
      resolveEdgeJourneyBadge(markers, {
        journeyFilterId: 'j_b',
        activeJourneyId: 'j_a',
        playerJourneyId: 'j_c',
      }),
    ).toEqual({
      stepNumber: 2,
      colorKey: '#16a34a',
    })
  })

  it('falls back to active journey when no filter', () => {
    expect(
      resolveEdgeJourneyBadge(markers, {
        journeyFilterId: null,
        activeJourneyId: 'j_a',
        playerJourneyId: 'j_c',
      }),
    ).toEqual({
      stepNumber: 3,
      colorKey: '#2563eb',
    })
  })

  it('falls back to player journey when no filter or active', () => {
    expect(
      resolveEdgeJourneyBadge(markers, {
        journeyFilterId: null,
        activeJourneyId: null,
        playerJourneyId: 'j_c',
      }),
    ).toEqual({
      stepNumber: 4,
      colorKey: '#9333ea',
    })
  })

  it('falls back to smallest step number when there is no selected context', () => {
    expect(
      resolveEdgeJourneyBadge(markers, {
        journeyFilterId: null,
        activeJourneyId: null,
        playerJourneyId: null,
      }),
    ).toEqual({
      stepNumber: 2,
      colorKey: '#16a34a',
    })
  })
})

describe('resolveEdgeStepBadgeProgress', () => {
  it('uses a progress value near edge start by default', () => {
    const progress = resolveEdgeStepBadgeProgress()
    expect(progress).toBeGreaterThanOrEqual(0.05)
    expect(progress).toBeLessThanOrEqual(0.2)
    expect(progress).toBeLessThan(0.5)
  })

  it('clamps custom progress to keep badge close to start', () => {
    expect(resolveEdgeStepBadgeProgress(0)).toBe(0.05)
    expect(resolveEdgeStepBadgeProgress(0.5)).toBe(0.2)
  })
})
