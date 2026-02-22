/**
 * Purpose: Verify sync behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import { fullWorkspaceToLiteDsl } from './convert'
import { applyThemeToWorkspace, parseDslToWorkspaceWithTheme } from './sync'

describe('dsl sync helpers', () => {
  it('applies the selected app theme over imported DSL workspace', () => {
    const workspace = createDefaultWorkspace()
    workspace.settings.theme = 'light'

    const themed = applyThemeToWorkspace(workspace, 'dark')

    expect(themed.settings.theme).toBe('dark')
  })

  it('parses DSL and preserves current app theme', () => {
    const workspace = createDefaultWorkspace()
    workspace.settings.theme = 'light'
    const dsl = fullWorkspaceToLiteDsl(workspace)
    const imported = parseDslToWorkspaceWithTheme(dsl, 'dark')

    expect(imported.settings.theme).toBe('dark')
  })
})
