/**
 * Purpose: Verify node Shape Paths behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  resolveDbCylinderShape,
  resolveDiamondShape,
  resolveHexagonShape,
  resolveQueueCylinderShape,
  resolveTriangleShape,
} from './nodeShapePaths'

describe('node shape paths', () => {
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

    expect(shape.capRx).toBe(19)
    expect(shape.capRy).toBe(30)
    expect(shape.shellPath).toContain('M 19 0')
    expect(shape.shellPath).toContain('H 21')
    expect(shape.frontCapPath).toContain('A 19 30')
  })

  it('keeps queue cap width fixed while the body stretches horizontally', () => {
    const defaultWidth = resolveQueueCylinderShape(180, 90)
    const shape = resolveQueueCylinderShape(320, 90)
    const stretched = resolveQueueCylinderShape(640, 90)

    expect(shape.capRx).toBeCloseTo(defaultWidth.capRx, 1)
    expect(stretched.capRx).toBeCloseTo(defaultWidth.capRx, 1)
    expect(shape.shellPath).toContain(`H ${320 - shape.capRx}`)
    expect(stretched.frontCapPath).toContain(`M ${640 - stretched.capRx} 0`)
  })

  it('builds a closed hexagon path for infra nodes', () => {
    const shape = resolveHexagonShape(220, 120)

    expect(shape.shellPath).toBe('M 55 0 L 165 0 L 220 60 L 165 120 L 55 120 L 0 60 Z')
  })

  it('supports inset for interaction overlays', () => {
    const shape = resolveHexagonShape(200, 100, 6)

    expect(shape.shellPath).toBe('M 53 6 L 147 6 L 194 50 L 147 94 L 53 94 L 6 50 Z')
  })

  it('builds closed paths for experimental basic shapes', () => {
    expect(resolveTriangleShape(120, 90).shellPath).toBe('M 60 0 L 120 90 L 0 90 Z')
    expect(resolveDiamondShape(100, 80).shellPath).toBe('M 50 0 L 100 40 L 50 80 L 0 40 Z')
  })
})
