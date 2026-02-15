import { describe, expect, it } from 'vitest'
import { normalizeWorkspaceNodePorts, resolveNodePorts } from './nodePorts'
import { createDefaultWorkspace } from './defaultWorkspace'

describe('resolveNodePorts', () => {
  it('keeps legacy cardinal ports and adds more by size', () => {
    const ports = resolveNodePorts({ w: 420, h: 180 })
    const ids = new Set(ports.map((port) => port.id))

    expect(ids.has('north')).toBe(true)
    expect(ids.has('south')).toBe(true)
    expect(ids.has('west')).toBe(true)
    expect(ids.has('east')).toBe(true)
    expect(ports.length).toBeGreaterThan(8)
  })

  it('does not duplicate corner side ports', () => {
    const ports = resolveNodePorts({ w: 160, h: 110 })
    const westPorts = ports.filter((port) => port.id === 'west')
    const eastPorts = ports.filter((port) => port.id === 'east')

    expect(westPorts).toHaveLength(1)
    expect(eastPorts).toHaveLength(1)
    expect(ports.some((port) => port.x === 0 && port.y === 0)).toBe(true)
    expect(ports.some((port) => port.x === 1 && port.y === 1)).toBe(true)
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
