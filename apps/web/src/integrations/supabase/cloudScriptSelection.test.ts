/**
 * Purpose: Verify Supabase cloud script prompt formatting and selection parsing.
 */

import { describe, expect, it } from 'vitest'
import {
  buildSupabaseCloudScriptSelectionPrompt,
  resolveSupabaseCloudScriptSelection,
} from './cloudScriptSelection'

const sampleScripts = [
  {
    workspaceId: 'orders-platform',
    title: 'Orders Platform Script',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    workspaceId: 'billing-platform',
    title: 'Billing Platform Script',
    updatedAt: '2026-03-02T15:30:00.000Z',
  },
]

describe('buildSupabaseCloudScriptSelectionPrompt', () => {
  it('renders a numbered prompt with stable UTC timestamps', () => {
    expect(buildSupabaseCloudScriptSelectionPrompt(sampleScripts)).toBe(
      [
        'Choose a Supabase SJV Script to load. Enter the script number:',
        '1. Orders Platform Script (updated 2026-03-01 00:00:00 UTC)',
        '2. Billing Platform Script (updated 2026-03-02 15:30:00 UTC)',
      ].join('\n'),
    )
  })
})

describe('resolveSupabaseCloudScriptSelection', () => {
  it('returns the selected script for a valid 1-based index', () => {
    expect(resolveSupabaseCloudScriptSelection(sampleScripts, '2')).toEqual(sampleScripts[1])
  })

  it('returns null when the prompt is canceled', () => {
    expect(resolveSupabaseCloudScriptSelection(sampleScripts, null)).toBeNull()
  })

  it('rejects invalid script numbers', () => {
    expect(() => resolveSupabaseCloudScriptSelection(sampleScripts, '99')).toThrow(
      'Choose a valid script number from the list.',
    )
    expect(() => resolveSupabaseCloudScriptSelection(sampleScripts, '')).toThrow('Enter a script number.')
  })
})
