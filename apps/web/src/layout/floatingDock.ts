export type FloatingDockRect = {
  x: number
  y: number
  width: number
  height: number
}

export type FloatingDockClampOptions = {
  rect: FloatingDockRect
  viewportWidth: number
  viewportHeight: number
  topbarHeight: number
  margin?: number
  minWidth?: number
  minHeight?: number
}

const DEFAULT_MARGIN = 8
const DEFAULT_MIN_FLOATING_DOCK_WIDTH = 320
const DEFAULT_MIN_FLOATING_DOCK_HEIGHT = 260

const clamp = (value: number, minValue: number, maxValue: number): number =>
  Math.max(minValue, Math.min(maxValue, value))

export const clampFloatingDockRect = ({
  rect,
  viewportWidth,
  viewportHeight,
  topbarHeight,
  margin = DEFAULT_MARGIN,
  minWidth = DEFAULT_MIN_FLOATING_DOCK_WIDTH,
  minHeight = DEFAULT_MIN_FLOATING_DOCK_HEIGHT,
}: FloatingDockClampOptions): FloatingDockRect => {
  const safeViewportWidth = Math.max(1, viewportWidth)
  const safeViewportHeight = Math.max(1, viewportHeight)
  const safeMinWidth = Math.max(1, minWidth)
  const safeMinHeight = Math.max(1, minHeight)
  const minX = margin
  const minY = topbarHeight + margin

  const maxWidth = Math.max(safeMinWidth, safeViewportWidth - minX - margin)
  const maxHeight = Math.max(safeMinHeight, safeViewportHeight - minY - margin)
  const width = clamp(rect.width, safeMinWidth, maxWidth)
  const height = clamp(rect.height, safeMinHeight, maxHeight)
  const maxX = Math.max(minX, safeViewportWidth - width - margin)
  const maxY = Math.max(minY, safeViewportHeight - height - margin)

  return {
    x: clamp(rect.x, minX, maxX),
    y: clamp(rect.y, minY, maxY),
    width,
    height,
  }
}

