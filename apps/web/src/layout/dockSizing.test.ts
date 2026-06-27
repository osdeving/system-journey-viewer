/**
 * Purpose: Verify dock Sizing behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  MIN_SINGLE_TAB_DOCK_HOST_WIDTH,
  resolveDockHostMinWidth,
  resolveDockSideWidth,
  resolveFloatingDockResizeRect,
} from './dockSizing'

describe('dockSizing', () => {
  it('resizes left dock increasing width when dragging right', () => {
    const next = resolveDockSideWidth({
      side: 'left',
      startWidth: 320,
      startClientX: 100,
      currentClientX: 160,
      minWidth: 260,
      maxWidth: 640,
    })
    expect(next).toBe(380)
  })

  it('resizes right dock increasing width when dragging left', () => {
    const next = resolveDockSideWidth({
      side: 'right',
      startWidth: 320,
      startClientX: 600,
      currentClientX: 520,
      minWidth: 260,
      maxWidth: 640,
    })
    expect(next).toBe(400)
  })

  it('clamps dock width inside limits', () => {
    const next = resolveDockSideWidth({
      side: 'right',
      startWidth: 320,
      startClientX: 600,
      currentClientX: 1200,
      minWidth: 260,
      maxWidth: 420,
    })
    expect(next).toBe(260)
  })

  it('raises side dock host minimum width when a host has one tab', () => {
    expect(MIN_SINGLE_TAB_DOCK_HOST_WIDTH).toBe(260)
    expect(resolveDockHostMinWidth(1, 240)).toBe(MIN_SINGLE_TAB_DOCK_HOST_WIDTH)
  })

  it('keeps a larger host-specific minimum when a single-tab host needs it', () => {
    expect(resolveDockHostMinWidth(1, 300)).toBe(300)
  })

  it('preserves the compact side dock minimum when a host has multiple tabs', () => {
    expect(resolveDockHostMinWidth(2, 240)).toBe(240)
  })

  it('resizes floating dock from north-west handle', () => {
    const next = resolveFloatingDockResizeRect({
      handle: 'nw',
      startRect: { x: 40, y: 120, width: 500, height: 400 },
      startClientX: 40,
      startClientY: 120,
      currentClientX: 10,
      currentClientY: 90,
    })

    expect(next).toEqual({ x: 10, y: 90, width: 530, height: 430 })
  })

  it('resizes floating dock from south-east handle', () => {
    const next = resolveFloatingDockResizeRect({
      handle: 'se',
      startRect: { x: 40, y: 120, width: 500, height: 400 },
      startClientX: 540,
      startClientY: 520,
      currentClientX: 600,
      currentClientY: 560,
    })

    expect(next).toEqual({ x: 40, y: 120, width: 560, height: 440 })
  })
})
