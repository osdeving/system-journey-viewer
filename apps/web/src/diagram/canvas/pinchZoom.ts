/**
 * Purpose: Provide pure pinch-zoom helpers so touch gestures can reuse the same viewport math predictably.
 */

import type { ViewportState } from '../../model/types'

export type PinchTouchPoint = {
  x: number
  y: number
}

type PinchViewportOptions = {
  startViewport: ViewportState
  startCenter: PinchTouchPoint
  currentCenter: PinchTouchPoint
  distanceRatio: number
}

export type PinchGestureMetrics = {
  center: PinchTouchPoint
  distance: number
}

const MIN_PINCH_ZOOM = 0.25
const MAX_PINCH_ZOOM = 4

export const resolvePinchGestureMetrics = (
  firstPoint: PinchTouchPoint,
  secondPoint: PinchTouchPoint,
): PinchGestureMetrics => ({
  center: {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  },
  distance: Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y),
})

export const resolveViewportAfterPinch = ({
  startViewport,
  startCenter,
  currentCenter,
  distanceRatio,
}: PinchViewportOptions): ViewportState => {
  const nextZoom = Math.min(
    MAX_PINCH_ZOOM,
    Math.max(MIN_PINCH_ZOOM, startViewport.zoom * Math.max(distanceRatio, 0.2)),
  )
  const worldX = (startCenter.x - startViewport.x) / startViewport.zoom
  const worldY = (startCenter.y - startViewport.y) / startViewport.zoom

  return {
    zoom: nextZoom,
    x: currentCenter.x - worldX * nextZoom,
    y: currentCenter.y - worldY * nextZoom,
  }
}
