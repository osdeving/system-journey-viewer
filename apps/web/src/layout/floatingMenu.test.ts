/**
 * Purpose: Verify viewport clamping for fixed-position floating menus.
 */

import { describe, expect, it } from 'vitest'
import { resolveViewportClampedFloatingMenuPoint } from './floatingMenu'

describe('resolveViewportClampedFloatingMenuPoint', () => {
  it('keeps an anchor point when the menu fits inside the viewport', () => {
    expect(
      resolveViewportClampedFloatingMenuPoint({
        anchor: { x: 80, y: 40 },
        menu: { width: 120, height: 80 },
        viewport: { width: 400, height: 300 },
        margin: 8,
      }),
    ).toEqual({ x: 80, y: 40 })
  })

  it('clamps right and bottom overflow to keep the menu visible', () => {
    expect(
      resolveViewportClampedFloatingMenuPoint({
        anchor: { x: 390, y: 290 },
        menu: { width: 140, height: 96 },
        viewport: { width: 400, height: 300 },
        margin: 8,
      }),
    ).toEqual({ x: 252, y: 196 })
  })

  it('falls back to the margin when the menu is larger than the viewport', () => {
    expect(
      resolveViewportClampedFloatingMenuPoint({
        anchor: { x: 240, y: 160 },
        menu: { width: 500, height: 320 },
        viewport: { width: 260, height: 180 },
        margin: 10,
      }),
    ).toEqual({ x: 10, y: 10 })
  })
})
