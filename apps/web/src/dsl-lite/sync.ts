/**
 * Purpose: Implement SJV Script parsing, serialization, and editor integration helpers.
 */

import type { WorkspaceModel } from '../model/types'
import { liteToFullWorkspace } from './convert'
import { parseLiteDsl } from './parser'

export const parseDslToWorkspace = (dslText: string): WorkspaceModel => {
  const ast = parseLiteDsl(dslText)
  return liteToFullWorkspace(ast)
}

export const applyThemeToWorkspace = (
  workspace: WorkspaceModel,
  theme: WorkspaceModel['settings']['theme'],
): WorkspaceModel => ({
  ...workspace,
  settings: {
    ...workspace.settings,
    theme,
  },
})

export const parseDslToWorkspaceWithTheme = (
  dslText: string,
  theme: WorkspaceModel['settings']['theme'],
): WorkspaceModel => applyThemeToWorkspace(parseDslToWorkspace(dslText), theme)
