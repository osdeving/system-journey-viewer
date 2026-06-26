/**
 * Purpose: Provide the Supabase adapter and compatibility exports for workspace cloud persistence.
 */

import { createClient } from '@supabase/supabase-js'
import type { EditorSnapshot } from '../../model/types'
import {
  DEFAULT_LOCAL_DATABASE_URL,
  resolveWorkspaceCloudProviderConfig,
  resolveWorkspaceCloudProviderHint,
} from '../cloud/providerConfig'
import {
  createWorkspaceCloudStore,
  normalizeWorkspaceCloudError,
  WORKSPACE_CLOUD_GALLERY_BUCKET,
  type WorkspaceCloudScript,
  type WorkspaceCloudScriptSummary,
  type WorkspaceCloudStore,
  type WorkspaceCloudStoreDeps,
  type WorkspaceCloudUser,
  type WorkspaceGalleryAsset,
} from '../cloud/workspaceCloudStore'
import { createLocalWorkspaceCloudStore } from '../localDb/localWorkspaceCloudStore'

export type SupabaseCloudUser = WorkspaceCloudUser
export type SupabaseCloudScriptSummary = WorkspaceCloudScriptSummary
export type SupabaseCloudScript = WorkspaceCloudScript
export type SupabaseGalleryAsset = WorkspaceGalleryAsset

export const SUPABASE_GALLERY_BUCKET = WORKSPACE_CLOUD_GALLERY_BUCKET

const toCloudUser = (user: { id: string; email?: string | null } | null | undefined): SupabaseCloudUser | null =>
  user
    ? {
        id: user.id,
        email: user.email ?? null,
      }
    : null

const toCloudScriptSummary = (value: {
  workspace_id: string
  title: string
  updated_at: string
}): SupabaseCloudScriptSummary => ({
  workspaceId: value.workspace_id,
  title: value.title,
  updatedAt: value.updated_at,
})

const toCloudScript = (value: {
  workspace_id: string
  title: string
  content: string
  updated_at: string
}): SupabaseCloudScript => ({
  ...toCloudScriptSummary(value),
  content: value.content,
})

const toGalleryAsset = (value: {
  id: string
  title: string
  file_name: string
  storage_path: string
  content_type: string
  size_bytes: number
  created_at: string
}): SupabaseGalleryAsset => ({
  id: value.id,
  title: value.title,
  fileName: value.file_name,
  storagePath: value.storage_path,
  contentType: value.content_type,
  sizeBytes: value.size_bytes,
  createdAt: value.created_at,
})

export const createSupabaseWorkspaceCloudStore = (
  deps: WorkspaceCloudStoreDeps,
): WorkspaceCloudStore =>
  createWorkspaceCloudStore({
    ...deps,
    providerLabel: 'Supabase',
  })

const workspaceCloudProviderConfig = resolveWorkspaceCloudProviderConfig()

export const workspaceCloudProviderKind = workspaceCloudProviderConfig.kind
export const workspaceCloudProviderLabel = workspaceCloudProviderConfig.providerLabel
export const workspaceCloudStatusLabel = workspaceCloudProviderConfig.statusLabel
export const workspaceCloudDatabaseUrl =
  workspaceCloudProviderConfig.kind === 'local'
    ? workspaceCloudProviderConfig.databaseUrl
    : workspaceCloudProviderConfig.kind === 'supabase'
      ? workspaceCloudProviderConfig.supabase.url
      : DEFAULT_LOCAL_DATABASE_URL

export const SUPABASE_PUBLIC_ENV_HINT = resolveWorkspaceCloudProviderHint(workspaceCloudProviderConfig)

const browserClient =
  workspaceCloudProviderConfig.kind === 'supabase'
    ? createClient(
        workspaceCloudProviderConfig.supabase.url,
        workspaceCloudProviderConfig.supabase.publishableKey,
      )
    : null

