import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './useEditorStore'

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().resetWorkspace()
    useEditorStore.getState().setActiveTool('select')
  })

  it('adds a node in current view', () => {
    const state = useEditorStore.getState()
    const beforeCount = state.workspace.views[state.currentViewId].nodeIds.length

    const nodeId = state.addNode('container', 40, 60)
    const after = useEditorStore.getState()
    const afterCount = after.workspace.views[after.currentViewId].nodeIds.length

    expect(afterCount).toBe(beforeCount + 1)
    expect(after.workspace.nodes[nodeId]).toBeDefined()
    expect(after.selectedNodeId).toBe(nodeId)
  })

  it('connects nodes when connector tool is active', () => {
    const state = useEditorStore.getState()
    state.beginConnection('n_api')
    state.connectPendingTo('n_kafka')
    const updated = useEditorStore.getState()
    const edgeId = updated.workspace.views[updated.currentViewId].edgeIds.at(-1)

    expect(edgeId).toBeDefined()
    expect(edgeId ? updated.workspace.edges[edgeId].from.nodeId : '').toBe('n_api')
    expect(edgeId ? updated.workspace.edges[edgeId].to.nodeId : '').toBe('n_kafka')
  })
})
