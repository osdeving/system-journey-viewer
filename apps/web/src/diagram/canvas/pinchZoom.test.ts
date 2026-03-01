/**
 * Purpose: Verify pinch-zoom helper math keeps center anchoring stable while scaling touch gestures.
 */

import { describe, expect, it } from 'vitest'
import {
  resolvePinchGestureMetrics,
  resolveViewportAfterPinch,
} from './pinchZoom'

describe('pinchZoom helpers', () => {
  it('derives a shared center and distance from two touch points', () => {
    expect(
      resolvePinchGestureMetrics(
        { x: 10, y: 20 },
        { x: 50, y: 60 },
      ),
    ).toEqual({
      center: { x: 30, y: 40 },
      distance: Math.hypot(40, 40),
    })
  })

  it('keeps the initial world point pinned under the pinch center while zooming', () => {
    expect(
      resolveViewportAfterPinch({
        startViewport: { x: 100, y: 60, zoom: 1 },
        startCenter: { x: 220, y: 180 },
        currentCenter: { x: 250, y: 210 },
        distanceRatio: 2,
      }),
    ).toEqual({
      zoom: 2,
      x: 10,
      y: -30,
    })
  })
})
