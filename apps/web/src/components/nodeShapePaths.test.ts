import { describe, expect, it } from 'vitest'
import {
  resolveDbCylinderShape,
  resolveQueueCylinderShape,
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
})
