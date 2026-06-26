/**
 * Purpose: Verify the local database WorkspaceCloudStore implementation without Supabase.
 */

import { describe, expect, it, vi } from 'vitest'
import { createDefaultWorkspace } from '../../model/defaultWorkspace'
import type { EditorSnapshot } from '../../model/types'
import {
  createLocalWorkspaceCloudStore,
  createMemoryLocalWorkspaceDatabase,
} from './localWorkspaceCloudStore'

const sampleSnapshot: EditorSnapshot = {
  workspace: createDefaultWorkspace(),
  currentViewId: 'v_container',
  viewport: { x: 100, y: 80, zoom: 1 },
}

const createStore = () =>
  createLocalWorkspaceCloudStore({
    database: createMemoryLocalWorkspaceDatabase(),
    createId: () => 'asset-1',
    createPreviewUrl: (blob) => `blob:local-preview/${blob.size}`,
  })

describe('createLocalWorkspaceCloudStore', () => {
  it('persists workspaces, scripts, and gallery assets behind the cloud store contract', async () => {
    const store = createStore()

    const user = await store.signIn('tester@example.com', 'local-secret')

    await store.saveWorkspace(sampleSnapshot)
    await store.saveScript(sampleSnapshot.workspace.workspace.id, 'Orders Platform Showcase', 'workspace "Orders"')
    const createdAsset = await store.uploadGalleryAssetBlob(new Blob(['png'], { type: 'image/png' }), {
      fileName: 'diagram export.png',
      title: 'Workspace PNG Export',
    })

    const loadedWorkspace = await store.loadWorkspace(sampleSnapshot.workspace.workspace.id)
    const scripts = await store.listScripts()
    const loadedScript = await store.loadLatestScript(sampleSnapshot.workspace.workspace.id)
    const assets = await store.listGalleryAssets()
    const downloadedAsset = await store.downloadGalleryAsset(createdAsset.storagePath)
    const previewUrl = await store.createGalleryAssetPreviewUrl(createdAsset.storagePath)

    expect(user.id).toMatch(/^local-tester-[0-9a-f]{8}$/)
    expect(user.email).toBe('tester@example.com')
    expect(loadedWorkspace).toEqual(sampleSnapshot)
    expect(scripts).toEqual([
      {
        workspaceId: sampleSnapshot.workspace.workspace.id,
        title: 'Orders Platform Showcase',
        updatedAt: expect.any(String),
      },
    ])
    expect(loadedScript?.content).toBe('workspace "Orders"')
    expect(createdAsset).toMatchObject({
      id: 'asset-1',
      title: 'Workspace PNG Export',
      fileName: 'diagram-export.png',
      storagePath: `${user.id}/asset-1/diagram-export.png`,
      contentType: 'image/png',
      sizeBytes: 3,
    })
    expect(assets).toHaveLength(1)
    expect(downloadedAsset.size).toBe(3)
    expect(previewUrl).toBe('blob:local-preview/3')

    await store.deleteScript(sampleSnapshot.workspace.workspace.id)
    await store.deleteGalleryAsset(createdAsset)

    expect(await store.listScripts()).toEqual([])
    expect(await store.listGalleryAssets()).toEqual([])
    await expect(store.downloadGalleryAsset(createdAsset.storagePath)).rejects.toThrow(
      'Local gallery file was not found.',
    )
  })

  it('requires the same sign-in flow and emits local auth changes', async () => {
    const store = createStore()
    const callback = vi.fn()

    const unsubscribe = store.observeAuth(callback)
    await Promise.resolve()
    await expect(store.saveWorkspace(sampleSnapshot)).rejects.toThrow(
      'Sign in to local database before using cloud save/load.',
    )

    const user = await store.signIn('tester@example.com', 'local-secret')
    await store.signOut()
    unsubscribe()

    expect(callback).toHaveBeenCalledWith(null)
    expect(callback).toHaveBeenCalledWith(user)
    expect(callback).toHaveBeenLastCalledWith(null)
  })
})
