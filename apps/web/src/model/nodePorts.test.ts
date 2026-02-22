/**
 * Purpose: Verify node Ports behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { normalizeWorkspaceNodePorts, resolveNodePorts } from './nodePorts'
import { createDefaultWorkspace } from './defaultWorkspace'

describe('resolveNodePorts', () => {
  it('keeps legacy cardinal ports and adds denser ports by size', () => {
    const ports = resolveNodePorts({ w: 420, h: 180 })
    const ids = new Set(ports.map((port) => port.id))

    expect(ids.has('north')).toBe(true)
    expect(ids.has('south')).toBe(true)
    expect(ids.has('west')).toBe(true)
    expect(ids.has('east')).toBe(true)
    expect(ports.length).toBeGreaterThan(12)
  })

  it('avoids corner ports on top and bottom edges', () => {
    const ports = resolveNodePorts({ w: 160, h: 110 })
    const westPorts = ports.filter((port) => port.id === 'west')
    const eastPorts = ports.filter((port) => port.id === 'east')

    expect(westPorts).toHaveLength(1)
    expect(eastPorts).toHaveLength(1)
    expect(ports.some((port) => port.x === 0 && port.y === 0)).toBe(false)
    expect(ports.some((port) => port.x === 1 && port.y === 1)).toBe(false)
    expect(ports.some((port) => port.id === 'north' && port.x === 0.5)).toBe(true)
    expect(ports.some((port) => port.id === 'south' && port.x === 0.5)).toBe(true)
  })
})

describe('normalizeWorkspaceNodePorts', () => {
  it('normalizes all nodes with dynamic ports', () => {
    const workspace = createDefaultWorkspace()
    workspace.nodes.n_api.ports = [{ id: 'north', x: 0.5, y: 0 }]

    const normalized = normalizeWorkspaceNodePorts(workspace)

    expect(normalized.nodes.n_api.ports.length).toBeGreaterThan(4)
    expect(normalized.nodes.n_db.ports.length).toBeGreaterThan(4)
  })
})
