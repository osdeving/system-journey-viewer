/**
 * Purpose: Provide pure layout and sizing calculations for the desktop-style web shell.
 */

import type { FloatingDockRect } from './floatingDock'

export type DockSide = 'left' | 'right'

export type FloatingDockResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const MIN_SINGLE_TAB_DOCK_HOST_WIDTH = 320

type ResolveDockSideWidthInput = {
  side: DockSide
  startWidth: number
  startClientX: number
  currentClientX: number
  minWidth: number
  maxWidth: number
}

const clamp = (value: number, minValue: number, maxValue: number): number =>
  Math.max(minValue, Math.min(maxValue, value))

export const resolveDockSideWidth = ({
  side,
  startWidth,
  startClientX,
  currentClientX,
  minWidth,
  maxWidth,
}: ResolveDockSideWidthInput): number => {
  const delta = currentClientX - startClientX
  const signedDelta = side === 'left' ? delta : -delta
  return clamp(startWidth + signedDelta, minWidth, maxWidth)
}

export const resolveDockHostMinWidth = (tabCount: number, fallbackMinWidth: number): number =>
  tabCount === 1 ? Math.max(fallbackMinWidth, MIN_SINGLE_TAB_DOCK_HOST_WIDTH) : fallbackMinWidth

type ResolveFloatingDockResizeInput = {
  handle: FloatingDockResizeHandle
  startRect: FloatingDockRect
  currentClientX: number
  currentClientY: number
  startClientX: number
  startClientY: number
}

export const resolveFloatingDockResizeRect = ({
  handle,
  startRect,
  currentClientX,
  currentClientY,
  startClientX,
  startClientY,
}: ResolveFloatingDockResizeInput): FloatingDockRect => {
  const deltaX = currentClientX - startClientX
  const deltaY = currentClientY - startClientY
  const nextRect: FloatingDockRect = { ...startRect }

  if (handle.includes('e')) {
    nextRect.width = startRect.width + deltaX
  }
  if (handle.includes('w')) {
    nextRect.x = startRect.x + deltaX
    nextRect.width = startRect.width - deltaX
  }
  if (handle.includes('s')) {
    nextRect.height = startRect.height + deltaY
  }
  if (handle.includes('n')) {
    nextRect.y = startRect.y + deltaY
    nextRect.height = startRect.height - deltaY
  }

  return nextRect
}
