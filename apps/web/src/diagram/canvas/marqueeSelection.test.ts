/**
 * Purpose: Verify marquee-selection geometry helpers for robust multi-select interactions.
 */

import { describe, expect, it } from 'vitest'
import type { NodeModel } from '../../model/types'
import {
  resolveMarqueeSelectionRect,
  resolveNodeIdsIntersectingMarquee,
} from './marqueeSelection'

const makeNode = (id: string, x: number, y: number, w = 120, h = 80): NodeModel => ({
  id,
  kind: 'container',
  name: id,
  tags: [],
  bounds: { x, y, w, h },
  ports: [
    { id: 'north', x: 0.5, y: 0 },
    { id: 'east', x: 1, y: 0.5 },
    { id: 'south', x: 0.5, y: 1 },
    { id: 'west', x: 0, y: 0.5 },
  ],
  children: [],
})

describe('marquee selection helpers', () => {
  it('normalizes drag direction into a positive-size selection rectangle', () => {
    expect(
      resolveMarqueeSelectionRect(
        { x: 320, y: 240 },
        { x: 140, y: 90 },
      ),
    ).toEqual({
      x: 140,
      y: 90,
      w: 180,
      h: 150,
    })
  })

  it('selects every node that intersects the marquee rectangle', () => {
    const nodes = [
      makeNode('n_a', 80, 80),
      makeNode('n_b', 260, 160),
      makeNode('n_c', 520, 320),
    ]

    const hitIds = resolveNodeIdsIntersectingMarquee(nodes, {
      x: 100,
      y: 100,
      w: 320,
      h: 200,
    })

    expect(hitIds).toEqual(['n_a', 'n_b'])
  })

  it('ignores zero-area marquee drags', () => {
    const nodes = [makeNode('n_a', 80, 80)]

    expect(
      resolveNodeIdsIntersectingMarquee(nodes, {
        x: 110,
        y: 110,
        w: 0,
        h: 0,
      }),
    ).toEqual([])
  })
})
