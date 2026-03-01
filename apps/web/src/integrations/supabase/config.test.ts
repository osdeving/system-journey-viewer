/**
 * Purpose: Verify Supabase public env resolution and fallback alias behavior.
 */

import { describe, expect, it } from 'vitest'
import { resolveSupabasePublicConfig } from './config'

describe('resolveSupabasePublicConfig', () => {
  it('prefers explicit VITE env values', () => {
    const config = resolveSupabasePublicConfig(
      {
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
        VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'ignored',
      },
      {
        url: 'https://fallback.supabase.co',
        publishableKey: 'fallback-key',
      },
    )

    expect(config).toEqual({
      url: 'https://project.supabase.co',
      publishableKey: 'anon-key',
    })
  })

  it('supports the Vercel integration key alias when the standard key is absent', () => {
    const config = resolveSupabasePublicConfig(
      {
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'publishable-key',
      },
      {},
    )

    expect(config).toEqual({
      url: 'https://project.supabase.co',
      publishableKey: 'publishable-key',
    })
  })

  it('falls back to safe build-time shims when VITE envs are missing', () => {
    const config = resolveSupabasePublicConfig(
      {},
      {
        url: 'https://fallback.supabase.co',
        publishableKey: 'fallback-key',
      },
    )

    expect(config).toEqual({
      url: 'https://fallback.supabase.co',
      publishableKey: 'fallback-key',
    })
  })

  it('returns null when public config is incomplete', () => {
    expect(resolveSupabasePublicConfig({}, { url: 'https://fallback.supabase.co' })).toBeNull()
    expect(resolveSupabasePublicConfig({ VITE_SUPABASE_ANON_KEY: 'anon-key' }, {})).toBeNull()
  })
})
