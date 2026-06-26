/**
 * Purpose: Verify layout Grid behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { resolveLayoutGridTemplateRows } from './layoutGrid'

describe('resolveLayoutGridTemplateRows', () => {
  it('keeps topbar row auto in immersive mode', () => {
    expect(
      resolveLayoutGridTemplateRows({
        immersiveMode: true,
        drawerVisible: true,
        journeyHeight: 220,
        managedBottomHostVisible: true,
        managedBottomHostHeight: 180,
        statusBarVisible: true,
        statusBarHeight: 24,
      }),
    ).toBe('auto 1fr 24px')
  })

  it('uses drawer height row when workbench is visible', () => {
    expect(
      resolveLayoutGridTemplateRows({
        immersiveMode: false,
        drawerVisible: true,
        journeyHeight: 260,
        managedBottomHostVisible: false,
        managedBottomHostHeight: 220,
        statusBarVisible: false,
        statusBarHeight: 24,
      }),
    ).toBe('auto 1fr 0px 260px 0px')
  })

  it('adds an intermediate row when a managed bottom host is visible', () => {
    expect(
      resolveLayoutGridTemplateRows({
        immersiveMode: false,
        drawerVisible: true,
        journeyHeight: 260,
        managedBottomHostVisible: true,
        managedBottomHostHeight: 220,
        statusBarVisible: true,
        statusBarHeight: 24,
      }),
    ).toBe('auto 1fr 220px 260px 24px')
  })

  it('collapses drawer row when workbench is hidden', () => {
    expect(
      resolveLayoutGridTemplateRows({
        immersiveMode: false,
        drawerVisible: false,
        journeyHeight: 260,
        managedBottomHostVisible: false,
        managedBottomHostHeight: 220,
        statusBarVisible: false,
        statusBarHeight: 24,
      }),
    ).toBe('auto 1fr 0px 0px 0px')
  })
})
