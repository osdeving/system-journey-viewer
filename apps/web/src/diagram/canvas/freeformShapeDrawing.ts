/**
 * Purpose: Resolve drag-drawn experimental shape bounds for canvas freeform tools.
 */

import type { BasicShapeKind, NodeBounds } from '../../model/types'

export const MIN_FREEFORM_SHAPE_SIZE = 18

const ASPECT_LOCKED_SHAPES = new Set<BasicShapeKind>(['shape-circle', 'shape-diamond'])

export const isFreeformShapeTool = (tool: string): tool is BasicShapeKind =>
  tool.startsWith('shape-')

export const resolveFreeformShapeBounds = (
  shapeKind: BasicShapeKind,
  start: { x: number; y: number },
  current: { x: number; y: number },
): NodeBounds => {
  const rawWidth = current.x - start.x
  const rawHeight = current.y - start.y
  const width = Math.max(MIN_FREEFORM_SHAPE_SIZE, Math.abs(rawWidth))
  const height = Math.max(MIN_FREEFORM_SHAPE_SIZE, Math.abs(rawHeight))

  if (ASPECT_LOCKED_SHAPES.has(shapeKind)) {
    const size = Math.max(width, height)
    return {
      x: rawWidth < 0 ? start.x - size : start.x,
      y: rawHeight < 0 ? start.y - size : start.y,
      w: size,
      h: size,
    }
  }

  return {
    x: rawWidth < 0 ? start.x - width : start.x,
    y: rawHeight < 0 ? start.y - height : start.y,
    w: width,
    h: height,
  }
}

export const hasDraggedFreeformShape = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold = 6,
): boolean => Math.abs(current.x - start.x) >= threshold || Math.abs(current.y - start.y) >= threshold
