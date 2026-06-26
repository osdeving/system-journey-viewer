/**
 * Purpose: Provide a local IndexedDB-backed WorkspaceCloudStore for offline Supabase-compatible workflows.
 */

import type { EditorSnapshot } from '../../model/types'
import {
  createWorkspaceCloudStore,
  normalizeWorkspaceCloudError,
  type GalleryAssetDeleteQuery,
  type GalleryAssetRecord,
  type GalleryDownloadResult,
  type GalleryInsertResult,
  type GalleryListResult,
  type GallerySignedUrlResult,
  type GalleryUploadRecord,
  type ScriptListResult,
  type ScriptLoadResult,
  type ScriptQuery,
  type ScriptRecord,
  type VoidResult,
  type WorkspaceCloudStore,
  type WorkspaceCloudUser,
  type WorkspaceGalleryAsset,
  type WorkspaceLoadResult,
  type WorkspaceQuery,
  type WorkspaceRecord,
} from '../cloud/workspaceCloudStore'

type LocalAuthRecord = {
  key: 'currentUser'
  user: WorkspaceCloudUser | null
}

type LocalWorkspaceRecord = WorkspaceRecord & {
  key: string
  updatedAt: string
}

type LocalScriptRecord = ScriptRecord & {
  key: string
  updatedAt: string
}

type LocalGalleryAssetRecord = WorkspaceGalleryAsset & {
  userId: string
}

type LocalGalleryFileRecord = {
  storagePath: string
  blob: Blob
  contentType: string
}

export type LocalWorkspaceDatabase = {
  getCurrentUser: () => Promise<WorkspaceCloudUser | null>
  setCurrentUser: (user: WorkspaceCloudUser) => Promise<void>
  clearCurrentUser: () => Promise<void>
  upsertWorkspace: (record: LocalWorkspaceRecord) => Promise<void>
  loadWorkspace: (query: WorkspaceQuery) => Promise<EditorSnapshot | null>
  upsertScript: (record: LocalScriptRecord) => Promise<void>
  listScripts: (userId: string) => Promise<LocalScriptRecord[]>
  loadLatestScript: (query: ScriptQuery) => Promise<LocalScriptRecord | null>
  deleteScript: (query: ScriptQuery) => Promise<void>
  uploadGalleryFile: (record: LocalGalleryFileRecord) => Promise<void>
  insertGalleryAsset: (record: LocalGalleryAssetRecord) => Promise<void>
  listGalleryAssets: (userId: string) => Promise<LocalGalleryAssetRecord[]>
  deleteGalleryAssetRecord: (query: GalleryAssetDeleteQuery) => Promise<void>
  downloadGalleryFile: (storagePath: string) => Promise<Blob | null>
  deleteGalleryFile: (storagePath: string) => Promise<void>
}

export type LocalWorkspaceCloudStoreOptions = {
  databaseName?: string
  database?: LocalWorkspaceDatabase
  createId?: () => string
  createPreviewUrl?: (blob: Blob) => string
}

const LOCAL_AUTH_KEY = 'currentUser'
const DEFAULT_LOCAL_DATABASE_NAME = 'sjv-local'
const LOCAL_PROVIDER_LABEL = 'local database'

const workspaceKey = ({ userId, workspaceId }: WorkspaceQuery): string => `${userId}::${workspaceId}`
const scriptKey = ({ userId, workspaceId }: ScriptQuery): string => `${userId}::${workspaceId}`

const nowIso = (): string => new Date().toISOString()

