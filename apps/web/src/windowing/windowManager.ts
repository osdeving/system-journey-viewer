import type { FloatingDockRect } from '../layout/floatingDock'

export type ManagedWindowId = 'help' | 'preferences'

export type ManagedWindowPlacement = 'floating' | 'left' | 'right' | 'bottom'

export type ManagedWindowState = {
  open: boolean
  placement: ManagedWindowPlacement
  floatingRect: FloatingDockRect
}

export type ManagedWindowsState = Record<ManagedWindowId, ManagedWindowState>

export type ManagedWindowDefaults = Record<ManagedWindowId, FloatingDockRect>

export const createManagedWindowsState = (defaults: ManagedWindowDefaults): ManagedWindowsState => ({
  help: {
    open: false,
    placement: 'floating',
    floatingRect: { ...defaults.help },
  },
  preferences: {
    open: false,
    placement: 'floating',
    floatingRect: { ...defaults.preferences },
  },
})

type OpenManagedWindowOptions = {
  placement?: ManagedWindowPlacement
}

export const openManagedWindow = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
  options?: OpenManagedWindowOptions,
): ManagedWindowsState => ({
  ...state,
  [windowId]: {
    ...state[windowId],
    open: true,
    placement: options?.placement ?? state[windowId].placement,
  },
})

export const closeManagedWindow = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
): ManagedWindowsState => ({
  ...state,
  [windowId]: {
    ...state[windowId],
    open: false,
  },
})

export const setManagedWindowPlacement = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
  placement: ManagedWindowPlacement,
): ManagedWindowsState => ({
  ...state,
  [windowId]: {
    ...state[windowId],
    placement,
  },
})

export const setManagedWindowFloatingRect = (
  state: ManagedWindowsState,
  windowId: ManagedWindowId,
  floatingRect: FloatingDockRect,
): ManagedWindowsState => ({
  ...state,
  [windowId]: {
    ...state[windowId],
    floatingRect,
  },
})
