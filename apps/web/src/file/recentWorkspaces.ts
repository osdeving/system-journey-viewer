import type { EditorSnapshot } from '../model/types'

const RECENT_WORKSPACES_STORAGE_KEY = 'sjv:recent-workspaces:v1'
const MAX_RECENT_WORKSPACES = 3

type StorageGet = Pick<Storage, 'getItem'>
type StorageSet = Pick<Storage, 'setItem'>

export type RecentWorkspaceEntry = {
  id: string
  name: string
  savedAtIso: string
  payload: string
}

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage

const resolveStorage = <T extends StorageGet | StorageSet>(storage?: T): T | undefined =>
  storage ?? ((canUseStorage() ? window.localStorage : undefined) as T | undefined)

const isRecentWorkspaceEntry = (value: unknown): value is RecentWorkspaceEntry => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<RecentWorkspaceEntry>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0 &&
    typeof candidate.savedAtIso === 'string' &&
    candidate.savedAtIso.length > 0 &&
    typeof candidate.payload === 'string' &&
    candidate.payload.length > 0
  )
}

export const loadRecentWorkspaces = (storage?: StorageGet): RecentWorkspaceEntry[] => {
  const source = resolveStorage(storage)
  if (!source) {
    return []
  }
  const payload = source.getItem(RECENT_WORKSPACES_STORAGE_KEY)
  if (!payload) {
    return []
  }
  try {
    const parsed = JSON.parse(payload)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isRecentWorkspaceEntry).slice(0, MAX_RECENT_WORKSPACES)
  } catch {
    return []
  }
}

export const rememberRecentWorkspace = (
  snapshot: EditorSnapshot,
  payload: string,
  displayName: string,
  storage?: StorageGet & StorageSet,
): RecentWorkspaceEntry[] => {
  const target = resolveStorage(storage)
  if (!target) {
    return []
  }

  const normalizedName = displayName.trim() || snapshot.workspace.workspace.name || 'workspace.sjv.json'
  const nextEntry: RecentWorkspaceEntry = {
    id: snapshot.workspace.workspace.id,
    name: normalizedName,
    savedAtIso: new Date().toISOString(),
    payload,
  }

  const existing = loadRecentWorkspaces(target)
  const next = [nextEntry, ...existing.filter((entry) => entry.id !== nextEntry.id)].slice(
    0,
    MAX_RECENT_WORKSPACES,
  )

  target.setItem(RECENT_WORKSPACES_STORAGE_KEY, JSON.stringify(next))
  return next
}