const toLocalUserId = (email: string): string => {
  const normalizedEmail = email.trim().toLowerCase()
  const label = normalizedEmail
    .split('@')[0]
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user'
  let hash = 2166136261
  for (let index = 0; index < normalizedEmail.length; index += 1) {
    hash ^= normalizedEmail.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `local-${label}-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

const toLocalUser = (email: string): WorkspaceCloudUser => ({
  id: toLocalUserId(email),
  email,
})

const toCloudError = (error: unknown) =>
  normalizeWorkspaceCloudError(error instanceof Error ? error : { message: String(error) })

const asVoidResult = async (run: () => Promise<void>): Promise<VoidResult> => {
  try {
    await run()
    return { error: null }
  } catch (error) {
    return { error: toCloudError(error) }
  }
}

const parseAssetIdFromStoragePath = (storagePath: string): string => {
  const [, assetId] = storagePath.split('/')
  return assetId?.trim() || crypto.randomUUID()
}

const defaultCreatePreviewUrl = (blob: Blob): string => {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(blob)
  }
  return `local-preview://${blob.size}-${Date.now()}`
}

export const createLocalWorkspaceCloudStore = (
  options: LocalWorkspaceCloudStoreOptions = {},
): WorkspaceCloudStore => {
  const database =
    options.database ?? createIndexedDbLocalWorkspaceDatabase(options.databaseName ?? DEFAULT_LOCAL_DATABASE_NAME)
  const createPreviewUrl = options.createPreviewUrl ?? defaultCreatePreviewUrl
  const authListeners = new Set<(user: WorkspaceCloudUser | null) => void>()
  let authChangeVersion = 0

  const notifyAuthListeners = (user: WorkspaceCloudUser | null): void => {
    authChangeVersion += 1
    authListeners.forEach((callback) => callback(user))
  }

  return createWorkspaceCloudStore({
    providerLabel: LOCAL_PROVIDER_LABEL,
    signInWithPassword: async ({ email }) => {
      const user = toLocalUser(email)
      await database.setCurrentUser(user)
      notifyAuthListeners(user)
      return { user, error: null }
    },
    signOut: async () =>
      asVoidResult(async () => {
        await database.clearCurrentUser()
        notifyAuthListeners(null)
      }),
    getCurrentUser: async () => {
      try {
        return {
          user: await database.getCurrentUser(),
          error: null,
        }
      } catch (error) {
        return {
          user: null,
          error: toCloudError(error),
        }
      }
    },
    onAuthStateChange: (callback) => {
      authListeners.add(callback)
      const initialVersion = authChangeVersion
      void database.getCurrentUser().then((user) => {
        if (authListeners.has(callback) && initialVersion === authChangeVersion) {
          callback(user)
        }
      }).catch(() => {
        if (authListeners.has(callback) && initialVersion === authChangeVersion) {
          callback(null)
        }
      })
      return () => {
        authListeners.delete(callback)
      }
    },
    createId: () => options.createId?.() ?? crypto.randomUUID(),
    upsertWorkspace: (record) =>
      asVoidResult(() =>
        database.upsertWorkspace({
          ...record,
          key: workspaceKey(record),
          updatedAt: nowIso(),
        }),
      ),
    loadWorkspace: async (query): Promise<WorkspaceLoadResult> => {
      try {
        return {
          snapshot: await database.loadWorkspace(query),
          error: null,
        }
      } catch (error) {
        return {
          snapshot: null,
          error: toCloudError(error),
        }
      }
    },
    upsertScript: (record: ScriptRecord) =>
      asVoidResult(() =>
        database.upsertScript({
          ...record,
          key: scriptKey(record),
          updatedAt: nowIso(),
        }),
      ),
    listScripts: async (userId: string): Promise<ScriptListResult> => {
      try {
        const scripts = await database.listScripts(userId)
        return {
          scripts: scripts
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, 24)
            .map((script) => ({
              workspaceId: script.workspaceId,
              title: script.title,
              updatedAt: script.updatedAt,
            })),
          error: null,
        }
      } catch (error) {
        return {
          scripts: [],
          error: toCloudError(error),
        }
      }
    },
    loadLatestScript: async (query): Promise<ScriptLoadResult> => {
      try {
        const script = await database.loadLatestScript(query)
        return {
          script: script
            ? {
                workspaceId: script.workspaceId,
                title: script.title,
                content: script.content,
                updatedAt: script.updatedAt,
              }
            : null,
          error: null,
        }
      } catch (error) {
        return {
          script: null,
          error: toCloudError(error),
        }
      }
    },
    deleteScript: (query) => asVoidResult(() => database.deleteScript(query)),
    uploadGalleryFile: (record: GalleryUploadRecord) =>
      asVoidResult(() =>
        database.uploadGalleryFile({
          storagePath: record.path,
          blob: record.file,
          contentType: record.contentType,
        }),
      ),
    insertGalleryAsset: async (record: GalleryAssetRecord): Promise<GalleryInsertResult> => {
      try {
        const asset: LocalGalleryAssetRecord = {
          id: parseAssetIdFromStoragePath(record.storagePath),
          userId: record.userId,
          title: record.title,
          fileName: record.fileName,
          storagePath: record.storagePath,
          contentType: record.contentType,
          sizeBytes: record.sizeBytes,
          createdAt: nowIso(),
        }
        await database.insertGalleryAsset(asset)
        return { asset, error: null }
      } catch (error) {
        return {
          asset: null,
          error: toCloudError(error),
        }
      }
    },
    listGalleryAssets: async (userId): Promise<GalleryListResult> => {
      try {
        const assets = await database.listGalleryAssets(userId)
        return {
          assets: assets
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .slice(0, 24)
            .map((asset) => ({
              id: asset.id,
              title: asset.title,
              fileName: asset.fileName,
              storagePath: asset.storagePath,
              contentType: asset.contentType,
              sizeBytes: asset.sizeBytes,
              createdAt: asset.createdAt,
            })),
          error: null,
        }
      } catch (error) {
        return {
          assets: [],
          error: toCloudError(error),
        }
      }
    },
    deleteGalleryAssetRecord: (query) => asVoidResult(() => database.deleteGalleryAssetRecord(query)),
    downloadGalleryFile: async (storagePath): Promise<GalleryDownloadResult> => {
      try {
        const blob = await database.downloadGalleryFile(storagePath)
        return blob
          ? { blob, error: null }
          : { blob: null, error: { message: 'Local gallery file was not found.' } }
      } catch (error) {
        return {
          blob: null,
          error: toCloudError(error),
        }
      }
    },
    deleteGalleryFile: (storagePath) => asVoidResult(() => database.deleteGalleryFile(storagePath)),
    createGallerySignedUrl: async (storagePath): Promise<GallerySignedUrlResult> => {
      try {
        const blob = await database.downloadGalleryFile(storagePath)
        return blob
          ? { url: createPreviewUrl(blob), error: null }
          : { url: null, error: { message: 'Local gallery file was not found.' } }
      } catch (error) {
        return {
          url: null,
          error: toCloudError(error),
        }
      }
    },
  })
}

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'))
  })

