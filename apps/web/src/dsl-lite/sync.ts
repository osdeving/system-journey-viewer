import type { WorkspaceModel } from '../model/types'
import { fullWorkspaceToLiteDsl } from './convert'

export const resolveDslPanelText = (
  workspace: WorkspaceModel,
  currentText: string,
  syncEnabled: boolean,
): string => {
  if (!syncEnabled) {
    return currentText
  }
  const syncedText = fullWorkspaceToLiteDsl(workspace)
  return currentText === syncedText ? currentText : syncedText
}
