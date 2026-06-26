/**
 * Purpose: Verify centralized icon registry rendering for chrome and palette icons.
 */

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppIcon, PresetIcon } from './IconRegistry'
import { iconRegistryComponents, presetIconGlyphForKey } from './iconRegistryData'

describe('IconRegistry', () => {
  it('renders app icons through a central registry and icon set profile', () => {
    const markup = renderToStaticMarkup(<AppIcon id="search" iconSet="lucideFine" />)

    expect(markup).toContain('<svg')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('renders preset icons without emoji dependency', () => {
    const markup = renderToStaticMarkup(<PresetIcon iconKey="gateway" iconSet="lucideCompact" />)

    expect(markup).toContain('<svg')
    expect(presetIconGlyphForKey('gateway')).toBe('◎')
    expect(presetIconGlyphForKey('unknown')).toBe('□')
  })

  it('keeps chrome and preset icon IDs centralized', () => {
    expect(iconRegistryComponents.app.search).toBeDefined()
    expect(iconRegistryComponents.preset.gateway).toBeDefined()
  })
})
