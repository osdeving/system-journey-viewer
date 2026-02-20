import { describe, expect, it } from 'vitest'
import type { EdgeModel, NodeModel } from '../model/types'
import { resolveEdgeCurve } from './edgeCurve'

const createNode = (id: string, x: number, y: number): NodeModel => ({
  id,
  kind: 'component',
  name: id,
  tags: [],
  bounds: { x, y, w: 120, h: 80 },
  ports: [
    { id: 'north', x: 0.5, y: 0 },
    { id: 'east', x: 1, y: 0.5 },
    { id: 'south', x: 0.5, y: 1 },
    { id: 'west', x: 0, y: 0.5 },
  ],
  children: [],
})

const createEdge = (
  fromNodeId: string,
  toNodeId: string,
  fromPortId?: string,
  toPortId?: string,
): EdgeModel => ({
  id: 'e_test',
  from: { nodeId: fromNodeId, portId: fromPortId },
  to: { nodeId: toNodeId, portId: toPortId },
  protocolPresetId: 'http',
  label: 'request',
  route: { kind: 'auto', points: [] },
  style: { arrow: true, dashed: false, thickness: 2, labelPosition: 0.5, labelSide: 'left' },
})

describe('resolveEdgeCurve', () => {
  it('keeps start and end tangents vertical for south->north connections', () => {
    const nodes = {
      source: createNode('source', 120, 80),
      target: createNode('target', 120, 340),
    }
    const edge = createEdge('source', 'target', 'south', 'north')
    const curve = resolveEdgeCurve(edge, nodes)

    expect(curve).toBeTruthy()
    if (!curve) {
      return
    }

    const startTangent = {
      x: curve.control1.x - curve.start.x,
      y: curve.control1.y - curve.start.y,
    }
    const endTangent = {
      x: curve.end.x - curve.control2.x,
      y: curve.end.y - curve.control2.y,
    }

    expect(startTangent.x).toBeCloseTo(0, 5)
    expect(startTangent.y).toBeGreaterThan(0)
    expect(endTangent.x).toBeCloseTo(0, 5)
    expect(endTangent.y).toBeGreaterThan(0)
  })

  it('keeps start and end tangents horizontal for east->west connections', () => {
    const nodes = {
      source: createNode('source', 80, 140),
      target: createNode('target', 400, 140),
    }
    const edge = createEdge('source', 'target', 'east', 'west')
    const curve = resolveEdgeCurve(edge, nodes)

    expect(curve).toBeTruthy()
    if (!curve) {
      return
    }

    const startTangent = {
      x: curve.control1.x - curve.start.x,
      y: curve.control1.y - curve.start.y,
    }
    const endTangent = {
      x: curve.end.x - curve.control2.x,
      y: curve.end.y - curve.control2.y,
    }

    expect(startTangent.x).toBeGreaterThan(0)
    expect(startTangent.y).toBeCloseTo(0, 5)
    expect(endTangent.x).toBeGreaterThan(0)
    expect(endTangent.y).toBeCloseTo(0, 5)
  })

  it('resolves nearest ports when edge endpoints omit explicit ports', () => {
    const nodes = {
      source: createNode('source', 120, 80),
      target: createNode('target', 120, 340),
    }
    const edge = createEdge('source', 'target')
    const curve = resolveEdgeCurve(edge, nodes)

    expect(curve).toBeTruthy()
    if (!curve) {
      return
    }

    expect(curve.fromPortId).toBe('south')
    expect(curve.toPortId).toBe('north')
  })
})
