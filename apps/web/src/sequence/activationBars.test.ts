/**
 * Purpose: Verify activation-bar segment inference for sequence-diagram message placements.
 */

import { describe, expect, it } from 'vitest'
import { resolveSequenceActivationSegments } from './activationBars'

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
})

