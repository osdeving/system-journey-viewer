import { describe, expect, it } from 'vitest'
import { buildNodeConfettiBursts, resolveNodeConfettiAnchor } from './playerConfetti'

describe('resolveNodeConfettiAnchor', () => {
  it('anchors confetti at node center using viewport transform', () => {
    const anchor = resolveNodeConfettiAnchor(
      { x: 100, y: 50, w: 200, h: 100 },
      { x: 20, y: 10, zoom: 1 },
      { left: 300, top: 80, width: 1000, height: 700 },
    )

    expect(anchor.centerPx).toEqual({ x: 520, y: 190 })
    expect(anchor.radiusPx).toBe(100)
  })

  it('clamps confetti radius for very small and very large nodes', () => {
    const small = resolveNodeConfettiAnchor(
      { x: 0, y: 0, w: 30, h: 20 },
      { x: 0, y: 0, zoom: 0.5 },
      { left: 0, top: 0, width: 900, height: 600 },
    )
    const large = resolveNodeConfettiAnchor(
      { x: 0, y: 0, w: 1200, h: 900 },
      { x: 0, y: 0, zoom: 1.2 },
      { left: 0, top: 0, width: 1200, height: 900 },
    )

    expect(small.radiusPx).toBe(32)
    expect(large.radiusPx).toBe(180)
  })
})

describe('buildNodeConfettiBursts', () => {
  it('creates center burst plus ring bursts within viewport bounds', () => {
    const bursts = buildNodeConfettiBursts(
      {
        centerPx: { x: 640, y: 360 },
        radiusPx: 90,
      },
      {
        width: 1280,
        height: 720,
      },
    )

    expect(bursts).toHaveLength(7)
    bursts.forEach((burst) => {
      expect(burst.origin.x).toBeGreaterThanOrEqual(0.02)
      expect(burst.origin.x).toBeLessThanOrEqual(0.98)
      expect(burst.origin.y).toBeGreaterThanOrEqual(0.02)
      expect(burst.origin.y).toBeLessThanOrEqual(0.98)
      expect(burst.particleCount).toBeGreaterThan(0)
    })
  })
})
