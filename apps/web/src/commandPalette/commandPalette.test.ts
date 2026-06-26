/**
 * Purpose: Verify command-palette ranking and filtering behavior.
 */

import { describe, expect, it } from 'vitest'
import { filterCommandPaletteItems, type CommandPaletteItem } from './commandPalette'

const items: CommandPaletteItem[] = [
  {
    id: 'command:auto-arrange',
    title: 'Auto Arrange Current View',
    section: 'Commands',
    keywords: ['layout', 'diagram'],
    shortcut: 'Ctrl+Shift+L',
  },
  {
    id: 'node:checkout-api',
    title: 'Checkout API',
    section: 'Nodes',
    subtitle: 'Open node in Container view',
    keywords: ['service', 'api'],
  },
  {
    id: 'view:component',
    title: 'Payment Components',
    section: 'Views',
    subtitle: 'Open component layer',
  },
  {
    id: 'command:cloud-save',
    title: 'Save to Supabase Cloud',
    section: 'Commands',
    disabled: true,
  },
]

describe('filterCommandPaletteItems', () => {
  it('returns the original order for an empty query', () => {
    expect(filterCommandPaletteItems(items, '').map((item) => item.id)).toEqual([
      'command:auto-arrange',
      'node:checkout-api',
      'view:component',
      'command:cloud-save',
    ])
  })

  it('matches titles, sections, subtitles, shortcuts, and keywords', () => {
    expect(filterCommandPaletteItems(items, 'api').map((item) => item.id)).toEqual(['node:checkout-api'])
    expect(filterCommandPaletteItems(items, 'component layer').map((item) => item.id)).toEqual(['view:component'])
    expect(filterCommandPaletteItems(items, 'ctrl shift').map((item) => item.id)).toEqual(['command:auto-arrange'])
    expect(filterCommandPaletteItems(items, 'diagram').map((item) => item.id)).toEqual(['command:auto-arrange'])
  })

  it('keeps disabled items searchable but ranks enabled matches first', () => {
    expect(filterCommandPaletteItems(items, 'save').map((item) => item.id)).toEqual(['command:cloud-save'])
    expect(filterCommandPaletteItems(items, 'commands').map((item) => item.id)).toEqual([
      'command:auto-arrange',
      'command:cloud-save',
    ])
  })

  it('respects the result limit', () => {
    expect(filterCommandPaletteItems(items, '', 2).map((item) => item.id)).toEqual([
      'command:auto-arrange',
      'node:checkout-api',
    ])
  })
})
