/**
 * Purpose: Verify the UI technology icon catalog includes requested brand and generic presets.
 */

import { describe, expect, it } from 'vitest'
import {
  TECH_ICON_DRAG_MIME_TYPE,
  resolveTechIconDefinition,
  techIconDefinitions,
} from './techIconCatalog'

describe('techIconCatalog', () => {
  it('registers requested technology logos and generic architecture icons', () => {
    expect(TECH_ICON_DRAG_MIME_TYPE).toBe('application/x-sjv-tech-icon')
    for (const iconId of [
      'redis',
      'kafka',
      'spring-boot',
      'csharp',
      'java',
      'elasticsearch',
      'postgres',
      'docker',
      'kubernetes',
      'generic-container',
      'generic-component',
      'generic-boundary',
    ]) {
      expect(resolveTechIconDefinition(iconId)?.id).toBe(iconId)
    }
  })

  it('uses real SVG path data for Simple Icons backed brand presets', () => {
    const redis = resolveTechIconDefinition('redis')
    expect(redis?.source).toBe('simple-icons')
    expect(redis?.glyph.type).toBe('simple')
    expect(redis?.glyph.type === 'simple' ? redis.glyph.path.length : 0).toBeGreaterThan(40)
    expect(techIconDefinitions.length).toBeGreaterThan(40)
  })
})

