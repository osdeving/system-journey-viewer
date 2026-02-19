import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import type { EditorSnapshot } from '../model/types'
import { loadRecentWorkspaces, rememberRecentWorkspace } from './recentWorkspaces'

type InMemoryStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

const createInMemoryStorage = (): InMemoryStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

const buildSnapshot = (workspaceId: string, workspaceName: string): EditorSnapshot => {
  const workspace = createDefaultWorkspace()
  workspace.workspace.id = workspaceId
  workspace.workspace.name = workspaceName
  return {
    workspace,
    currentViewId: 'v_container',
    viewport: { x: 100, y: 80, zoom: 1 },
  }
}

describe('recentWorkspaces', () => {
  it('stores at most 3 recent workspaces', () => {
    const storage = createInMemoryStorage()

    rememberRecentWorkspace(buildSnapshot('w_1', 'A'), '{"a":1}', 'a.sjv.json', storage)
    rememberRecentWorkspace(buildSnapshot('w_2', 'B'), '{"b":1}', 'b.sjv.json', storage)
    rememberRecentWorkspace(buildSnapshot('w_3', 'C'), '{"c":1}', 'c.sjv.json', storage)
    rememberRecentWorkspace(buildSnapshot('w_4', 'D'), '{"d":1}', 'd.sjv.json', storage)

    const loaded = loadRecentWorkspaces(storage)
    expect(loaded).toHaveLength(3)
    expect(loaded.map((entry) => entry.id)).toEqual(['w_4', 'w_3', 'w_2'])
  })

  it('moves existing workspace to top when saved again', () => {
    const storage = createInMemoryStorage()

    rememberRecentWorkspace(buildSnapshot('w_1', 'A'), '{"a":1}', 'a.sjv.json', storage)
    rememberRecentWorkspace(buildSnapshot('w_2', 'B'), '{"b":1}', 'b.sjv.json', storage)
    rememberRecentWorkspace(buildSnapshot('w_1', 'A'), '{"a":2}', 'a.sjv.json', storage)

    const loaded = loadRecentWorkspaces(storage)
    expect(loaded).toHaveLength(2)
    expect(loaded[0].id).toBe('w_1')
    expect(loaded[0].payload).toBe('{"a":2}')
    expect(loaded[1].id).toBe('w_2')
  })

  it('returns empty list for malformed payload', () => {
    const storage = createInMemoryStorage()
    storage.setItem('sjv:recent-workspaces:v1', 'malformed')

    expect(loadRecentWorkspaces(storage)).toEqual([])
  })
})
