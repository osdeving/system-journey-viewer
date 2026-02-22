/**
 * Purpose: Provide pure playback helpers for journey trails, timelines, and animation effects.
 */

import type { NodeBounds, ViewportState } from '../../model/types'

export interface PixelPoint {
  x: number
  y: number
}

export interface CanvasRect {
  left: number
  top: number
  width: number
  height: number
}

export interface ViewportSize {
  width: number
  height: number
}

export interface NodeConfettiAnchor {
  centerPx: PixelPoint
  radiusPx: number
}

export interface ConfettiBurstSpec {
  origin: { x: number; y: number }
  particleCount: number
  spread: number
  startVelocity: number
}

const MIN_CONFETTI_RADIUS_PX = 12
const MAX_CONFETTI_RADIUS_PX = 72
const RING_ORIGINS = 4

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const normalizeOrigin = (
  pointPx: PixelPoint,
  viewportSize: ViewportSize,
): { x: number; y: number } => {
  const safeWidth = Math.max(1, viewportSize.width)
  const safeHeight = Math.max(1, viewportSize.height)
  return {
    x: clamp(pointPx.x / safeWidth, 0.02, 0.98),
    y: clamp(pointPx.y / safeHeight, 0.02, 0.98),
  }
}

export const resolveNodeConfettiAnchor = (
  nodeBounds: NodeBounds,
  viewport: ViewportState,
  canvasRect: CanvasRect,
): NodeConfettiAnchor => {
  const worldCenterX = nodeBounds.x + nodeBounds.w / 2
  const worldCenterY = nodeBounds.y + nodeBounds.h / 2
  const pixelX = canvasRect.left + viewport.x + worldCenterX * viewport.zoom
  const pixelY = canvasRect.top + viewport.y + worldCenterY * viewport.zoom
  const clampedCenterX = clamp(pixelX, canvasRect.left, canvasRect.left + canvasRect.width)
  const clampedCenterY = clamp(pixelY, canvasRect.top, canvasRect.top + canvasRect.height)
  const rawRadius = (Math.max(nodeBounds.w, nodeBounds.h) * viewport.zoom) / 2

  return {
    centerPx: { x: clampedCenterX, y: clampedCenterY },
    radiusPx: clamp(rawRadius, MIN_CONFETTI_RADIUS_PX, MAX_CONFETTI_RADIUS_PX),
  }
}

export const buildNodeConfettiBursts = (
  anchor: NodeConfettiAnchor,
  viewportSize: ViewportSize,
): ConfettiBurstSpec[] => {
  const totalParticles = Math.round(clamp(anchor.radiusPx * 0.95, 28, 84))
  const centerParticles = Math.round(totalParticles * 0.5)
  const ringParticles = Math.max(
    4,
    Math.round((totalParticles - centerParticles) / RING_ORIGINS),
  )
  const ringRadius = anchor.radiusPx * 0.32
  const bursts: ConfettiBurstSpec[] = [
    {
      origin: normalizeOrigin(anchor.centerPx, viewportSize),
      particleCount: centerParticles,
      spread: 68,
      startVelocity: 22,
    },
  ]

  for (let index = 0; index < RING_ORIGINS; index += 1) {
    const angle = (index / RING_ORIGINS) * Math.PI * 2
    const ringPoint = {
      x: anchor.centerPx.x + Math.cos(angle) * ringRadius,
      y: anchor.centerPx.y + Math.sin(angle) * ringRadius,
    }
    bursts.push({
      origin: normalizeOrigin(ringPoint, viewportSize),
      particleCount: ringParticles,
      spread: 34,
      startVelocity: 16,
    })
  }

  return bursts
}
