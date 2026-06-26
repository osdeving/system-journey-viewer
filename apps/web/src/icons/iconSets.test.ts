/**
 * Purpose: Verify icon set identifiers remain stable for persisted UI preferences.
 */

import { describe, expect, it } from 'vitest'
import {
  APP_ICON_SET_OPTIONS,
  isAppIconSetId,
  resolveAppIconStrokeWidth,
} from './iconSets'

describe('iconSets', () => {
  it('exposes stable icon sets for UI preferences', () => {
    expect(APP_ICON_SET_OPTIONS.map((option) => option.id)).toEqual([
      'lucide',
      'lucideFine',
      'lucideCompact',
    ])
    expect(isAppIconSetId('lucideFine')).toBe(true)
    expect(isAppIconSetId('random')).toBe(false)
  })

  it('uses visibly distinct stroke weights per set', () => {
    expect(resolveAppIconStrokeWidth('lucideFine')).toBeLessThan(resolveAppIconStrokeWidth('lucide'))
    expect(resolveAppIconStrokeWidth('lucideCompact')).toBeGreaterThan(resolveAppIconStrokeWidth('lucide'))
  })
})
