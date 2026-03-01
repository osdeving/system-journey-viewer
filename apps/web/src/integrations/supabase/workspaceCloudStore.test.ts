/**
 * Purpose: Verify Supabase cloud auth and workspace persistence behavior with injected deps.
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
  const upsertWorkspace = vi.fn().mockResolvedValue({ error: null })
  const loadWorkspace = vi.fn().mockResolvedValue({
    snapshot: sampleSnapshot,
    error: null,
  })

  return {
    deps: {
      signInWithPassword,
      signOut,
      getCurrentUser,
      onAuthStateChange,
      upsertWorkspace,
      loadWorkspace,
    },
    mocks: {
      signInWithPassword,
      signOut,
      getCurrentUser,
      onAuthStateChange,
      upsertWorkspace,
      loadWorkspace,
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
