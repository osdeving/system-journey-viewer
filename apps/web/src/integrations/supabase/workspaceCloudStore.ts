/**
 * Purpose: Provide Supabase auth and workspace snapshot persistence for the SJV web app.
 */

import { createClient } from '@supabase/supabase-js'
import type { EditorSnapshot } from '../../model/types'
import { resolveSupabasePublicConfig } from './config'

export { SUPABASE_PUBLIC_ENV_HINT } from './config'

export type SupabaseCloudUser = {
  id: string
  email: string | null
}

type CloudError = {
  message: string
}

type WorkspaceRecord = {
  userId: string
  workspaceId: string
  name: string
  snapshot: EditorSnapshot
}

type WorkspaceQuery = {
  userId: string
  workspaceId: string
}

type AuthResult = {
  user: SupabaseCloudUser | null
  error: CloudError | null
}

type VoidResult = {
  error: CloudError | null
}

type WorkspaceLoadResult = {
  snapshot: EditorSnapshot | null
  error: CloudError | null
}

type WorkspaceCloudStoreDeps = {
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResult>
  signOut: () => Promise<VoidResult>
  getCurrentUser: () => Promise<AuthResult>
  onAuthStateChange: (callback: (user: SupabaseCloudUser | null) => void) => () => void
  upsertWorkspace: (record: WorkspaceRecord) => Promise<VoidResult>
  loadWorkspace: (query: WorkspaceQuery) => Promise<WorkspaceLoadResult>
}

const SIGN_IN_REQUIRED_MESSAGE = 'Sign in to Supabase before using cloud save/load.'

const normalizeError = (error: { message?: string } | null | undefined): CloudError | null =>
  error?.message ? { message: error.message } : null

const toCloudUser = (user: { id: string; email?: string | null } | null | undefined): SupabaseCloudUser | null =>
  user
    ? {
        id: user.id,
        email: user.email ?? null,
      }
    : null

const unwrapError = (error: CloudError | null): void => {
  if (error) {
    throw new Error(error.message)
  }
}

export const createSupabaseWorkspaceCloudStore = (deps: WorkspaceCloudStoreDeps) => ({
  async signIn(email: string, password: string): Promise<SupabaseCloudUser> {
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required.')
    }

    const result = await deps.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    unwrapError(result.error)

    if (!result.user) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }

    return result.user
  },

  async signOut(): Promise<void> {
    const result = await deps.signOut()
    unwrapError(result.error)
  },

  observeAuth(callback: (user: SupabaseCloudUser | null) => void): () => void {
    return deps.onAuthStateChange(callback)
  },

  async saveWorkspace(snapshot: EditorSnapshot): Promise<void> {
    const auth = await deps.getCurrentUser()
    unwrapError(auth.error)

    if (!auth.user) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }

    const result = await deps.upsertWorkspace({
      userId: auth.user.id,
      workspaceId: snapshot.workspace.workspace.id,
      name: snapshot.workspace.workspace.name,
      snapshot,
    })
    unwrapError(result.error)
  },

  async loadWorkspace(workspaceId: string): Promise<EditorSnapshot | null> {
    const auth = await deps.getCurrentUser()
    unwrapError(auth.error)

    if (!auth.user) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }

    const result = await deps.loadWorkspace({
      userId: auth.user.id,
      workspaceId,
    })
    unwrapError(result.error)
    return result.snapshot
  },
})

const supabaseConfig = resolveSupabasePublicConfig()

export const supabaseCloudConfigured = supabaseConfig !== null

const browserClient = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.publishableKey)
  : null

export const supabaseWorkspaceCloudStore = browserClient
  ? createSupabaseWorkspaceCloudStore({
      signInWithPassword: async ({ email, password }) => {
        const { data, error } = await browserClient.auth.signInWithPassword({
          email,
          password,
        })
        return {
          user: toCloudUser(data.user),
          error: normalizeError(error),
        }
      },
      signOut: async () => {
        const { error } = await browserClient.auth.signOut()
        return { error: normalizeError(error) }
      },
      getCurrentUser: async () => {
        const { data, error } = await browserClient.auth.getUser()
        return {
          user: toCloudUser(data.user),
          error: normalizeError(error),
        }
      },
      onAuthStateChange: (callback) => {
        const { data } = browserClient.auth.onAuthStateChange((_event, session) => {
          callback(toCloudUser(session?.user))
        })

        return () => {
          data.subscription.unsubscribe()
        }
      },
      upsertWorkspace: async ({ userId, workspaceId, name, snapshot }) => {
        const { error } = await browserClient
          .from('workspaces')
          .upsert(
            {
              user_id: userId,
              workspace_id: workspaceId,
              name,
              snapshot,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,workspace_id',
            },
          )
        return { error: normalizeError(error) }
      },
      loadWorkspace: async ({ userId, workspaceId }) => {
        const { data, error } = await browserClient
          .from('workspaces')
          .select('snapshot')
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId)
          .maybeSingle()

        return {
          snapshot: data?.snapshot ? (data.snapshot as EditorSnapshot) : null,
          error: normalizeError(error),
        }
      },
    })
  : null
