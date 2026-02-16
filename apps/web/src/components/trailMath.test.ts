import { describe, expect, it } from 'vitest'
import {
  buildTrailPoints,
  compactPositiveAlphaInPlace,
  trimArrayStartInPlace,
} from './trailMath'

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

describe('trimArrayStartInPlace', () => {
  it('removes oldest items when array exceeds max size', () => {
    const items = [1, 2, 3, 4, 5]
    trimArrayStartInPlace(items, 3)
    expect(items).toEqual([3, 4, 5])
  })

  it('keeps array untouched when within max size', () => {
    const items = [1, 2]
    trimArrayStartInPlace(items, 3)
    expect(items).toEqual([1, 2])
  })
})

describe('compactPositiveAlphaInPlace', () => {
  it('keeps only particles with alpha greater than zero', () => {
    const particles = [
      { alpha: 0.8, id: 'a' },
      { alpha: 0, id: 'b' },
      { alpha: -0.1, id: 'c' },
      { alpha: 0.2, id: 'd' },
    ]
    compactPositiveAlphaInPlace(particles)
    expect(particles).toEqual([
      { alpha: 0.8, id: 'a' },
      { alpha: 0.2, id: 'd' },
    ])
  })
})
