/**
 * Purpose: Verify player Step Timeline behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { resolveArrivalAdvance, resolveTravelProgress, STEP_ARRIVAL_HOLD_MS } from './playerStepTimeline'

describe('resolveTravelProgress', () => {
  it('uses speed duration and clamps between 0 and 1', () => {
    expect(resolveTravelProgress(0, 900)).toBe(0)
    expect(resolveTravelProgress(450, 900)).toBe(0.5)
    expect(resolveTravelProgress(1200, 900)).toBe(1)
  })

  it('respects minimum duration floor', () => {
    expect(resolveTravelProgress(60, 30)).toBe(0.5)
    expect(resolveTravelProgress(120, 30)).toBe(1)
  })
})

describe('resolveArrivalAdvance', () => {
  it('does not advance before reaching destination', () => {
    const result = resolveArrivalAdvance({
      travelProgress: 0.93,
      nowMs: 1000,
      arrivalStartedAtMs: null,
      alreadyAdvanced: false,
    })

    expect(result.arrivalStartedAtMs).toBeNull()
    expect(result.shouldAdvance).toBe(false)
  })

  it('starts arrival hold and advances only after hold time', () => {
    const atArrival = resolveArrivalAdvance({
      travelProgress: 1,
      nowMs: 1000,
      arrivalStartedAtMs: null,
      alreadyAdvanced: false,
    })
    expect(atArrival.arrivalStartedAtMs).toBe(1000)
    expect(atArrival.shouldAdvance).toBe(false)

    const beforeHold = resolveArrivalAdvance({
      travelProgress: 1,
      nowMs: 1000 + STEP_ARRIVAL_HOLD_MS - 1,
      arrivalStartedAtMs: atArrival.arrivalStartedAtMs,
      alreadyAdvanced: false,
    })
    expect(beforeHold.shouldAdvance).toBe(false)

    const afterHold = resolveArrivalAdvance({
      travelProgress: 1,
      nowMs: 1000 + STEP_ARRIVAL_HOLD_MS,
      arrivalStartedAtMs: atArrival.arrivalStartedAtMs,
      alreadyAdvanced: false,
    })
    expect(afterHold.shouldAdvance).toBe(true)
  })

  it('does not trigger multiple advances for the same step', () => {
    const result = resolveArrivalAdvance({
      travelProgress: 1,
      nowMs: 1200,
      arrivalStartedAtMs: 1000,
      alreadyAdvanced: true,
    })

    expect(result.arrivalStartedAtMs).toBe(1000)
    expect(result.shouldAdvance).toBe(false)
  })
})