const openIndexedDb = (databaseName: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }

    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('auth')) {
        database.createObjectStore('auth', { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains('workspaces')) {
        database.createObjectStore('workspaces', { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains('scripts')) {
        database.createObjectStore('scripts', { keyPath: 'key' })
      }
      if (!database.objectStoreNames.contains('galleryAssets')) {
        database.createObjectStore('galleryAssets', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('galleryFiles')) {
        database.createObjectStore('galleryFiles', { keyPath: 'storagePath' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'))
  })

const getRecord = async <T>(
  connection: Promise<IDBDatabase>,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> => {
  const database = await connection
  const transaction = database.transaction(storeName, 'readonly')
  return requestToPromise<T | undefined>(transaction.objectStore(storeName).get(key))
}

const getAllRecords = async <T>(connection: Promise<IDBDatabase>, storeName: string): Promise<T[]> => {
  const database = await connection
  const transaction = database.transaction(storeName, 'readonly')
  return requestToPromise<T[]>(transaction.objectStore(storeName).getAll())
}

const putRecord = async (
  connection: Promise<IDBDatabase>,
  storeName: string,
  record: unknown,
): Promise<void> => {
  const database = await connection
  const transaction = database.transaction(storeName, 'readwrite')
  await requestToPromise(transaction.objectStore(storeName).put(record))
  await transactionDone(transaction)
}

const deleteRecord = async (
  connection: Promise<IDBDatabase>,
  storeName: string,
  key: IDBValidKey,
): Promise<void> => {
  const database = await connection
  const transaction = database.transaction(storeName, 'readwrite')
  await requestToPromise(transaction.objectStore(storeName).delete(key))
  await transactionDone(transaction)
}

export const createIndexedDbLocalWorkspaceDatabase = (
  databaseName = DEFAULT_LOCAL_DATABASE_NAME,
): LocalWorkspaceDatabase => {
  let connection: Promise<IDBDatabase> | null = null
  const getConnection = (): Promise<IDBDatabase> => {
    connection ??= openIndexedDb(databaseName)
    return connection
  }

  return {
    async getCurrentUser() {
      const record = await getRecord<LocalAuthRecord>(getConnection(), 'auth', LOCAL_AUTH_KEY)
      return record?.user ?? null
    },
    setCurrentUser(user) {
      return putRecord(getConnection(), 'auth', {
        key: LOCAL_AUTH_KEY,
        user,
      } satisfies LocalAuthRecord)
    },
    clearCurrentUser() {
      return deleteRecord(getConnection(), 'auth', LOCAL_AUTH_KEY)
    },
    upsertWorkspace(record) {
      return putRecord(getConnection(), 'workspaces', record)
    },
    async loadWorkspace(query) {
      const record = await getRecord<LocalWorkspaceRecord>(getConnection(), 'workspaces', workspaceKey(query))
      return record?.snapshot ?? null
    },
    upsertScript(record) {
      return putRecord(getConnection(), 'scripts', record)
    },
    async listScripts(userId) {
      const records = await getAllRecords<LocalScriptRecord>(getConnection(), 'scripts')
      return records.filter((record) => record.userId === userId)
    },
    async loadLatestScript(query) {
      const record = await getRecord<LocalScriptRecord>(getConnection(), 'scripts', scriptKey(query))
      return record ?? null
    },
    deleteScript(query) {
      return deleteRecord(getConnection(), 'scripts', scriptKey(query))
    },
    uploadGalleryFile(record) {
      return putRecord(getConnection(), 'galleryFiles', record)
    },
    insertGalleryAsset(record) {
      return putRecord(getConnection(), 'galleryAssets', record)
    },
    async listGalleryAssets(userId) {
      const records = await getAllRecords<LocalGalleryAssetRecord>(getConnection(), 'galleryAssets')
      return records.filter((record) => record.userId === userId)
    },
    deleteGalleryAssetRecord(query) {
      return deleteRecord(getConnection(), 'galleryAssets', query.assetId)
    },
    async downloadGalleryFile(storagePath) {
      const record = await getRecord<LocalGalleryFileRecord>(getConnection(), 'galleryFiles', storagePath)
      return record?.blob ?? null
    },
    deleteGalleryFile(storagePath) {
      return deleteRecord(getConnection(), 'galleryFiles', storagePath)
    },
  }
}

export const createMemoryLocalWorkspaceDatabase = (): LocalWorkspaceDatabase => {
  let currentUser: WorkspaceCloudUser | null = null
  const workspaces = new Map<string, LocalWorkspaceRecord>()
  const scripts = new Map<string, LocalScriptRecord>()
  const galleryAssets = new Map<string, LocalGalleryAssetRecord>()
  const galleryFiles = new Map<string, LocalGalleryFileRecord>()

  return {
    async getCurrentUser() {
      return currentUser
    },
    async setCurrentUser(user) {
      currentUser = user
    },
    async clearCurrentUser() {
      currentUser = null
    },
    async upsertWorkspace(record) {
      workspaces.set(record.key, record)
    },
    async loadWorkspace(query) {
      return workspaces.get(workspaceKey(query))?.snapshot ?? null
    },
    async upsertScript(record) {
      scripts.set(record.key, record)
    },
    async listScripts(userId) {
      return [...scripts.values()].filter((record) => record.userId === userId)
    },
    async loadLatestScript(query) {
      return scripts.get(scriptKey(query)) ?? null
    },
    async deleteScript(query) {
      scripts.delete(scriptKey(query))
    },
    async uploadGalleryFile(record) {
      galleryFiles.set(record.storagePath, record)
    },
    async insertGalleryAsset(record) {
      galleryAssets.set(record.id, record)
    },
    async listGalleryAssets(userId) {
      return [...galleryAssets.values()].filter((record) => record.userId === userId)
    },
    async deleteGalleryAssetRecord(query) {
      galleryAssets.delete(query.assetId)
    },
    async downloadGalleryFile(storagePath) {
      return galleryFiles.get(storagePath)?.blob ?? null
    },
    async deleteGalleryFile(storagePath) {
      galleryFiles.delete(storagePath)
    },
  }
}
