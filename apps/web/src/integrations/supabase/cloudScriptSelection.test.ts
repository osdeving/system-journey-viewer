/**
 * Purpose: Verify Supabase cloud script metadata formatting for the in-app picker UI.
 */

import { describe, expect, it } from 'vitest'
import { filterSupabaseCloudScripts, formatSupabaseCloudScriptUpdatedAt } from './cloudScriptSelection'

const sampleScripts = [
  {
    workspaceId: 'orders-platform',
    title: 'Orders Platform Script',
    updatedAt: '2026-03-02T15:30:00.000Z',
  },
  {
    workspaceId: 'billing-read-model',
    title: 'Billing Projection Script',
    updatedAt: '2026-03-01T12:00:00.000Z',
  },
]

describe('formatSupabaseCloudScriptUpdatedAt', () => {
  it('renders ISO timestamps as stable UTC labels', () => {
    expect(formatSupabaseCloudScriptUpdatedAt('2026-03-02T15:30:00.000Z')).toBe('2026-03-02 15:30:00 UTC')
  })

  it('falls back to the original value when the timestamp is invalid', () => {
    expect(formatSupabaseCloudScriptUpdatedAt('not-a-date')).toBe('not-a-date')
  })
})

describe('filterSupabaseCloudScripts', () => {
  it('matches scripts by title or workspace id, case-insensitively', () => {
    expect(filterSupabaseCloudScripts(sampleScripts, 'billing')).toEqual([sampleScripts[1]])
    expect(filterSupabaseCloudScripts(sampleScripts, 'ORDERS')).toEqual([sampleScripts[0]])
  })

  it('returns the original list when the search is blank', () => {
    expect(filterSupabaseCloudScripts(sampleScripts, '   ')).toEqual(sampleScripts)
  })
})
