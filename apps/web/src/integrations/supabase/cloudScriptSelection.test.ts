/**
 * Purpose: Verify Supabase cloud script metadata formatting for the in-app picker UI.
 */

import { describe, expect, it } from 'vitest'
import { formatSupabaseCloudScriptUpdatedAt } from './cloudScriptSelection'

describe('formatSupabaseCloudScriptUpdatedAt', () => {
  it('renders ISO timestamps as stable UTC labels', () => {
    expect(formatSupabaseCloudScriptUpdatedAt('2026-03-02T15:30:00.000Z')).toBe('2026-03-02 15:30:00 UTC')
  })

  it('falls back to the original value when the timestamp is invalid', () => {
    expect(formatSupabaseCloudScriptUpdatedAt('not-a-date')).toBe('not-a-date')
  })
})
