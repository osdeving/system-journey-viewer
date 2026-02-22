/**
 * Purpose: Verify layout Persistence behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import {
  applyWorkspaceLayout,
  buildWorkspaceLayoutSnapshot,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
} from './layoutPersistence'

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

describe('layoutPersistence', () => {
  it('builds per-view layout snapshots with node bounds and edge labels', () => {
    const workspace = createDefaultWorkspace()
    workspace.nodes.n_api.style = { fillColor: '#2563eb', textColor: '#f8fafc' }
    workspace.edges.e_c_1.style.labelFontSize = 15
    workspace.edges.e_c_1.style.labelSide = 'right'
    workspace.edges.e_c_1.style.labelAngle = -22
    const snapshot = buildWorkspaceLayoutSnapshot(workspace)

    expect(snapshot.workspaceId).toBe(workspace.workspace.id)
    expect(snapshot.views.v_container.nodes.n_api).toEqual(workspace.nodes.n_api.bounds)
    expect(snapshot.views.v_container.nodeFillColors.n_api).toBe('#2563eb')
    expect(snapshot.views.v_container.nodeTextColors.n_api).toBe('#f8fafc')
    expect(snapshot.views.v_container.edgeLabelPositions.e_c_1).toBeCloseTo(0.5, 5)
    expect(snapshot.views.v_container.edgeLabelSides.e_c_1).toBe('right')
    expect(snapshot.views.v_container.edgeLabelFontSizes.e_c_1).toBe(15)
    expect(snapshot.views.v_container.edgeLabelAngles.e_c_1).toBe(-22)
  })

  it('saves and loads layout snapshot from storage', () => {
    const workspace = createDefaultWorkspace()
    const storage = createInMemoryStorage()

    saveWorkspaceLayout(workspace, storage)
    const loaded = loadWorkspaceLayout(workspace.workspace.id, storage)

    expect(loaded).not.toBeNull()
    expect(loaded?.workspaceId).toBe(workspace.workspace.id)
    expect(loaded?.views.v_container).toBeDefined()
  })

  it('applies persisted layout to workspace safely with clamped label position', () => {
    const workspace = createDefaultWorkspace()
    const snapshot = buildWorkspaceLayoutSnapshot(workspace)
    snapshot.views.v_container.nodes.n_api = { x: 999, y: 888, w: 330, h: 210 }
    snapshot.views.v_container.nodeFillColors.n_api = '#22c55e'
    snapshot.views.v_container.nodeTextColors.n_api = '#ffffff'
    snapshot.views.v_container.edgeLabelPositions.e_c_1 = 3
    snapshot.views.v_container.edgeLabelSides.e_c_1 = 'right'
    snapshot.views.v_container.edgeLabelFontSizes.e_c_1 = 999
    snapshot.views.v_container.edgeLabelAngles.e_c_1 = -999

    const updated = applyWorkspaceLayout(workspace, snapshot)
    expect(updated.nodes.n_api.bounds).toEqual({ x: 999, y: 888, w: 330, h: 210 })
    expect(updated.nodes.n_api.style?.fillColor).toBe('#22c55e')
    expect(updated.nodes.n_api.style?.textColor).toBe('#ffffff')
    expect(updated.edges.e_c_1.style.labelPosition).toBeCloseTo(0.92, 5)
    expect(updated.edges.e_c_1.style.labelSide).toBe('right')
    expect(updated.edges.e_c_1.style.labelFontSize).toBe(64)
    expect(updated.edges.e_c_1.style.labelAngle).toBe(-180)
  })
})
