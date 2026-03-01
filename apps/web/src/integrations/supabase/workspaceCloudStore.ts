/**
 * Purpose: Provide Supabase auth plus cloud persistence helpers for workspaces, scripts, and gallery files.
 */

import { createClient } from '@supabase/supabase-js'
import type { EditorSnapshot } from '../../model/types'
import { resolveSupabasePublicConfig } from './config'

export { SUPABASE_PUBLIC_ENV_HINT } from './config'

export const SUPABASE_GALLERY_BUCKET = 'gallery'

export type SupabaseCloudUser = {
  id: string
  email: string | null
}

export type SupabaseCloudScript = {
  workspaceId: string
  title: string
  content: string
  updatedAt: string
}

export type SupabaseGalleryAsset = {
  id: string
  title: string
  fileName: string
  storagePath: string
  contentType: string
  sizeBytes: number
  createdAt: string
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

type ScriptRecord = {
  userId: string
  workspaceId: string
  title: string
  content: string
}

type ScriptQuery = {
  userId: string
  workspaceId: string
}

type GalleryAssetRecord = {
  userId: string
  title: string
  fileName: string
  storagePath: string
  contentType: string
  sizeBytes: number
}

type GalleryUploadRecord = {
  path: string
  file: File
  contentType: string
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

type ScriptLoadResult = {
  script: SupabaseCloudScript | null
  error: CloudError | null
}

type GalleryInsertResult = {
  asset: SupabaseGalleryAsset | null
  error: CloudError | null
}

type GalleryListResult = {
  assets: SupabaseGalleryAsset[]
  error: CloudError | null
}

type GalleryDownloadResult = {
  blob: Blob | null
  error: CloudError | null
}

type WorkspaceCloudStoreDeps = {
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResult>
  signOut: () => Promise<VoidResult>
  getCurrentUser: () => Promise<AuthResult>
  onAuthStateChange: (callback: (user: SupabaseCloudUser | null) => void) => () => void
  createId: () => string
  upsertWorkspace: (record: WorkspaceRecord) => Promise<VoidResult>
  loadWorkspace: (query: WorkspaceQuery) => Promise<WorkspaceLoadResult>
  upsertScript: (record: ScriptRecord) => Promise<VoidResult>
  loadLatestScript: (query: ScriptQuery) => Promise<ScriptLoadResult>
  uploadGalleryFile: (record: GalleryUploadRecord) => Promise<VoidResult>
  insertGalleryAsset: (record: GalleryAssetRecord) => Promise<GalleryInsertResult>
  listGalleryAssets: (userId: string) => Promise<GalleryListResult>
  downloadGalleryFile: (storagePath: string) => Promise<GalleryDownloadResult>
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

const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset'

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

const unwrapError = (error: CloudError | null): void => {
  if (error) {
    throw new Error(error.message)
  }
}

const requireSignedInUser = async (
  deps: Pick<WorkspaceCloudStoreDeps, 'getCurrentUser'>,
): Promise<SupabaseCloudUser> => {
  const auth = await deps.getCurrentUser()
  unwrapError(auth.error)

  if (!auth.user) {
    throw new Error(SIGN_IN_REQUIRED_MESSAGE)
  }

  return auth.user
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
    const user = await requireSignedInUser(deps)
    const result = await deps.upsertWorkspace({
      userId: user.id,
      workspaceId: snapshot.workspace.workspace.id,
      name: snapshot.workspace.workspace.name,
      snapshot,
    })
    unwrapError(result.error)
  },

  async loadWorkspace(workspaceId: string): Promise<EditorSnapshot | null> {
    const user = await requireSignedInUser(deps)
    const result = await deps.loadWorkspace({
      userId: user.id,
      workspaceId,
    })
    unwrapError(result.error)
    return result.snapshot
  },

  async saveScript(workspaceId: string, title: string, content: string): Promise<void> {
    const user = await requireSignedInUser(deps)
    const normalizedTitle = title.trim() || 'SJV Script'
    const normalizedContent = content.trim()
    if (!normalizedContent) {
      throw new Error('SJV Script content is empty.')
    }

    const result = await deps.upsertScript({
      userId: user.id,
      workspaceId,
      title: normalizedTitle,
      content: normalizedContent,
    })
    unwrapError(result.error)
  },

  async loadLatestScript(workspaceId: string): Promise<SupabaseCloudScript | null> {
    const user = await requireSignedInUser(deps)
    const result = await deps.loadLatestScript({
      userId: user.id,
      workspaceId,
    })
    unwrapError(result.error)
    return result.script
  },

  async uploadGalleryAsset(file: File, title?: string): Promise<SupabaseGalleryAsset> {
    const user = await requireSignedInUser(deps)
    const normalizedFileName = sanitizeFileName(file.name)
    const normalizedType = file.type.trim()

    if (!normalizedType.startsWith('image/') && !normalizedType.startsWith('video/')) {
      throw new Error('Only image and video files are supported for the gallery.')
    }

    const assetId = deps.createId()
    const storagePath = `${user.id}/${assetId}/${normalizedFileName}`

    const uploadResult = await deps.uploadGalleryFile({
      path: storagePath,
      file,
      contentType: normalizedType,
    })
    unwrapError(uploadResult.error)

    const metadataResult = await deps.insertGalleryAsset({
      userId: user.id,
      title: title?.trim() || normalizedFileName,
      fileName: normalizedFileName,
      storagePath,
      contentType: normalizedType,
      sizeBytes: file.size,
    })
    unwrapError(metadataResult.error)

    if (!metadataResult.asset) {
      throw new Error('Supabase did not return the new gallery asset metadata.')
    }

    return metadataResult.asset
  },

  async listGalleryAssets(): Promise<SupabaseGalleryAsset[]> {
    const user = await requireSignedInUser(deps)
    const result = await deps.listGalleryAssets(user.id)
    unwrapError(result.error)
    return result.assets
  },

  async downloadGalleryAsset(storagePath: string): Promise<Blob> {
    const user = await requireSignedInUser(deps)
    if (!storagePath.startsWith(`${user.id}/`)) {
      throw new Error('Requested gallery asset is outside the signed-in user scope.')
    }

    const result = await deps.downloadGalleryFile(storagePath)
    unwrapError(result.error)

    if (!result.blob) {
      throw new Error('Supabase returned an empty gallery download.')
    }

    return result.blob
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
        return { error: normalizeError(error) }
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
          script: data
            ? {
                workspaceId: data.workspace_id as string,
                title: data.title as string,
                content: data.content as string,
                updatedAt: data.updated_at as string,
              }
            : null,
          error: normalizeError(error),
        }
      },
      uploadGalleryFile: async ({ path, file, contentType }) => {
        const { error } = await browserClient.storage.from(SUPABASE_GALLERY_BUCKET).upload(path, file, {
          upsert: false,
          contentType,
        })
        return { error: normalizeError(error) }
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
          error: normalizeError(error),
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
          error: normalizeError(error),
        }
      },
      downloadGalleryFile: async (storagePath) => {
        const { data, error } = await browserClient.storage
          .from(SUPABASE_GALLERY_BUCKET)
          .download(storagePath)

        return {
          blob: data ?? null,
          error: normalizeError(error),
        }
      },
    })
  : null
