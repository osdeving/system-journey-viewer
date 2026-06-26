/**
 * Purpose: Verify workspace cloud provider resolution for local database and Supabase configurations.
 */

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCAL_DATABASE_URL,
  resolveLocalDatabaseName,
  resolveWorkspaceCloudProviderConfig,
} from './providerConfig'

describe('resolveLocalDatabaseName', () => {
  it('parses supported local database URL schemes', () => {
    expect(resolveLocalDatabaseName('indexeddb://sjv-dev')).toBe('sjv-dev')
    expect(resolveLocalDatabaseName('idb:///feature-lab')).toBe('feature-lab')
    expect(resolveLocalDatabaseName('localdb:team sandbox')).toBe('team-sandbox')
  })

  it('rejects remote database URLs in the browser provider resolver', () => {
    expect(resolveLocalDatabaseName('postgres://user:password@example.test/sjv')).toBeNull()
  })
})

describe('resolveWorkspaceCloudProviderConfig', () => {
  it('uses VITE_SJV_DB_URL as the explicit local database override', () => {
    const config = resolveWorkspaceCloudProviderConfig(
      {
        VITE_SJV_DB_URL: 'indexeddb://sjv-feature',
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
      },
      {},
    )

    expect(config).toMatchObject({
      kind: 'local',
      databaseUrl: 'indexeddb://sjv-feature',
      databaseName: 'sjv-feature',
      isDefaultFallback: false,
    })
  })

  it('uses Supabase when public Supabase env is complete and no DB URL override exists', () => {
    const config = resolveWorkspaceCloudProviderConfig(
      {
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
      },
      {},
    )

    expect(config).toEqual({
      kind: 'supabase',
      supabase: {
        url: 'https://project.supabase.co',
        publishableKey: 'anon-key',
      },
      providerLabel: 'Supabase Cloud',
      statusLabel: 'Supabase cloud',
    })
  })

  it('falls back to a functional local browser database when Supabase is absent', () => {
    const config = resolveWorkspaceCloudProviderConfig({}, {})

    expect(config).toMatchObject({
      kind: 'local',
      databaseUrl: DEFAULT_LOCAL_DATABASE_URL,
      databaseName: 'sjv-local',
      isDefaultFallback: true,
    })
  })

  it('disables cloud persistence for unsupported direct database URLs', () => {
    const config = resolveWorkspaceCloudProviderConfig(
      {
        VITE_SJV_DB_URL: 'postgres://user:password@example.test/sjv',
      },
      {},
    )

    expect(config).toMatchObject({
      kind: 'disabled',
      providerLabel: 'Cloud Offline',
    })
  })
})
