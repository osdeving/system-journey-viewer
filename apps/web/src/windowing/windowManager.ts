/**
 * Purpose: Define managed window state, placement defaults, and windowing helpers for dock/float behavior.
 */

import type { FloatingDockRect } from '../layout/floatingDock'

export type ManagedWindowId = 'palette' | 'inspector' | 'journeys' | 'timeline' | 'dsl' | 'help' | 'preferences'
export type ManagedWindowDockHostId = 'left' | 'right' | 'bottom'
export type ManagedWindowPlacement = 'floating' | ManagedWindowDockHostId

export type ManagedWindowState = {
  open: boolean
  placement: ManagedWindowPlacement
  floatingRect: FloatingDockRect
}

export type ManagedWindowHostState = {
  tabs: ManagedWindowId[]
  activeTab: ManagedWindowId | null
}

export type ManagedWindowsRecord = Record<ManagedWindowId, ManagedWindowState>
export type ManagedWindowHostsState = Record<ManagedWindowDockHostId, ManagedWindowHostState>

export type ManagedWindowsState = {
  windows: ManagedWindowsRecord
  hosts: ManagedWindowHostsState
}

export type ManagedWindowDefaults = Record<ManagedWindowId, FloatingDockRect>

type OpenManagedWindowOptions = {
  placement?: ManagedWindowPlacement
}

const HOST_IDS: ManagedWindowDockHostId[] = ['left', 'right', 'bottom']
export const MANAGED_WINDOW_IDS: ManagedWindowId[] = [
  'palette',
  'inspector',
  'journeys',
  'timeline',
  'dsl',
  'help',
  'preferences',
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isHostId = (value: unknown): value is ManagedWindowDockHostId =>
  value === 'left' || value === 'right' || value === 'bottom'

const isPlacement = (value: unknown): value is ManagedWindowPlacement =>
  value === 'floating' || isHostId(value)

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const createEmptyHostState = (): ManagedWindowHostState => ({
  tabs: [],
  activeTab: null,
})

const cloneHosts = (hosts: ManagedWindowHostsState): ManagedWindowHostsState => ({
  left: { tabs: [...hosts.left.tabs], activeTab: hosts.left.activeTab },
  right: { tabs: [...hosts.right.tabs], activeTab: hosts.right.activeTab },
  bottom: { tabs: [...hosts.bottom.tabs], activeTab: hosts.bottom.activeTab },
})

const removeWindowFromHosts = (
  hosts: ManagedWindowHostsState,
  windowId: ManagedWindowId,
): ManagedWindowHostsState => {
  const nextHosts = cloneHosts(hosts)
  for (const hostId of HOST_IDS) {
    const host = nextHosts[hostId]
    if (!host.tabs.includes(windowId)) {
      continue
    }
    host.tabs = host.tabs.filter((tabId) => tabId !== windowId)
    if (host.activeTab === windowId) {
      host.activeTab = host.tabs[host.tabs.length - 1] ?? null
    }
  }
  return nextHosts
}

const addWindowToHost = (
  hosts: ManagedWindowHostsState,
  hostId: ManagedWindowDockHostId,
  windowId: ManagedWindowId,
): ManagedWindowHostsState => {
  const nextHosts = removeWindowFromHosts(hosts, windowId)
  const host = nextHosts[hostId]
  if (!host.tabs.includes(windowId)) {
    host.tabs = [...host.tabs, windowId]
  }
  host.activeTab = windowId
  return nextHosts
}

export const createManagedWindowsState = (defaults: ManagedWindowDefaults): ManagedWindowsState => ({
  windows: Object.fromEntries(
    MANAGED_WINDOW_IDS.map((windowId) => [
      windowId,
      {
        open: false,
        placement: 'floating',
        floatingRect: { ...defaults[windowId] },
      } satisfies ManagedWindowState,
    ]),
  ) as ManagedWindowsRecord,
  hosts: {
    left: createEmptyHostState(),
    right: createEmptyHostState(),
    bottom: createEmptyHostState(),
  },
})

export const openManagedWindow = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
  options?: OpenManagedWindowOptions,
): ManagedWindowsState => {
  const placement = options?.placement ?? state.windows[windowId].placement
  const nextWindow: ManagedWindowState = {
    ...state.windows[windowId],
    open: true,
    placement,
  }

  if (placement === 'floating') {
    return {
      windows: {
        ...state.windows,
        [windowId]: nextWindow,
      },
      hosts: removeWindowFromHosts(state.hosts, windowId),
    }
  }

  return {
    windows: {
      ...state.windows,
      [windowId]: nextWindow,
    },
    hosts: addWindowToHost(state.hosts, placement, windowId),
  }
}

export const closeManagedWindow = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
): ManagedWindowsState => ({
  windows: {
    ...state.windows,
    [windowId]: {
      ...state.windows[windowId],
      open: false,
    },
  },
  hosts: removeWindowFromHosts(state.hosts, windowId),
})

export const setManagedWindowPlacement = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
  placement: ManagedWindowPlacement,
): ManagedWindowsState => {
  const nextWindow: ManagedWindowState = {
    ...state.windows[windowId],
    placement,
  }
  if (placement === 'floating') {
    return {
      windows: {
        ...state.windows,
        [windowId]: nextWindow,
      },
      hosts: removeWindowFromHosts(state.hosts, windowId),
    }
  }
  return {
    windows: {
      ...state.windows,
      [windowId]: nextWindow,
    },
    hosts: state.windows[windowId].open ? addWindowToHost(state.hosts, placement, windowId) : removeWindowFromHosts(state.hosts, windowId),
  }
}

