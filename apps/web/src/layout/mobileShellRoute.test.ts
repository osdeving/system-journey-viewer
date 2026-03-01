/**
 * Purpose: Verify the dedicated mobile shell route and touch-first auto-open heuristics stay stable.
 */

import { describe, expect, it } from 'vitest'
import {
  buildMobileShellPath,
  resolveRequestedAppShellMode,
  shouldAutoOpenMobileShell,
} from './mobileShellRoute'

describe('mobileShellRoute', () => {
  it('treats the /m route as the dedicated mobile shell', () => {
    expect(resolveRequestedAppShellMode('/')).toBe('desktop')
    expect(resolveRequestedAppShellMode('/m')).toBe('mobile')
    expect(resolveRequestedAppShellMode('/m/preview')).toBe('mobile')
  })

  it('auto-opens the mobile shell only for touch-first narrow viewports', () => {
    expect(
      shouldAutoOpenMobileShell({
        innerWidth: 820,
        maxTouchPoints: 5,
        pointerCoarse: true,
      }),
    ).toBe(true)

    expect(
      shouldAutoOpenMobileShell({
        innerWidth: 1280,
        maxTouchPoints: 5,
        pointerCoarse: true,
      }),
    ).toBe(false)

    expect(
      shouldAutoOpenMobileShell({
        innerWidth: 820,
        maxTouchPoints: 0,
        pointerCoarse: true,
      }),
    ).toBe(false)
  })

  it('builds the dedicated /m route while keeping search and hash segments', () => {
    expect(buildMobileShellPath()).toBe('/m')
    expect(buildMobileShellPath('?from=touch', '#panel')).toBe('/m?from=touch#panel')
  })
})
