/**
 * Purpose: Verify pure journey thread editing helpers for timeline indent/outdent behavior.
 */

import { describe, expect, it } from 'vitest'
import type { JourneyModel } from '../model/types'
import {
  indentJourneyStepToThreadSteps,
  outdentJourneyThreadStepToMainSteps,
  resolveDefaultJourneyThreadIndentTarget,
  resolveJourneyThreadIndentTargets,
} from './threadEditing'

const buildJourney = (): JourneyModel => ({
  id: 'j_test',
  name: 'Thread edit',
  colorKey: '#2563eb',
  steps: [
    { n: 1, edgeId: 'e_a' },
    { n: 2, edgeId: 'e_b' },
    { n: 3, edgeId: 'e_c' },
  ],
  player: { loop: false, speedMs: 1000, pauseOnStep: false },
})

describe('resolveJourneyThreadIndentTargets', () => {
  it('offers previous and next main-step anchors for a middle step', () => {
    const targets = resolveJourneyThreadIndentTargets(buildJourney(), 'e_b')

    expect(targets).toEqual([
      { direction: 'previous', anchorEdgeId: 'e_a', anchorStepNumber: 1 },
      { direction: 'next', anchorEdgeId: 'e_c', anchorStepNumber: 3 },
    ])
    expect(resolveDefaultJourneyThreadIndentTarget(buildJourney(), 'e_b')?.anchorEdgeId).toBe('e_a')
  })

  it('does not offer nested-thread edits for a main step that already anchors threads', () => {
    const journey = buildJourney()
    journey.steps[1].threads = [{ id: 't_existing', steps: [{ n: 1, edgeId: 'e_t' }] }]

    expect(resolveJourneyThreadIndentTargets(journey, 'e_b')).toEqual([])
  })
})

describe('journey thread step transforms', () => {
  it('moves a main step under an explicit anchor and outdents it after that anchor', () => {
    const journey = buildJourney()
    const indented = indentJourneyStepToThreadSteps(journey, 'e_b', 'e_c')

    expect(indented?.map((step) => step.edgeId)).toEqual(['e_a', 'e_c'])
    expect(indented?.[1]?.threads?.[0]).toEqual({
      id: 't_e_b',
      steps: [{ n: 1, edgeId: 'e_b' }],
    })

    const outdented = outdentJourneyThreadStepToMainSteps(
      { ...journey, steps: indented ?? [] },
      't_e_b',
      'e_b',
    )
    expect(outdented?.map((step) => step.edgeId)).toEqual(['e_a', 'e_c', 'e_b'])
    expect(outdented?.some((step) => (step.threads?.length ?? 0) > 0)).toBe(false)
  })
})
