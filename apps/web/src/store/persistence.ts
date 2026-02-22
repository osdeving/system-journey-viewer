/**
 * Purpose: Implement editor state management, persistence, and store utilities.
 */

import { editorSnapshotSchema } from '../model/schema'
import type { EditorSnapshot } from '../model/types'

const LATEST_SNAPSHOT_STORAGE_KEY = 'sjv:editor-snapshot:v2'

export const storageKeyForView = (workspaceId: string, viewId: string): string =>
  `c4editor:${workspaceId}:${viewId}`

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage

const safeParse = (value: string): EditorSnapshot | null => {
  try {
    const parsed = JSON.parse(value)
    const result = editorSnapshotSchema.safeParse(parsed)
    return result.success ? (result.data as EditorSnapshot) : null
  } catch {
    return null
  }
}

export const loadSnapshot = (
  workspaceId: string,
  viewId: string,
  storage?: Pick<Storage, 'getItem'>,
): EditorSnapshot | null => {
  const key = storageKeyForView(workspaceId, viewId)
  const source = storage ?? (canUseStorage() ? window.localStorage : undefined)
  if (!source) {
    return null
  }
  const payload = source.getItem(key)
  if (!payload) {
    return null
  }
  return safeParse(payload)
}

export const loadLatestSnapshot = (
  storage?: Pick<Storage, 'getItem'>,
): EditorSnapshot | null => {
  const source = storage ?? (canUseStorage() ? window.localStorage : undefined)
  if (!source) {
    return null
  }
  const payload = source.getItem(LATEST_SNAPSHOT_STORAGE_KEY)
  if (!payload) {
    return null
  }
  return safeParse(payload)
}

export const saveSnapshot = (
  snapshot: EditorSnapshot,
  storage?: Pick<Storage, 'setItem'>,
): void => {
  const target = storage ?? (canUseStorage() ? window.localStorage : undefined)
  if (!target) {
    return
  }
  const payload = JSON.stringify(snapshot)
  // Global latest snapshot is the reliable restore source across view switches and custom workspace IDs.
  target.setItem(LATEST_SNAPSHOT_STORAGE_KEY, payload)
  // Legacy key is still written for backward compatibility with older builds/tools.
  const key = storageKeyForView(snapshot.workspace.workspace.id, snapshot.currentViewId)
  target.setItem(key, payload)
}
