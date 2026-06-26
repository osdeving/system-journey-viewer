/**
 * Purpose: Resolve the active workspace cloud provider from browser-safe database configuration.
 */

import {
  resolveSupabasePublicConfig,
  SUPABASE_PUBLIC_ENV_HINT,
  type SupabasePublicConfig,
} from '../supabase/config'

type WorkspaceCloudEnv = Readonly<Record<string, string | boolean | undefined>>

export type LocalWorkspaceCloudProviderConfig = {
  kind: 'local'
  databaseUrl: string
  databaseName: string
  providerLabel: 'Local Database'
  statusLabel: 'local database'
  isDefaultFallback: boolean
}

export type SupabaseWorkspaceCloudProviderConfig = {
  kind: 'supabase'
  supabase: SupabasePublicConfig
  providerLabel: 'Supabase Cloud'
  statusLabel: 'Supabase cloud'
}

export type DisabledWorkspaceCloudProviderConfig = {
  kind: 'disabled'
  providerLabel: 'Cloud Offline'
  statusLabel: 'cloud persistence'
  reason: string
}

export type WorkspaceCloudProviderConfig =
  | LocalWorkspaceCloudProviderConfig
  | SupabaseWorkspaceCloudProviderConfig
  | DisabledWorkspaceCloudProviderConfig

export const DEFAULT_LOCAL_DATABASE_URL = 'indexeddb://sjv-local'

export const WORKSPACE_CLOUD_PUBLIC_ENV_HINT =
  'Set VITE_SJV_DB_URL=indexeddb://sjv-local for a local browser database, or configure Supabase with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

const LOCAL_DATABASE_SCHEMES = new Set(['indexeddb:', 'idb:', 'localdb:'])

const normalizeString = (value: string | boolean | undefined): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const readDatabaseUrl = (env: WorkspaceCloudEnv): string | null => normalizeString(env.VITE_SJV_DB_URL)

export const resolveLocalDatabaseName = (databaseUrl: string): string | null => {
  try {
    const parsed = new URL(databaseUrl)
    if (!LOCAL_DATABASE_SCHEMES.has(parsed.protocol)) {
      return null
    }

    const name = decodeURIComponent(parsed.hostname || parsed.pathname.replace(/^\/+/, ''))
      .trim()
      .replace(/\s+/g, '-')

    return name || 'sjv-local'
  } catch {
    const normalizedUrl = databaseUrl.trim()
    const matchedScheme = [...LOCAL_DATABASE_SCHEMES].find((scheme) => normalizedUrl.startsWith(scheme))
    if (!matchedScheme) {
      return null
    }

    return normalizedUrl.slice(matchedScheme.length).replace(/^\/+/, '').trim() || 'sjv-local'
  }
}

const createLocalProviderConfig = (
  databaseUrl: string,
  isDefaultFallback: boolean,
): LocalWorkspaceCloudProviderConfig => ({
  kind: 'local',
  databaseUrl,
  databaseName: resolveLocalDatabaseName(databaseUrl) ?? 'sjv-local',
  providerLabel: 'Local Database',
  statusLabel: 'local database',
  isDefaultFallback,
})

export const resolveWorkspaceCloudProviderConfig = (
  env: WorkspaceCloudEnv = import.meta.env as WorkspaceCloudEnv,
  buildTimeSupabaseFallback?: Partial<SupabasePublicConfig>,
): WorkspaceCloudProviderConfig => {
  const databaseUrl = readDatabaseUrl(env)

  if (databaseUrl) {
    const localDatabaseName = resolveLocalDatabaseName(databaseUrl)
    if (localDatabaseName) {
      return {
        ...createLocalProviderConfig(databaseUrl, false),
        databaseName: localDatabaseName,
      }
    }

    return {
      kind: 'disabled',
      providerLabel: 'Cloud Offline',
      statusLabel: 'cloud persistence',
      reason:
        'Direct browser database URLs are not supported. Use indexeddb:// for local storage or add a provider adapter/gateway for remote databases.',
    }
  }

  const supabase = resolveSupabasePublicConfig(env, buildTimeSupabaseFallback)
  if (supabase) {
    return {
      kind: 'supabase',
      supabase,
      providerLabel: 'Supabase Cloud',
      statusLabel: 'Supabase cloud',
    }
  }

  return createLocalProviderConfig(DEFAULT_LOCAL_DATABASE_URL, true)
}

export const resolveWorkspaceCloudProviderHint = (config: WorkspaceCloudProviderConfig): string => {
  if (config.kind === 'disabled') {
    return `${config.reason} ${WORKSPACE_CLOUD_PUBLIC_ENV_HINT}`
  }
  if (config.kind === 'supabase') {
    return SUPABASE_PUBLIC_ENV_HINT
  }
  return `Using ${config.databaseUrl}. Change VITE_SJV_DB_URL to point at another local IndexedDB database name.`
}
