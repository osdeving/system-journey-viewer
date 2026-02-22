/**
 * Purpose: Implement SJV Script parsing, serialization, and editor integration helpers.
 */

import type { WorkspaceModel } from '../model/types'
import { liteToFullWorkspace } from './convert'
import { parseLiteDsl } from './parser'

export type ParsedDslWorkspaceDocument = {
  workspace: WorkspaceModel
  hasUiLayoutMetadata: boolean
}

export const parseDslToWorkspace = (dslText: string): WorkspaceModel => {
  return parseDslToWorkspaceDocument(dslText).workspace
}

export const parseDslToWorkspaceDocument = (dslText: string): ParsedDslWorkspaceDocument => {
  const ast = parseLiteDsl(dslText)
  return {
    workspace: liteToFullWorkspace(ast),
    hasUiLayoutMetadata: (ast.uiLayout?.length ?? 0) > 0,
  }
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

export const parseDslToWorkspaceDocumentWithTheme = (
  dslText: string,
  theme: WorkspaceModel['settings']['theme'],
): ParsedDslWorkspaceDocument => {
  const parsed = parseDslToWorkspaceDocument(dslText)
  return {
    ...parsed,
    workspace: applyThemeToWorkspace(parsed.workspace, theme),
  }
}
