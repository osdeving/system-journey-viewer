/**
 * Purpose: Verify catalog behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  nodePresets,
  nodePresetsByCategory,
  resolveNodePreset,
  resolveTechPreset,
} from './catalog'

describe('preset catalog', () => {
  it('loads node presets grouped by category', () => {
    expect(nodePresets.length).toBeGreaterThan(0)
    expect(nodePresetsByCategory.C4.length).toBeGreaterThan(0)
    expect(nodePresetsByCategory.Infra.length).toBeGreaterThan(0)
    expect(nodePresetsByCategory.Hex.length).toBeGreaterThan(0)
  })

  it('resolves node and tech preset for container', () => {
    const nodePreset = resolveNodePreset('container')
    const techPreset = resolveTechPreset(nodePreset?.defaultTechId ?? '')

    expect(nodePreset?.label).toBe('Container')
    expect(techPreset?.label).toBe('Spring Boot')
  })
})
