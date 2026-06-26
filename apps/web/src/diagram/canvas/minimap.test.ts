/**
 * Purpose: Verify minimap bounds, viewport projection, and click-to-world mapping.
 */

import { describe, expect, it } from 'vitest'
import { resolveMinimapModel, resolveMinimapWorldPoint, type MinimapSourceNode } from './minimap'

const nodes: MinimapSourceNode[] = [
  {
    id: 'n-1',
    kind: 'container',
    bounds: { x: 100, y: 80, w: 200, h: 120 },
  },
  {
    id: 'n-2',
    kind: 'db',
    bounds: { x: 620, y: 420, w: 180, h: 120 },
  },
]

describe('resolveMinimapModel', () => {
  it('projects nodes and the current viewport into minimap coordinates', () => {
    const model = resolveMinimapModel({
      nodes,
      viewport: { x: -50, y: -40, zoom: 1 },
      canvasSize: { width: 500, height: 300 },
      minimapSize: { width: 200, height: 120 },
      worldPadding: 0,
    })

    expect(model).not.toBeNull()
    expect(model?.nodes).toHaveLength(2)
    expect(model?.nodes[0].width).toBeGreaterThan(2)
    expect(model?.viewport.width).toBeGreaterThan(model?.nodes[0].width ?? 0)
  })

  it('includes the viewport in world bounds when panned away from nodes', () => {
    const model = resolveMinimapModel({
      nodes,
      viewport: { x: -1800, y: -1200, zoom: 1 },
      canvasSize: { width: 500, height: 300 },
      minimapSize: { width: 200, height: 120 },
      worldPadding: 0,
    })

    expect(model?.worldBounds.x).toBeLessThanOrEqual(100)
    expect((model?.worldBounds.x ?? 0) + (model?.worldBounds.width ?? 0)).toBeGreaterThanOrEqual(2300)
  })

  it('maps minimap click coordinates back into world coordinates', () => {
    const model = resolveMinimapModel({
      nodes,
      viewport: { x: -50, y: -40, zoom: 1 },
      canvasSize: { width: 500, height: 300 },
      minimapSize: { width: 200, height: 120 },
      worldPadding: 0,
    })

    expect(model).not.toBeNull()
    if (!model) {
      return
    }

    const worldPoint = resolveMinimapWorldPoint(
      {
        x: model.offsetX + (250 - model.worldBounds.x) * model.scale,
        y: model.offsetY + (160 - model.worldBounds.y) * model.scale,
      },
      model,
    )

    expect(worldPoint.x).toBeCloseTo(250)
    expect(worldPoint.y).toBeCloseTo(160)
  })

  it('returns null when there is no diagram content', () => {
    expect(
      resolveMinimapModel({
        nodes: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        canvasSize: { width: 500, height: 300 },
        minimapSize: { width: 200, height: 120 },
      }),
    ).toBeNull()
  })
})
