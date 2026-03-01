/**
 * Purpose: Resolve safe public Supabase browser configuration from Vite env and build-time shims.
 */

type SupabaseBrowserEnv = Readonly<Record<string, string | boolean | undefined>>

export type SupabasePublicConfig = {
  url: string
  publishableKey: string
}

export const SUPABASE_PUBLIC_ENV_HINT =
  'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or configure the Vercel Supabase integration.'

const normalizeString = (value: string | boolean | undefined): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const readFirstString = (env: SupabaseBrowserEnv, keys: string[]): string | null => {
  for (const key of keys) {
    const value = normalizeString(env[key])
    if (value) {
      return value
    }
  }
  return null
}

const resolveBuildTimeFallback = (): Partial<SupabasePublicConfig> => ({
  url: typeof __SJV_SUPABASE_URL__ === 'string' ? __SJV_SUPABASE_URL__ : undefined,
  publishableKey:
    typeof __SJV_SUPABASE_PUBLISHABLE_KEY__ === 'string'
      ? __SJV_SUPABASE_PUBLISHABLE_KEY__
      : undefined,
})

export const resolveSupabasePublicConfig = (
  env: SupabaseBrowserEnv = import.meta.env as SupabaseBrowserEnv,
  buildTimeFallback: Partial<SupabasePublicConfig> = resolveBuildTimeFallback(),
): SupabasePublicConfig | null => {
  const url = readFirstString(env, ['VITE_SUPABASE_URL']) ?? normalizeString(buildTimeFallback.url)
  const publishableKey =
    readFirstString(env, ['VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY']) ??
    normalizeString(buildTimeFallback.publishableKey)

  if (!url || !publishableKey) {
    return null
  }

  return {
    url,
    publishableKey,
  }
}
