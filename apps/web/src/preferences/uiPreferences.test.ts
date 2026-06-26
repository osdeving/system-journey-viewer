/**
 * Purpose: Verify backward-compatible parsing for persisted UI preferences.
 */

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UI_PREFERENCES,
  parseUiPreferencesCandidate,
  resolveUiPreferenceCssVariables,
} from './uiPreferences'

describe('uiPreferences', () => {
  it('hydrates older preference payloads with additive appearance defaults', () => {
    const preferences = parseUiPreferencesCandidate({
      tooltipsEnabled: false,
      minimapEnabled: false,
      density: 'comfortable',
      toolbarVisibility: {
        navigation: false,
      },
    })

    expect(preferences.tooltipsEnabled).toBe(false)
    expect(preferences.minimapEnabled).toBe(false)
    expect(preferences.density).toBe('comfortable')
    expect(preferences.toolbarVisibility.navigation).toBe(false)
    expect(preferences.toolbarVisibility.editing).toBe(true)
    expect(preferences.fontScale).toBe(DEFAULT_UI_PREFERENCES.fontScale)
    expect(preferences.chromeThemeId).toBe('midnight')
    expect(preferences.iconSet).toBe('lucide')
    expect(preferences.menuBarVisible).toBe(true)
    expect(preferences.toolbarInlineWithBrand).toBe(false)
  })

  it('rejects invalid custom colors and icon set values safely', () => {
    const preferences = parseUiPreferencesCandidate({
      fontScale: 'huge',
      chromeThemeId: 'unknown',
      iconSet: 'random',
      menuBarVisible: 'yes',
      toolbarInlineWithBrand: 'please',
      customChromeColors: {
        shellBackground: 'black',
        panelBackground: '#222222',
      },
    })

    expect(preferences.fontScale).toBe('normal')
    expect(preferences.chromeThemeId).toBe('midnight')
    expect(preferences.iconSet).toBe('lucide')
    expect(preferences.menuBarVisible).toBe(true)
    expect(preferences.toolbarInlineWithBrand).toBe(false)
    expect(preferences.customChromeColors.shellBackground).toBe('#101923')
    expect(preferences.customChromeColors.panelBackground).toBe('#222222')
  })

  it('resolves CSS variables for selected font scale and chrome colors', () => {
    const preferences = parseUiPreferencesCandidate({
      fontScale: 'large',
      chromeThemeId: 'custom',
      customChromeColors: {
        shellBackground: '#111111',
        panelBackground: '#222222',
        controlBackground: '#333333',
        accentColor: '#44aaee',
        textColor: '#eeeeee',
        mutedTextColor: '#aaaaaa',
        borderColor: '#555555',
      },
    })

    expect(resolveUiPreferenceCssVariables(preferences)).toMatchObject({
      '--sjv-ui-font-scale': '1.12',
      '--sjv-shell-bg': '#111111',
      '--sjv-shell-panel-bg': '#222222',
      '--sjv-shell-control-bg': '#333333',
      '--sjv-shell-control-text': '#eeeeee',
      '--sjv-shell-accent': '#44aaee',
    })
  })
})
