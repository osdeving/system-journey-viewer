/**
 * Purpose: Verify Supabase cloud auth plus workspace/script/gallery behavior with injected deps.
 */

import { describe, expect, it, vi } from 'vitest'
import { createDefaultWorkspace } from '../../model/defaultWorkspace'
import type { EditorSnapshot } from '../../model/types'
import { createSupabaseWorkspaceCloudStore } from './workspaceCloudStore'

const sampleSnapshot: EditorSnapshot = {
  workspace: createDefaultWorkspace(),
  currentViewId: 'v_container',
  viewport: { x: 100, y: 80, zoom: 1 },
}

const sampleFile = {
  name: 'demo export.mp4',
  type: 'video/mp4',
  size: 4096,
} as File

const createDeps = () => {
  const signInWithPassword = vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'tester@example.com' },
    error: null,
  })
  const signOut = vi.fn().mockResolvedValue({ error: null })
  const getCurrentUser = vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'tester@example.com' },
    error: null,
  })
  const onAuthStateChange = vi.fn((callback: (user: { id: string; email: string | null } | null) => void) => {
    callback({ id: 'user-1', email: 'tester@example.com' })
    return () => undefined
  })
  const createId = vi.fn().mockReturnValue('asset-1')
  const upsertWorkspace = vi.fn().mockResolvedValue({ error: null })
  const loadWorkspace = vi.fn().mockResolvedValue({
    snapshot: sampleSnapshot,
    error: null,
  })
  const upsertScript = vi.fn().mockResolvedValue({ error: null })
  const loadLatestScript = vi.fn().mockResolvedValue({
    script: {
      workspaceId: sampleSnapshot.workspace.workspace.id,
      title: 'Orders Platform Showcase',
      content: 'workspace "Orders"',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    error: null,
  })
  const uploadGalleryFile = vi.fn().mockResolvedValue({ error: null })
  const insertGalleryAsset = vi.fn().mockResolvedValue({
    asset: {
      id: 'asset-row-1',
      title: 'demo export.mp4',
      fileName: 'demo-export.mp4',
      storagePath: 'user-1/asset-1/demo-export.mp4',
      contentType: 'video/mp4',
      sizeBytes: 4096,
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    error: null,
  })
  const listGalleryAssets = vi.fn().mockResolvedValue({
    assets: [
      {
        id: 'asset-row-1',
        title: 'demo export.mp4',
        fileName: 'demo-export.mp4',
        storagePath: 'user-1/asset-1/demo-export.mp4',
        contentType: 'video/mp4',
        sizeBytes: 4096,
        createdAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    error: null,
  })
  const downloadGalleryFile = vi.fn().mockResolvedValue({
    blob: new Blob(['demo']),
    error: null,
  })

  return {
    deps: {
      signInWithPassword,
      signOut,
      getCurrentUser,
      onAuthStateChange,
      createId,
      upsertWorkspace,
      loadWorkspace,
      upsertScript,
      loadLatestScript,
      uploadGalleryFile,
      insertGalleryAsset,
      listGalleryAssets,
      downloadGalleryFile,
    },
    mocks: {
      signInWithPassword,
      signOut,
      getCurrentUser,
      onAuthStateChange,
      createId,
      upsertWorkspace,
      loadWorkspace,
      upsertScript,
      loadLatestScript,
      uploadGalleryFile,
      insertGalleryAsset,
      listGalleryAssets,
      downloadGalleryFile,
    },
  }
}

describe('createSupabaseWorkspaceCloudStore', () => {
  it('saves the current workspace snapshot for the signed-in user', async () => {
    const { deps, mocks } = createDeps()
    const store = createSupabaseWorkspaceCloudStore(deps)

    await store.saveWorkspace(sampleSnapshot)

    expect(mocks.upsertWorkspace).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: sampleSnapshot.workspace.workspace.id,
      name: sampleSnapshot.workspace.workspace.name,
      snapshot: sampleSnapshot,
    })
  })

  it('loads a workspace snapshot for the signed-in user', async () => {
    const { deps, mocks } = createDeps()
    const store = createSupabaseWorkspaceCloudStore(deps)

    const loaded = await store.loadWorkspace(sampleSnapshot.workspace.workspace.id)

    expect(loaded).toEqual(sampleSnapshot)
    expect(mocks.loadWorkspace).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: sampleSnapshot.workspace.workspace.id,
    })
  })

  it('saves and loads the generated script per workspace', async () => {
    const { deps, mocks } = createDeps()
    const store = createSupabaseWorkspaceCloudStore(deps)

    await store.saveScript(sampleSnapshot.workspace.workspace.id, 'Orders Platform Showcase', 'workspace "Orders"')
    const loaded = await store.loadLatestScript(sampleSnapshot.workspace.workspace.id)

    expect(mocks.upsertScript).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: sampleSnapshot.workspace.workspace.id,
      title: 'Orders Platform Showcase',
      content: 'workspace "Orders"',
    })
    expect(mocks.loadLatestScript).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: sampleSnapshot.workspace.workspace.id,
    })
    expect(loaded?.content).toBe('workspace "Orders"')
  })

  it('uploads, lists, and downloads gallery files inside the signed-in user scope', async () => {
    const { deps, mocks } = createDeps()
    const store = createSupabaseWorkspaceCloudStore(deps)

    const created = await store.uploadGalleryAsset(sampleFile)
    const listed = await store.listGalleryAssets()
    const blob = await store.downloadGalleryAsset(created.storagePath)

    expect(mocks.createId).toHaveBeenCalledTimes(1)
    expect(mocks.uploadGalleryFile).toHaveBeenCalledWith({
      path: 'user-1/asset-1/demo-export.mp4',
      file: sampleFile,
      contentType: 'video/mp4',
    })
    expect(mocks.insertGalleryAsset).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'demo-export.mp4',
      fileName: 'demo-export.mp4',
      storagePath: 'user-1/asset-1/demo-export.mp4',
      contentType: 'video/mp4',
      sizeBytes: 4096,
    })
    expect(mocks.listGalleryAssets).toHaveBeenCalledWith('user-1')
    expect(mocks.downloadGalleryFile).toHaveBeenCalledWith('user-1/asset-1/demo-export.mp4')
    expect(created.fileName).toBe('demo-export.mp4')
    expect(listed).toHaveLength(1)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('requires a signed-in user before cloud persistence', async () => {
    const { deps } = createDeps()
    deps.getCurrentUser = vi.fn().mockResolvedValue({
      user: null,
      error: null,
    })
    const store = createSupabaseWorkspaceCloudStore(deps)

    await expect(store.saveWorkspace(sampleSnapshot)).rejects.toThrow(
      'Sign in to Supabase before using cloud save/load.',
    )
  })

  it('surfaces auth changes and sign-in credentials', async () => {
    const { deps, mocks } = createDeps()
    const store = createSupabaseWorkspaceCloudStore(deps)
    const callback = vi.fn()

    const unsubscribe = store.observeAuth(callback)
    const user = await store.signIn('tester@example.com', 'secret')
    await store.signOut()

    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'tester@example.com',
    })
    expect(user).toEqual({
      id: 'user-1',
      email: 'tester@example.com',
    })
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'tester@example.com',
      password: 'secret',
    })
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(typeof unsubscribe).toBe('function')
  })
})
