/**
 * Purpose: Verify player Step Label behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import type { EdgeModel, JourneyModel } from '../model/types'
import { resolvePlayerStepLabel } from './playerStepLabel'

const buildEdge = (id: string, label: string): EdgeModel => ({
  id,
  from: { nodeId: 'n_from' },
  to: { nodeId: 'n_to' },
  protocolPresetId: 'http',
  label,
  route: { kind: 'auto', points: [] },
  style: { dashed: false, thickness: 1, arrow: true },
})

const buildJourney = (steps: JourneyModel['steps']): JourneyModel => ({
  id: 'j_1',
  name: 'Checkout',
  colorKey: 'blue',
  steps,
  player: {
    loop: false,
    speedMs: 900,
    pauseOnStep: false,
  },
})

describe('resolvePlayerStepLabel', () => {
  it('returns null when no player journey is active', () => {
    const edges: Record<string, EdgeModel> = {}
    expect(resolvePlayerStepLabel(undefined, edges, 0)).toBeNull()
  })

  it('resolves step label using sorted journey order', () => {
    const journey = buildJourney([
      { n: 2, edgeId: 'e_2' },
      { n: 1, edgeId: 'e_1' },
    ])
    const edges: Record<string, EdgeModel> = {
      e_1: buildEdge('e_1', 'Gateway -> API'),
      e_2: buildEdge('e_2', 'API -> DB'),
    }

    expect(resolvePlayerStepLabel(journey, edges, 0)).toBe('Gateway -> API')
    expect(resolvePlayerStepLabel(journey, edges, 1)).toBe('API -> DB')
  })

  it('falls back to edge id when label is blank', () => {
    const journey = buildJourney([{ n: 1, edgeId: 'e_blank' }])
    const edges: Record<string, EdgeModel> = {
      e_blank: buildEdge('e_blank', '   '),
    }

    expect(resolvePlayerStepLabel(journey, edges, 0)).toBe('e_blank')
  })

  it('returns null when player index is out of range', () => {
    const journey = buildJourney([{ n: 1, edgeId: 'e_1' }])
    const edges: Record<string, EdgeModel> = {
      e_1: buildEdge('e_1', 'Gateway -> API'),
    }

    expect(resolvePlayerStepLabel(journey, edges, 3)).toBeNull()
  })
})
