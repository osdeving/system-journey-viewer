/**
 * Purpose: Verify activation-bar segment inference for sequence-diagram message placements.
 */

import { describe, expect, it } from 'vitest'
import { resolveSequenceActivationRowSlice, resolveSequenceActivationSegments } from './activationBars'

describe('resolveSequenceActivationSegments', () => {
  it('marks both source and target participants as active for a message placement', () => {
    const segments = resolveSequenceActivationSegments([
      {
        fromParticipantId: 'p_guardian',
        toParticipantId: 'p_cim',
        y: 100,
        height: 56,
      },
    ])

    expect(segments).toEqual([
      { participantId: 'p_cim', startY: 114, endY: 148 },
      { participantId: 'p_guardian', startY: 114, endY: 148 },
    ])
  })

  it('merges nearby activity windows into a continuous activation bar', () => {
    const segments = resolveSequenceActivationSegments(
      [
        { fromParticipantId: 'p_a', toParticipantId: 'p_b', y: 100, height: 56 },
        { fromParticipantId: 'p_b', toParticipantId: 'p_c', y: 164, height: 56 },
      ],
      { mergeGap: 32 },
    )

    expect(segments).toContainEqual({ participantId: 'p_b', startY: 114, endY: 212 })
  })

  it('does not duplicate intervals for self messages', () => {
    const segments = resolveSequenceActivationSegments([
      { fromParticipantId: 'p_cim', toParticipantId: 'p_cim', y: 200, height: 64 },
    ])

    expect(segments).toEqual([{ participantId: 'p_cim', startY: 214, endY: 256 }])
  })

  it('can extend row slices with bleed so activation bars stay visually connected across row gaps', () => {
    const segment = { participantId: 'p_cim', startY: 114, endY: 212 }

    const firstSlice = resolveSequenceActivationRowSlice(segment, 100, 56, {
      topBleed: 0,
      bottomBleed: 8,
    })
    const secondSlice = resolveSequenceActivationRowSlice(segment, 164, 56, {
      topBleed: 8,
      bottomBleed: 0,
    })

    expect(firstSlice).toEqual({ y: 114, height: 50 })
    expect(secondSlice).toEqual({ y: 156, height: 56 })
    expect(firstSlice && secondSlice ? firstSlice.y + firstSlice.height : 0).toBeGreaterThanOrEqual(secondSlice?.y ?? 0)
  })
})
