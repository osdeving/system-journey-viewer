/**
 * Purpose: Implement workspace file serialization, parsing, and recent-file utilities.
 */

import { editorSnapshotSchema } from '../model/schema'
import type { EditorSnapshot } from '../model/types'

const DEFAULT_WORKSPACE_FILE_BASENAME = 'workspace'
const WORKSPACE_FILE_EXTENSION = '.sjv.json'

const sanitizeFileNamePart = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

export const buildWorkspaceFilename = (workspaceName: string): string => {
  const normalized = sanitizeFileNamePart(workspaceName)
  const basename = normalized || DEFAULT_WORKSPACE_FILE_BASENAME
  return `${basename}${WORKSPACE_FILE_EXTENSION}`
}

export const serializeWorkspaceSnapshotFile = (snapshot: EditorSnapshot): string =>
  JSON.stringify(snapshot, null, 2)

export const parseWorkspaceSnapshotFile = (payload: string): EditorSnapshot => {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new Error('Invalid JSON file.')
  }

  const result = editorSnapshotSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('Invalid workspace file format.')
  }

  const snapshot = result.data as EditorSnapshot
  if (!snapshot.workspace.views[snapshot.currentViewId]) {
    throw new Error('Workspace file currentViewId is missing in views.')
  }
  return snapshot
}
