import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import { resolveNodePorts } from '../model/nodePorts'
import { resolveJourneyFocusScope } from './focus'

describe('resolveJourneyFocusScope', () => {
  it('returns null when journey does not exist', () => {
    const workspace = createDefaultWorkspace()
    const scope = resolveJourneyFocusScope(workspace, 'v_container', 'j_missing')
    expect(scope).toBeNull()
  })

  it('collects focused nodes and edges for a journey in the current view', () => {
    const workspace = createDefaultWorkspace()
    const scope = resolveJourneyFocusScope(workspace, 'v_container', 'j_c_1')
    expect(scope).not.toBeNull()
    if (!scope) {
      return
    }

    expect(scope.edgeIds.has('e_c_1')).toBe(true)
    expect(scope.nodeIds.has('n_frontend')).toBe(true)
    expect(scope.nodeIds.has('n_gateway')).toBe(true)
    expect(scope.nodeIds.has('n_api')).toBe(true)
  })

  it('includes boundary parents when they contain focused journey nodes', () => {
    const workspace = createDefaultWorkspace()
    const bounds = { x: 300, y: 80, w: 640, h: 380 }
    workspace.nodes.n_boundary = {
      id: 'n_boundary',
      presetId: 'boundary',
      kind: 'boundary',
      name: 'Core Group',
      tags: [],
      bounds,
      ports: resolveNodePorts(bounds),
      children: ['n_gateway', 'n_api'],
    }
    workspace.views.v_container.nodeIds.push('n_boundary')

    const scope = resolveJourneyFocusScope(workspace, 'v_container', 'j_c_1')
    expect(scope).not.toBeNull()
    if (!scope) {
      return
    }
    expect(scope.nodeIds.has('n_boundary')).toBe(true)
  })
})
