/**
 * Purpose: Verify geometry behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import type { NodeModel } from '../model/types'
import { nearestPortId, snapBounds, snapBoundsWithGuides } from './geometry'

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

  it('returns alignment guides when a node snaps to another node edge or center', () => {
    const nodes = {
      n1: makeNode('n1', 100, 100),
      n2: makeNode('n2', 400, 100),
    }

    const result = snapBoundsWithGuides(
      { x: 295, y: 102, w: 200, h: 100 },
      'n2',
      nodes,
      {
        gridSize: 20,
        snapGrid: true,
        snapShapes: true,
        threshold: 10,
      },
    )

    expect(result.bounds.x).toBe(300)
    expect(result.bounds.y).toBe(100)
    expect(result.guides).toContainEqual(
      expect.objectContaining({
        orientation: 'vertical',
        x: 300,
      }),
    )
    expect(result.guides).toContainEqual(
      expect.objectContaining({
        orientation: 'horizontal',
        y: 100,
      }),
    )
  })

  it('omits alignment guides when shape snapping is disabled', () => {
    const nodes = {
      n1: makeNode('n1', 100, 100),
      n2: makeNode('n2', 400, 100),
    }

    const result = snapBoundsWithGuides(
      { x: 295, y: 102, w: 200, h: 100 },
      'n2',
      nodes,
      {
        gridSize: 20,
        snapGrid: true,
        snapShapes: false,
        threshold: 10,
      },
    )

    expect(result.guides).toEqual([])
  })

  it('ignores excluded nodes while resolving multi-select snapping', () => {
    const nodes = {
      n1: makeNode('n1', 100, 100),
      n2: makeNode('n2', 300, 100),
      n3: makeNode('n3', 500, 100),
    }

    const result = snapBoundsWithGuides(
      { x: 295, y: 100, w: 200, h: 100 },
      'n2',
      nodes,
      {
        gridSize: 20,
        snapGrid: true,
        snapShapes: true,
        threshold: 10,
        excludeNodeIds: ['n1', 'n2'],
      },
    )

    expect(result.bounds.x).toBe(300)
    expect(result.guides).toContainEqual(
      expect.objectContaining({
        orientation: 'vertical',
        x: 500,
      }),
    )
    expect(result.guides).not.toContainEqual(
      expect.objectContaining({
        orientation: 'vertical',
        x: 300,
      }),
    )
  })
})
