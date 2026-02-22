/**
 * Purpose: Define managed window state, placement defaults, and windowing helpers for dock/float behavior.
 */

import type { FloatingDockRect } from '../layout/floatingDock'

export type ManagedWindowId = 'inspector' | 'journeys' | 'timeline' | 'dsl' | 'help' | 'preferences'
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
  'inspector',
  'journeys',
  'timeline',
  'dsl',
  'help',
  'preferences',
]

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
