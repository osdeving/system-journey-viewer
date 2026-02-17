import { describe, expect, it } from 'vitest'
import {
  composeEdgeDisplayLabel,
  resolveEdgeLabelPlacement,
  resolveEdgeStepBadgeProgress,
  type EdgeCurvePath,
} from './edgePresentation'

const horizontalCurve = (length: number): EdgeCurvePath => ({
  start: { x: 0, y: 0 },
  control1: { x: length / 2, y: 0 },
  control2: { x: length / 2, y: 0 },
  end: { x: length, y: 0 },
})

describe('resolveEdgeStepBadgeProgress', () => {
  it('keeps badge near the edge start for long curves', () => {
    const progress = resolveEdgeStepBadgeProgress(horizontalCurve(400))
    expect(progress).toBeCloseTo(0.075, 2)
    expect(progress).toBeLessThan(0.1)
  })

  it('clamps badge to avoid overlapping source node on short curves', () => {
    const progress = resolveEdgeStepBadgeProgress(horizontalCurve(80))
    expect(progress).toBe(0.2)
  })
})

describe('composeEdgeDisplayLabel', () => {
  it('appends protocol label in parenthesis', () => {
    expect(composeEdgeDisplayLabel('Auth request', 'HTTP/JWT')).toBe(
      'Auth request (http/jwt)',
    )
  })

  it('keeps edge name when no protocol is present', () => {
    expect(composeEdgeDisplayLabel('Auth request')).toBe('Auth request')
  })
})

describe('resolveEdgeLabelPlacement', () => {
  it('keeps reversed horizontal labels readable left-to-right', () => {
    const reversedCurve: EdgeCurvePath = {
      start: { x: 220, y: 80 },
      control1: { x: 170, y: 80 },
      control2: { x: 60, y: 80 },
      end: { x: 20, y: 80 },
    }
    const placement = resolveEdgeLabelPlacement(reversedCurve, 0.5, 'left')
    expect(placement.angleDeg).toBeGreaterThan(-90)
    expect(placement.angleDeg).toBeLessThan(90)
  })

  it('keeps vertical labels upright and offsets by side', () => {
    const verticalCurve: EdgeCurvePath = {
      start: { x: 120, y: 60 },
      control1: { x: 120, y: 110 },
      control2: { x: 120, y: 190 },
      end: { x: 120, y: 240 },
    }
    const leftPlacement = resolveEdgeLabelPlacement(verticalCurve, 0.5, 'left')
    const rightPlacement = resolveEdgeLabelPlacement(verticalCurve, 0.5, 'right')
    expect(leftPlacement.angleDeg).toBe(-90)
    expect(leftPlacement.point.x).toBeLessThan(rightPlacement.point.x)
  })
})
