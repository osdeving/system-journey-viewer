import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import type { EditorSnapshot } from '../model/types'
import {
  buildWorkspaceFilename,
  parseWorkspaceSnapshotFile,
  serializeWorkspaceSnapshotFile,
} from './workspaceFile'

const buildSnapshot = (): EditorSnapshot => ({
  workspace: createDefaultWorkspace(),
  currentViewId: 'v_container',
  viewport: { x: 10, y: 20, zoom: 1.15 },
})

describe('workspace file helpers', () => {
  it('builds stable file names from workspace names', () => {
    expect(buildWorkspaceFilename('Orders Platform Showcase')).toBe('orders-platform-showcase.sjv.json')
    expect(buildWorkspaceFilename('   ')).toBe('workspace.sjv.json')
  })

  it('serializes and parses valid snapshot files', () => {
    const snapshot = buildSnapshot()
    const payload = serializeWorkspaceSnapshotFile(snapshot)

    const parsed = parseWorkspaceSnapshotFile(payload)

    expect(parsed).toEqual(snapshot)
  })

  it('throws for invalid json payload', () => {
    expect(() => parseWorkspaceSnapshotFile('{invalid')).toThrow('Invalid JSON file.')
  })

  it('throws when snapshot shape is invalid', () => {
    expect(() => parseWorkspaceSnapshotFile(JSON.stringify({ hello: 'world' }))).toThrow(
      'Invalid workspace file format.',
    )
  })

  it('throws when current view is not present in workspace views', () => {
    const snapshot = buildSnapshot()
    const payload = JSON.stringify({
      ...snapshot,
      currentViewId: 'unknown-view-id',
    })

    expect(() => parseWorkspaceSnapshotFile(payload)).toThrow(
      'Workspace file currentViewId is missing in views.',
    )
  })
})