export const dockManagedWindow = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
  hostId: ManagedWindowDockHostId,
): ManagedWindowsState =>
  openManagedWindow(state, windowId, { placement: hostId })

export const floatManagedWindow = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
): ManagedWindowsState =>
  openManagedWindow(state, windowId, { placement: 'floating' })

export const setManagedHostActiveTab = (
  state: ManagedWindowsState,
  hostId: ManagedWindowDockHostId,
  windowId: ManagedWindowId,
): ManagedWindowsState => {
  const host = state.hosts[hostId]
  if (!host.tabs.includes(windowId)) {
    return state
  }
  return {
    windows: state.windows,
    hosts: {
      ...state.hosts,
      [hostId]: {
        ...host,
        activeTab: windowId,
      },
    },
  }
}

export const setManagedWindowFloatingRect = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
  floatingRect: FloatingDockRect,
): ManagedWindowsState => ({
  windows: {
    ...state.windows,
    [windowId]: {
      ...state.windows[windowId],
      floatingRect,
    },
  },
  hosts: state.hosts,
})

export const restoreManagedWindowsState = (
  fallbackState: ManagedWindowsState,
  candidate: unknown,
): ManagedWindowsState => {
  if (!isRecord(candidate)) {
    return fallbackState
  }

  const nextWindows: ManagedWindowsRecord = Object.fromEntries(
    MANAGED_WINDOW_IDS.map((windowId) => {
      const fallbackWindow = fallbackState.windows[windowId]
      const candidateWindow =
        isRecord(candidate.windows) && isRecord(candidate.windows[windowId]) ? candidate.windows[windowId] : null

      const nextPlacement =
        candidateWindow && isPlacement(candidateWindow.placement) ? candidateWindow.placement : fallbackWindow.placement
      const nextOpen = candidateWindow && typeof candidateWindow.open === 'boolean' ? candidateWindow.open : fallbackWindow.open
      const nextFloatingRect =
        candidateWindow &&
        isRecord(candidateWindow.floatingRect) &&
        isFiniteNumber(candidateWindow.floatingRect.x) &&
        isFiniteNumber(candidateWindow.floatingRect.y) &&
        isFiniteNumber(candidateWindow.floatingRect.width) &&
        isFiniteNumber(candidateWindow.floatingRect.height)
          ? {
              x: candidateWindow.floatingRect.x,
              y: candidateWindow.floatingRect.y,
              width: candidateWindow.floatingRect.width,
              height: candidateWindow.floatingRect.height,
            }
          : fallbackWindow.floatingRect

      return [
        windowId,
        {
          open: nextOpen,
          placement: nextPlacement,
          floatingRect: nextFloatingRect,
        } satisfies ManagedWindowState,
      ]
    }),
  ) as ManagedWindowsRecord

  const restoredHosts: ManagedWindowHostsState = {
    left: createEmptyHostState(),
    right: createEmptyHostState(),
    bottom: createEmptyHostState(),
  }

  const assigned = new Set<ManagedWindowId>()
  const candidateHosts = isRecord(candidate.hosts) ? candidate.hosts : null

  for (const hostId of HOST_IDS) {
    const fallbackHost = fallbackState.hosts[hostId]
    const candidateHost = candidateHosts && isRecord(candidateHosts[hostId]) ? candidateHosts[hostId] : null
    const candidateTabsRaw = candidateHost && Array.isArray(candidateHost.tabs) ? candidateHost.tabs : fallbackHost.tabs
    const filteredTabs: ManagedWindowId[] = []
    for (const tabValue of candidateTabsRaw) {
      if (
        !MANAGED_WINDOW_IDS.includes(tabValue as ManagedWindowId) ||
        assigned.has(tabValue as ManagedWindowId)
      ) {
        continue
      }
      const tabId = tabValue as ManagedWindowId
      const tabWindow = nextWindows[tabId]
      if (!tabWindow.open || tabWindow.placement !== hostId) {
        continue
      }
      filteredTabs.push(tabId)
      assigned.add(tabId)
    }
    const candidateActiveTab =
      candidateHost && MANAGED_WINDOW_IDS.includes(candidateHost.activeTab as ManagedWindowId)
        ? (candidateHost.activeTab as ManagedWindowId)
        : null
    restoredHosts[hostId] = {
      tabs: filteredTabs,
      activeTab:
        candidateActiveTab && filteredTabs.includes(candidateActiveTab)
          ? candidateActiveTab
          : (filteredTabs[filteredTabs.length - 1] ?? null),
    }
  }

  for (const windowId of MANAGED_WINDOW_IDS) {
    const windowState = nextWindows[windowId]
    if (!windowState.open || windowState.placement === 'floating' || assigned.has(windowId)) {
      continue
    }
    const host = restoredHosts[windowState.placement]
    host.tabs = [...host.tabs, windowId]
    host.activeTab = windowId
    assigned.add(windowId)
  }

  return {
    windows: nextWindows,
    hosts: restoredHosts,
  }
}
