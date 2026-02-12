import { describe, expect, it } from 'vitest'
import {
  composeEdgeDisplayLabel,
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
