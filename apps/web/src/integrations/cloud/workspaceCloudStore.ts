/**
 * Purpose: Define the provider-neutral workspace cloud store contract used by Supabase and local databases.
 */

import type { EditorSnapshot } from '../../model/types'

export const WORKSPACE_CLOUD_GALLERY_BUCKET = 'gallery'

export type WorkspaceCloudUser = {
  id: string
  email: string | null
}

export type WorkspaceCloudScriptSummary = {
  workspaceId: string
  title: string
  updatedAt: string
}

export type WorkspaceCloudScript = WorkspaceCloudScriptSummary & {
  content: string
}

export type WorkspaceGalleryAsset = {
  id: string
  title: string
  fileName: string
  storagePath: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

export type WorkspaceCloudStore = {
  signIn: (email: string, password: string) => Promise<WorkspaceCloudUser>
  signOut: () => Promise<void>
  observeAuth: (callback: (user: WorkspaceCloudUser | null) => void) => () => void
  saveWorkspace: (snapshot: EditorSnapshot) => Promise<void>
  loadWorkspace: (workspaceId: string) => Promise<EditorSnapshot | null>
  saveScript: (workspaceId: string, title: string, content: string) => Promise<void>
  listScripts: () => Promise<WorkspaceCloudScriptSummary[]>
  loadLatestScript: (workspaceId: string) => Promise<WorkspaceCloudScript | null>
  deleteScript: (workspaceId: string) => Promise<void>
  uploadGalleryAsset: (file: File, title?: string) => Promise<WorkspaceGalleryAsset>
  uploadGalleryAssetBlob: (
    blob: Blob,
    options: {
      fileName: string
      title?: string
      contentType?: string
    },
  ) => Promise<WorkspaceGalleryAsset>
  listGalleryAssets: () => Promise<WorkspaceGalleryAsset[]>
  deleteGalleryAsset: (asset: WorkspaceGalleryAsset) => Promise<void>
  downloadGalleryAsset: (storagePath: string) => Promise<Blob>
  createGalleryAssetPreviewUrl: (storagePath: string, expiresInSeconds?: number) => Promise<string>
}

export type WorkspaceCloudError = {
  message: string
}

export type WorkspaceRecord = {
  userId: string
  workspaceId: string
  name: string
  snapshot: EditorSnapshot
}

export type WorkspaceQuery = {
  userId: string
  workspaceId: string
}

export type ScriptRecord = {
  userId: string
  workspaceId: string
  title: string
  content: string
}

export type ScriptQuery = {
  userId: string
  workspaceId: string
}

export type GalleryAssetDeleteQuery = {
  userId: string
  assetId: string
}

export type GalleryAssetRecord = {
  userId: string
  title: string
  fileName: string
  storagePath: string
  contentType: string
  sizeBytes: number
}

export type GalleryUploadRecord = {
  path: string
  file: File | Blob
  contentType: string
}

export type AuthResult = {
  user: WorkspaceCloudUser | null
  error: WorkspaceCloudError | null
}

export type VoidResult = {
  error: WorkspaceCloudError | null
}

export type WorkspaceLoadResult = {
  snapshot: EditorSnapshot | null
  error: WorkspaceCloudError | null
}

export type ScriptLoadResult = {
  script: WorkspaceCloudScript | null
  error: WorkspaceCloudError | null
}

export type ScriptListResult = {
  scripts: WorkspaceCloudScriptSummary[]
  error: WorkspaceCloudError | null
}

export type GalleryInsertResult = {
  asset: WorkspaceGalleryAsset | null
  error: WorkspaceCloudError | null
}

export type GalleryListResult = {
  assets: WorkspaceGalleryAsset[]
  error: WorkspaceCloudError | null
}

export type GalleryDownloadResult = {
  blob: Blob | null
  error: WorkspaceCloudError | null
}

export type GallerySignedUrlResult = {
  url: string | null
  error: WorkspaceCloudError | null
}

export type WorkspaceCloudStoreDeps = {
  providerLabel?: string
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResult>
  signOut: () => Promise<VoidResult>
  getCurrentUser: () => Promise<AuthResult>
  onAuthStateChange: (callback: (user: WorkspaceCloudUser | null) => void) => () => void
  createId: () => string
  upsertWorkspace: (record: WorkspaceRecord) => Promise<VoidResult>
  loadWorkspace: (query: WorkspaceQuery) => Promise<WorkspaceLoadResult>
  upsertScript: (record: ScriptRecord) => Promise<VoidResult>
  listScripts: (userId: string) => Promise<ScriptListResult>
  loadLatestScript: (query: ScriptQuery) => Promise<ScriptLoadResult>
  deleteScript: (query: ScriptQuery) => Promise<VoidResult>
  uploadGalleryFile: (record: GalleryUploadRecord) => Promise<VoidResult>
  insertGalleryAsset: (record: GalleryAssetRecord) => Promise<GalleryInsertResult>
  listGalleryAssets: (userId: string) => Promise<GalleryListResult>
  deleteGalleryAssetRecord: (query: GalleryAssetDeleteQuery) => Promise<VoidResult>
  downloadGalleryFile: (storagePath: string) => Promise<GalleryDownloadResult>
  deleteGalleryFile: (storagePath: string) => Promise<VoidResult>
  createGallerySignedUrl: (storagePath: string, expiresIn: number) => Promise<GallerySignedUrlResult>
}

export const normalizeWorkspaceCloudError = (
  error: { message?: string } | null | undefined,
): WorkspaceCloudError | null => (error?.message ? { message: error.message } : null)

const providerLabel = (deps: Pick<WorkspaceCloudStoreDeps, 'providerLabel'>): string =>
  deps.providerLabel?.trim() || 'cloud storage'

const signInRequiredMessage = (deps: Pick<WorkspaceCloudStoreDeps, 'providerLabel'>): string =>
  `Sign in to ${providerLabel(deps)} before using cloud save/load.`

export const sanitizeWorkspaceCloudFileName = (value: string): string =>
  value
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset'

const assertSupportedGalleryContentType = (contentType: string): void => {
  if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
    throw new Error('Only image and video files are supported for the gallery.')
  }
}

