/**
 * Purpose: Verify drag-drawn experimental shape bounds for canvas freeform tools.
 */

import { describe, expect, it } from 'vitest'
import {
  hasDraggedFreeformShape,
  isFreeformShapeTool,
  MIN_FREEFORM_SHAPE_SIZE,
  resolveFreeformShapeBounds,
} from './freeformShapeDrawing'

describe('freeform shape drawing', () => {
  it('normalizes rectangle and triangle drag direction without locking aspect ratio', () => {
    expect(resolveFreeformShapeBounds('shape-rectangle', { x: 100, y: 80 }, { x: 40, y: 125 })).toEqual({
      x: 40,
      y: 80,
      w: 60,
      h: 45,
    })

    expect(resolveFreeformShapeBounds('shape-triangle', { x: 20, y: 30 }, { x: 70, y: 10 })).toEqual({
      x: 20,
      y: 10,
      w: 50,
      h: 20,
    })
  })

  it('locks circle and diamond tools to a square drawing box', () => {
    expect(resolveFreeformShapeBounds('shape-circle', { x: 10, y: 10 }, { x: 60, y: 90 })).toEqual({
      x: 10,
      y: 10,
      w: 80,
      h: 80,
    })

    expect(resolveFreeformShapeBounds('shape-diamond', { x: 100, y: 80 }, { x: 45, y: 120 })).toEqual({
      x: 45,
      y: 80,
      w: 55,
      h: 55,
    })
  })

  it('keeps tiny drags drawable but distinguishes click-only gestures', () => {
    expect(resolveFreeformShapeBounds('shape-rectangle', { x: 0, y: 0 }, { x: 2, y: 3 })).toEqual({
      x: 0,
      y: 0,
      w: MIN_FREEFORM_SHAPE_SIZE,
      h: MIN_FREEFORM_SHAPE_SIZE,
    })
    expect(hasDraggedFreeformShape({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe(false)
    expect(hasDraggedFreeformShape({ x: 0, y: 0 }, { x: 7, y: 3 })).toBe(true)
  })

  it('recognizes experimental shape tools', () => {
    expect(isFreeformShapeTool('shape-triangle')).toBe(true)
    expect(isFreeformShapeTool('connector')).toBe(false)
  })
})
