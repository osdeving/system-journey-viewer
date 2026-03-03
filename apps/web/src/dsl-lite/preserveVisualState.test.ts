/**
 * Purpose: Verify DSL sync preserves in-memory visual state for matching nodes and edges.
 */

import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import { preserveWorkspaceVisualStateForDslSync } from './preserveVisualState'

describe('preserveWorkspaceVisualStateForDslSync', () => {
  it('keeps node bounds, port anchors, route, and edge style for matching entities', () => {
    const currentWorkspace = createDefaultWorkspace()
    const originalFromNodeId = currentWorkspace.edges.e_c_1.from.nodeId
    const originalToNodeId = currentWorkspace.edges.e_c_1.to.nodeId
    currentWorkspace.nodes.n_api.bounds = { x: 880, y: 210, w: 320, h: 180 }
    currentWorkspace.nodes.n_api.style = { fillColor: '#2563eb', textColor: '#f8fafc' }
    currentWorkspace.nodes.n_api.ports = [
      { id: 'north', x: 0.5, y: 0 },
      { id: 'east', x: 1, y: 0.5 },
    ]
    currentWorkspace.edges.e_c_1.from.portId = 'east'
    currentWorkspace.edges.e_c_1.to.portId = 'north'
    currentWorkspace.edges.e_c_1.route = {
      kind: 'manual',
      points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
    }
    currentWorkspace.edges.e_c_1.style = {
      ...currentWorkspace.edges.e_c_1.style,
      dashed: true,
      thickness: 5,
      labelPosition: 0.22,
      labelSide: 'right',
      labelFontSize: 18,
      labelAngle: 33,
    }

    const importedWorkspace = createDefaultWorkspace()
    importedWorkspace.nodes.n_api.bounds = { x: 12, y: 24, w: 80, h: 80 }
    importedWorkspace.edges.e_c_1.from = { nodeId: originalFromNodeId }
    importedWorkspace.edges.e_c_1.to = { nodeId: originalToNodeId }
    importedWorkspace.edges.e_c_1.route = { kind: 'auto', points: [] }
    importedWorkspace.edges.e_c_1.style = {
      ...importedWorkspace.edges.e_c_1.style,
      dashed: false,
      thickness: 2,
      labelPosition: 0.5,
      labelSide: 'left',
      labelFontSize: 12,
      labelAngle: 0,
    }

    const merged = preserveWorkspaceVisualStateForDslSync(importedWorkspace, currentWorkspace)

    expect(merged.nodes.n_api.bounds).toEqual(currentWorkspace.nodes.n_api.bounds)
    expect(merged.nodes.n_api.ports).toEqual(currentWorkspace.nodes.n_api.ports)
    expect(merged.nodes.n_api.style).toEqual(currentWorkspace.nodes.n_api.style)
    expect(merged.edges.e_c_1.from.portId).toBe('east')
    expect(merged.edges.e_c_1.to.portId).toBe('north')
    expect(merged.edges.e_c_1.route).toEqual(currentWorkspace.edges.e_c_1.route)
    expect(merged.edges.e_c_1.style).toEqual(currentWorkspace.edges.e_c_1.style)
  })

  it('does not reuse a port or manual route when the DSL changed an edge endpoint node', () => {
    const currentWorkspace = createDefaultWorkspace()
    const originalToNodeId = currentWorkspace.edges.e_c_1.to.nodeId
    currentWorkspace.edges.e_c_1.from.portId = 'east'
    currentWorkspace.edges.e_c_1.to.portId = 'north'
    currentWorkspace.edges.e_c_1.route = {
      kind: 'manual',
      points: [{ x: 10, y: 20 }],
    }
    currentWorkspace.edges.e_c_1.style = {
      ...currentWorkspace.edges.e_c_1.style,
      labelPosition: 0.18,
    }

    const importedWorkspace = createDefaultWorkspace()
    importedWorkspace.edges.e_c_1.from = { nodeId: 'n_api' }
    importedWorkspace.edges.e_c_1.to = { nodeId: originalToNodeId }
    importedWorkspace.edges.e_c_1.route = { kind: 'auto', points: [] }

    const merged = preserveWorkspaceVisualStateForDslSync(importedWorkspace, currentWorkspace)

    expect(merged.edges.e_c_1.from.portId).toBeUndefined()
    expect(merged.edges.e_c_1.to.portId).toBe('north')
    expect(merged.edges.e_c_1.route).toEqual(importedWorkspace.edges.e_c_1.route)
    expect(merged.edges.e_c_1.style.labelPosition).toBe(0.18)
  })
})