const unwrapError = (error: WorkspaceCloudError | null): void => {
  if (error) {
    throw new Error(error.message)
  }
}

const requireSignedInUser = async (
  deps: Pick<WorkspaceCloudStoreDeps, 'getCurrentUser' | 'providerLabel'>,
): Promise<WorkspaceCloudUser> => {
  const auth = await deps.getCurrentUser()
  unwrapError(auth.error)

  if (!auth.user) {
    throw new Error(signInRequiredMessage(deps))
  }

  return auth.user
}

export const createWorkspaceCloudStore = (deps: WorkspaceCloudStoreDeps): WorkspaceCloudStore => ({
  async signIn(email: string, password: string): Promise<WorkspaceCloudUser> {
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
      throw new Error(signInRequiredMessage(deps))
    }

    return result.user
  },

  async signOut(): Promise<void> {
    const result = await deps.signOut()
    unwrapError(result.error)
  },

  observeAuth(callback: (user: WorkspaceCloudUser | null) => void): () => void {
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

  async listScripts(): Promise<WorkspaceCloudScriptSummary[]> {
    const user = await requireSignedInUser(deps)
    const result = await deps.listScripts(user.id)
    unwrapError(result.error)
    return result.scripts
  },

  async loadLatestScript(workspaceId: string): Promise<WorkspaceCloudScript | null> {
    const user = await requireSignedInUser(deps)
    const result = await deps.loadLatestScript({
      userId: user.id,
      workspaceId,
    })
    unwrapError(result.error)
    return result.script
  },

  async deleteScript(workspaceId: string): Promise<void> {
    const user = await requireSignedInUser(deps)
    const normalizedWorkspaceId = workspaceId.trim()
    if (!normalizedWorkspaceId) {
      throw new Error('A workspace id is required to delete a cloud script.')
    }

    const result = await deps.deleteScript({
      userId: user.id,
      workspaceId: normalizedWorkspaceId,
    })
    unwrapError(result.error)
  },

  async uploadGalleryAsset(file: File, title?: string): Promise<WorkspaceGalleryAsset> {
    const user = await requireSignedInUser(deps)
    const normalizedFileName = sanitizeWorkspaceCloudFileName(file.name)
    const normalizedType = file.type.trim()
    assertSupportedGalleryContentType(normalizedType)

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
      throw new Error(`${providerLabel(deps)} did not return the new gallery asset metadata.`)
    }

    return metadataResult.asset
  },

  async uploadGalleryAssetBlob(
    blob: Blob,
    options: {
      fileName: string
      title?: string
      contentType?: string
    },
  ): Promise<WorkspaceGalleryAsset> {
    const user = await requireSignedInUser(deps)
    const normalizedFileName = sanitizeWorkspaceCloudFileName(options.fileName)
    const normalizedType = (options.contentType ?? blob.type).trim()
    if (!normalizedFileName) {
      throw new Error('A gallery file name is required.')
    }
    if (!normalizedType) {
      throw new Error('A gallery content type is required.')
    }
    assertSupportedGalleryContentType(normalizedType)

    const assetId = deps.createId()
    const storagePath = `${user.id}/${assetId}/${normalizedFileName}`

    const uploadResult = await deps.uploadGalleryFile({
      path: storagePath,
      file: blob,
      contentType: normalizedType,
    })
    unwrapError(uploadResult.error)

    const metadataResult = await deps.insertGalleryAsset({
      userId: user.id,
      title: options.title?.trim() || normalizedFileName,
      fileName: normalizedFileName,
      storagePath,
      contentType: normalizedType,
      sizeBytes: blob.size,
    })
    unwrapError(metadataResult.error)

    if (!metadataResult.asset) {
      throw new Error(`${providerLabel(deps)} did not return the new gallery asset metadata.`)
    }

    return metadataResult.asset
  },

  async listGalleryAssets(): Promise<WorkspaceGalleryAsset[]> {
    const user = await requireSignedInUser(deps)
    const result = await deps.listGalleryAssets(user.id)
    unwrapError(result.error)
    return result.assets
  },

  async deleteGalleryAsset(asset: WorkspaceGalleryAsset): Promise<void> {
    const user = await requireSignedInUser(deps)
    if (!asset.id.trim()) {
      throw new Error('A gallery asset id is required.')
    }
    if (!asset.storagePath.startsWith(`${user.id}/`)) {
      throw new Error('Requested gallery asset is outside the signed-in user scope.')
    }

    const fileDeleteResult = await deps.deleteGalleryFile(asset.storagePath)
    unwrapError(fileDeleteResult.error)

    const metadataDeleteResult = await deps.deleteGalleryAssetRecord({
      userId: user.id,
      assetId: asset.id,
    })
    unwrapError(metadataDeleteResult.error)
  },

  async downloadGalleryAsset(storagePath: string): Promise<Blob> {
    const user = await requireSignedInUser(deps)
    if (!storagePath.startsWith(`${user.id}/`)) {
      throw new Error('Requested gallery asset is outside the signed-in user scope.')
    }

    const result = await deps.downloadGalleryFile(storagePath)
    unwrapError(result.error)

    if (!result.blob) {
      throw new Error(`${providerLabel(deps)} returned an empty gallery download.`)
    }

    return result.blob
  },

  async createGalleryAssetPreviewUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const user = await requireSignedInUser(deps)
    if (!storagePath.startsWith(`${user.id}/`)) {
      throw new Error('Requested gallery asset is outside the signed-in user scope.')
    }

    const result = await deps.createGallerySignedUrl(storagePath, Math.max(60, Math.round(expiresInSeconds)))
    unwrapError(result.error)

    if (!result.url) {
      throw new Error(`${providerLabel(deps)} returned an empty gallery preview URL.`)
    }

    return result.url
  },
})
