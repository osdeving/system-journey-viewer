import { describe, expect, it } from 'vitest'
import type { NodeModel } from '../model/types'
import { nearestPortId, snapBounds } from './geometry'

const makeNode = (id: string, x: number, y: number): NodeModel => ({
  id,
  kind: 'container',
  name: id,
  tags: [],
  bounds: { x, y, w: 200, h: 100 },
  ports: [
    { id: 'north', x: 0.5, y: 0 },
    { id: 'east', x: 1, y: 0.5 },
    { id: 'south', x: 0.5, y: 1 },
    { id: 'west', x: 0, y: 0.5 },
  ],
  children: [],
})

describe('geometry helpers', () => {
  it('selects nearest port by target point', () => {
    const node = makeNode('n1', 100, 100)

    const nearest = nearestPortId(node, { x: 350, y: 150 })

    expect(nearest).toBe('east')
  })

  it('snaps bounds to grid and sibling edges', () => {
    const nodes = {
      n1: makeNode('n1', 100, 100),
      n2: makeNode('n2', 400, 100),
    }
    const candidate = { x: 293, y: 107, w: 210, h: 108 }

    const snapped = snapBounds(candidate, 'n2', nodes, {
      gridSize: 20,
      snapGrid: true,
      snapShapes: true,
      threshold: 10,
    })

    expect(snapped.x).toBe(300)
    expect(snapped.y).toBe(100)
    expect(snapped.w % 20).toBe(0)
  })
})
