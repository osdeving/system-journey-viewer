import { describe, expect, it } from 'vitest'
import { resolveLayoutGridTemplateRows } from './layoutGrid'

describe('resolveLayoutGridTemplateRows', () => {
  it('keeps topbar row auto in immersive mode', () => {
    expect(
      resolveLayoutGridTemplateRows({
        immersiveMode: true,
        drawerVisible: true,
        journeyHeight: 220,
      }),
    ).toBe('auto 1fr')
  })

  it('uses drawer height row when workbench is visible', () => {
    expect(
      resolveLayoutGridTemplateRows({
        immersiveMode: false,
        drawerVisible: true,
        journeyHeight: 260,
      }),
    ).toBe('auto 1fr 260px')
  })

  it('collapses drawer row when workbench is hidden', () => {
    expect(
      resolveLayoutGridTemplateRows({
        immersiveMode: false,
        drawerVisible: false,
        journeyHeight: 260,
      }),
    ).toBe('auto 1fr 0px')
  })
})
