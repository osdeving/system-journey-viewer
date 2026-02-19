import { describe, expect, it } from 'vitest'
import { clampFloatingDockRect } from './floatingDock'

describe('clampFloatingDockRect', () => {
  it('clamps position inside viewport margins', () => {
    const clamped = clampFloatingDockRect({
      rect: { x: -24, y: 12, width: 480, height: 420 },
      viewportWidth: 1280,
      viewportHeight: 900,
      topbarHeight: 80,
    })

    expect(clamped.x).toBe(8)
    expect(clamped.y).toBe(88)
  })

  it('clamps width and repositions x when rect overflows right edge', () => {
    const clamped = clampFloatingDockRect({
      rect: { x: 940, y: 120, width: 520, height: 380 },
      viewportWidth: 1100,
      viewportHeight: 860,
      topbarHeight: 80,
    })

    expect(clamped.width).toBe(520)
    expect(clamped.x).toBe(572)
  })

  it('enforces minimum width and height', () => {
    const clamped = clampFloatingDockRect({
      rect: { x: 30, y: 100, width: 140, height: 120 },
      viewportWidth: 1200,
      viewportHeight: 800,
      topbarHeight: 80,
    })

    expect(clamped.width).toBe(320)
    expect(clamped.height).toBe(260)
  })
})

