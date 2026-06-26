/**
 * Purpose: Verify catalog behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { CYLINDER_NODE_MAX_WIDTH_TO_HEIGHT_RATIO } from '../diagram/nodes/nodeShapePaths'
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

  it('keeps db and kafka cylinder presets within the compact aspect limit', () => {
    for (const presetId of ['db', 'queue']) {
      const nodePreset = resolveNodePreset(presetId)

      expect(nodePreset).toBeDefined()
      expect((nodePreset?.defaultWidth ?? 0) / (nodePreset?.defaultHeight ?? 1)).toBeLessThanOrEqual(
        CYLINDER_NODE_MAX_WIDTH_TO_HEIGHT_RATIO,
      )
    }
  })
})
