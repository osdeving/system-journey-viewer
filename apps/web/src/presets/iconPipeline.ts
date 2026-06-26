/**
 * Purpose: Provide stable canvas glyph fallbacks for preset icon keys.
 */

import { presetIconGlyphForKey } from '../icons/iconRegistryData'

export const iconForKey = (key?: string): string => {
  return presetIconGlyphForKey(key)
}
