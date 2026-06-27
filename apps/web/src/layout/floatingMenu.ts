/**
 * Purpose: Clamp fixed-position floating menus so they remain visible inside the viewport.
 */

export type FloatingMenuPoint = {
  x: number
  y: number
}

export type FloatingMenuSize = {
  width: number
  height: number
}

export type FloatingMenuViewport = {
  width: number
  height: number
}

const clamp = (value: number, minValue: number, maxValue: number): number =>
  Math.min(Math.max(value, minValue), maxValue)

export const resolveViewportClampedFloatingMenuPoint = ({
  anchor,
  menu,
  viewport,
  margin = 8,
}: {
  anchor: FloatingMenuPoint
  menu: FloatingMenuSize
  viewport: FloatingMenuViewport
  margin?: number
}): FloatingMenuPoint => {
  const safeMargin = Math.max(0, margin)
  const maxX = Math.max(safeMargin, viewport.width - menu.width - safeMargin)
  const maxY = Math.max(safeMargin, viewport.height - menu.height - safeMargin)

  return {
    x: clamp(anchor.x, safeMargin, maxX),
    y: clamp(anchor.y, safeMargin, maxY),
  }
}
