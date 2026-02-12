import { describe, expect, it } from 'vitest'
import { buildTrailPoints } from './trailMath'

describe('buildTrailPoints', () => {
  it('creates first trail point when there is no previous point', () => {
    expect(buildTrailPoints(null, { x: 10, y: 20 }, 2)).toEqual([{ x: 10, y: 20 }])
  })

  it('returns no new point when distance is shorter than spacing', () => {
    expect(buildTrailPoints({ x: 0, y: 0 }, { x: 0.5, y: 0 }, 1)).toEqual([])
  })

  it('fills intermediate points for long distances', () => {
    const points = buildTrailPoints({ x: 0, y: 0 }, { x: 10, y: 0 }, 2.5)
    expect(points).toEqual([
      { x: 2.5, y: 0 },
      { x: 5, y: 0 },
      { x: 7.5, y: 0 },
      { x: 10, y: 0 },
    ])
  })
})
