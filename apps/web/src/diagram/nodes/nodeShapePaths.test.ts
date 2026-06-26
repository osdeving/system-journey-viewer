/**
 * Purpose: Verify node Shape Paths behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  CYLINDER_NODE_MAX_WIDTH_TO_HEIGHT_RATIO,
  resolveCylinderNodeBounds,
  resolveDbCylinderShape,
  resolveHexagonShape,
  resolveQueueCylinderShape,
} from './nodeShapePaths'

describe('node shape paths', () => {
  it('constrains cylinder node bounds to avoid stretched db and queue presets', () => {
    const bounds = resolveCylinderNodeBounds('queue', { x: 40, y: 20, w: 520, h: 80 })

    expect(bounds).toEqual({
      x: 40,
      y: 20,
      w: 80 * CYLINDER_NODE_MAX_WIDTH_TO_HEIGHT_RATIO,
      h: 80,
    })
  })

  it('preserves the requested horizontal anchor while constraining cylinder bounds', () => {
    const eastAnchored = resolveCylinderNodeBounds(
      'db',
      { x: 40, y: 20, w: 520, h: 100 },
      { horizontalAnchor: 'east' },
    )
    const centered = resolveCylinderNodeBounds(
      'db',
      { x: 40, y: 20, w: 520, h: 100 },
      { horizontalAnchor: 'center' },
    )

    expect(eastAnchored.x + eastAnchored.w).toBe(560)
    expect(centered.x + centered.w / 2).toBe(300)
  })

  it('leaves non-cylinder node bounds unchanged', () => {
    const bounds = { x: 40, y: 20, w: 520, h: 80 }

    expect(resolveCylinderNodeBounds('container', bounds)).toBe(bounds)
  })

  it('builds db cylinder shell and rim arcs', () => {
    const shape = resolveDbCylinderShape(320, 120)

    expect(shape.capRy).toBeCloseTo(19.2, 1)
    expect(shape.shellPath).toContain(`M 0 ${shape.capRy}`)
    expect(shape.shellPath.endsWith(' Z')).toBe(true)
    expect(shape.topFrontArcPath).toContain(' 0 0 0 ')
    expect(shape.bottomBackArcPath).toContain(' 0 0 1 ')
  })

  it('clamps queue cap width for narrow nodes', () => {
    const shape = resolveQueueCylinderShape(40, 60)

    expect(shape.capRx).toBe(10)
    expect(shape.capRy).toBe(30)
    expect(shape.shellPath).toContain('M 10 0')
    expect(shape.shellPath).toContain('H 30')
    expect(shape.frontCapPath).toContain('A 10 30')
  })

  it('keeps queue cap width bounded on wide nodes', () => {
    const shape = resolveQueueCylinderShape(320, 90)

    expect(shape.capRx).toBeCloseTo(57.6, 1)
    expect(shape.capRx).toBeLessThan(160)
    expect(shape.rearInnerArcPath).toContain('0 0 1')
  })

  it('builds a closed hexagon path for infra nodes', () => {
    const shape = resolveHexagonShape(220, 120)

    expect(shape.shellPath).toBe('M 55 0 L 165 0 L 220 60 L 165 120 L 55 120 L 0 60 Z')
  })

  it('supports inset for interaction overlays', () => {
    const shape = resolveHexagonShape(200, 100, 6)

    expect(shape.shellPath).toBe('M 53 6 L 147 6 L 194 50 L 147 94 L 53 94 L 6 50 Z')
  })
})