const supabaseStore = browserClient
  ? createSupabaseWorkspaceCloudStore({
      signInWithPassword: async ({ email, password }) => {
        const { data, error } = await browserClient.auth.signInWithPassword({
          email,
          password,
        })
        return {
          user: toCloudUser(data.user),
          error: normalizeWorkspaceCloudError(error),
        }
      },
      signOut: async () => {
        const { error } = await browserClient.auth.signOut()
        return { error: normalizeWorkspaceCloudError(error) }
      },
      getCurrentUser: async () => {
        const { data, error } = await browserClient.auth.getUser()
        return {
          user: toCloudUser(data.user),
          error: normalizeWorkspaceCloudError(error),
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
      createId: () => crypto.randomUUID(),
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
        return { error: normalizeWorkspaceCloudError(error) }
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
          error: normalizeWorkspaceCloudError(error),
        }
      },
      upsertScript: async ({ userId, workspaceId, title, content }) => {
        const { error } = await browserClient
          .from('scripts')
          .upsert(
            {
              user_id: userId,
              workspace_id: workspaceId,
              title,
              content,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,workspace_id',
            },
          )
        return { error: normalizeWorkspaceCloudError(error) }
      },
      listScripts: async (userId) => {
        const { data, error } = await browserClient
          .from('scripts')
          .select('workspace_id,title,updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(24)

        return {
          scripts: (data ?? []).map((value) => toCloudScriptSummary(value as never)),
          error: normalizeWorkspaceCloudError(error),
        }
      },
      loadLatestScript: async ({ userId, workspaceId }) => {
        const { data, error } = await browserClient
          .from('scripts')
          .select('workspace_id,title,content,updated_at')
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          script: data ? toCloudScript(data as never) : null,
          error: normalizeWorkspaceCloudError(error),
        }
      },
      deleteScript: async ({ userId, workspaceId }) => {
        const { error } = await browserClient
          .from('scripts')
          .delete()
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId)

        return { error: normalizeWorkspaceCloudError(error) }
      },
      uploadGalleryFile: async ({ path, file, contentType }) => {
        const { error } = await browserClient.storage
          .from(SUPABASE_GALLERY_BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType,
          })
        return { error: normalizeWorkspaceCloudError(error) }
      },
      insertGalleryAsset: async ({ userId, title, fileName, storagePath, contentType, sizeBytes }) => {
        const { data, error } = await browserClient
          .from('gallery_assets')
          .insert({
            user_id: userId,
            title,
            file_name: fileName,
            storage_path: storagePath,
            content_type: contentType,
            size_bytes: sizeBytes,
          })
          .select('id,title,file_name,storage_path,content_type,size_bytes,created_at')
          .single()

        return {
          asset: data ? toGalleryAsset(data as never) : null,
          error: normalizeWorkspaceCloudError(error),
        }
      },
      listGalleryAssets: async (userId) => {
        const { data, error } = await browserClient
          .from('gallery_assets')
          .select('id,title,file_name,storage_path,content_type,size_bytes,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(24)

        return {
          assets: (data ?? []).map((value) => toGalleryAsset(value as never)),
          error: normalizeWorkspaceCloudError(error),
        }
      },
      deleteGalleryAssetRecord: async ({ userId, assetId }) => {
        const { error } = await browserClient
          .from('gallery_assets')
          .delete()
          .eq('user_id', userId)
          .eq('id', assetId)

        return { error: normalizeWorkspaceCloudError(error) }
      },
      downloadGalleryFile: async (storagePath) => {
        const { data, error } = await browserClient.storage
          .from(SUPABASE_GALLERY_BUCKET)
          .download(storagePath)

        return {
          blob: data ?? null,
          error: normalizeWorkspaceCloudError(error),
        }
      },
      deleteGalleryFile: async (storagePath) => {
        const { error } = await browserClient.storage
          .from(SUPABASE_GALLERY_BUCKET)
          .remove([storagePath])

        return { error: normalizeWorkspaceCloudError(error) }
      },
      createGallerySignedUrl: async (storagePath, expiresIn) => {
        const { data, error } = await browserClient.storage
          .from(SUPABASE_GALLERY_BUCKET)
          .createSignedUrl(storagePath, expiresIn)

        return {
          url: data?.signedUrl ?? null,
          error: normalizeWorkspaceCloudError(error),
        }
      },
    })
  : null

const localStore =
  workspaceCloudProviderConfig.kind === 'local'
    ? createLocalWorkspaceCloudStore({
        databaseName: workspaceCloudProviderConfig.databaseName,
      })
    : null

export const supabaseCloudConfigured = workspaceCloudProviderConfig.kind !== 'disabled'
export const supabaseWorkspaceCloudStore = supabaseStore ?? localStore

export const workspaceCloudConfigured = supabaseCloudConfigured
export const workspaceCloudStore = supabaseWorkspaceCloudStore
