import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import { loadSnapshot, saveSnapshot, storageKeyForView } from './persistence'

class MemoryStorage {
  private readonly payload = new Map<string, string>()

  getItem(key: string): string | null {
    return this.payload.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.payload.set(key, value)
  }
}

describe('persistence helpers', () => {
  it('saves and loads a valid snapshot', () => {
    const storage = new MemoryStorage()
    const workspace = createDefaultWorkspace()
    const snapshot = {
      workspace,
      currentViewId: 'v_container',
      viewport: { x: 10, y: 20, zoom: 1.2 },
    }

    saveSnapshot(snapshot, storage)
    const loaded = loadSnapshot(workspace.workspace.id, 'v_container', storage)

    expect(loaded).toEqual(snapshot)
  })

  it('returns null when payload is invalid', () => {
    const storage = new MemoryStorage()
    const key = storageKeyForView('workspace-default', 'v_container')
    storage.setItem(key, '{"invalid":true}')

    const loaded = loadSnapshot('workspace-default', 'v_container', storage)

    expect(loaded).toBeNull()
  })
})
