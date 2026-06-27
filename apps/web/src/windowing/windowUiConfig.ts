/**
 * Purpose: Define managed window state, placement defaults, and windowing helpers for dock/float behavior.
 */

import type {
  ManagedWindowDefaults,
  ManagedWindowDockHostId,
  ManagedWindowId,
} from './windowManager'
import { MIN_SINGLE_TAB_DOCK_HOST_WIDTH } from '../layout/dockSizing'

export type ManagedWindowFloatingUiConfig = {
  title: string
  className?: string
  bodyClassName?: string
  minWidth: number
  minHeight: number
  zIndex?: number
}

export const MANAGED_WINDOW_DEFAULT_HOST_BY_ID: Record<ManagedWindowId, ManagedWindowDockHostId> = {
  palette: 'left',
  inspector: 'right',
  journeys: 'right',
  timeline: 'right',
  dsl: 'right',
  help: 'right',
  preferences: 'right',
}

export const MANAGED_WINDOW_FLOATING_UI_CONFIG: Record<ManagedWindowId, ManagedWindowFloatingUiConfig> = {
  palette: {
    title: 'Palette',
    bodyClassName: 'floating-window-body-dock',
    minWidth: MIN_SINGLE_TAB_DOCK_HOST_WIDTH,
    minHeight: 320,
  },
  inspector: {
    title: 'Inspector',
    bodyClassName: 'floating-window-body-dock',
    minWidth: MIN_SINGLE_TAB_DOCK_HOST_WIDTH,
    minHeight: 260,
  },
  journeys: {
    title: 'Journeys',
    bodyClassName: 'floating-window-body-dock',
    minWidth: 340,
    minHeight: 300,
  },
  timeline: {
    title: 'Journey Timeline',
    bodyClassName: 'floating-window-body-dock',
    minWidth: 460,
    minHeight: 240,
  },
  dsl: {
    title: 'SJV Script',
    bodyClassName: 'floating-window-body-dock floating-window-body-dsl',
    minWidth: 520,
    minHeight: 280,
  },
  help: {
    title: 'Help',
    className: 'help-window',
    bodyClassName: 'help-window-body',
    minWidth: 360,
    minHeight: 280,
    zIndex: 191,
  },
  preferences: {
    title: 'Preferences',
    className: 'preferences-window',
    minWidth: MIN_SINGLE_TAB_DOCK_HOST_WIDTH,
    minHeight: 260,
  },
}

export const createDefaultManagedWindowRects = (
  topbarHeight: number,
): ManagedWindowDefaults => ({
  palette: {
    x: 24,
    y: topbarHeight + 10,
    width: 300,
    height: typeof window === 'undefined' ? 560 : Math.max(360, window.innerHeight - topbarHeight - 90),
  },
  inspector: {
    x: typeof window === 'undefined' ? 860 : Math.max(12, window.innerWidth - 388),
    y: topbarHeight + 10,
    width: 372,
    height: 480,
  },
  journeys: {
    x: typeof window === 'undefined' ? 860 : Math.max(12, window.innerWidth - 404),
    y: topbarHeight + 28,
    width: 388,
    height: 520,
  },
  timeline: {
    x: 40,
    y: typeof window === 'undefined' ? 440 : Math.max(topbarHeight + 10, window.innerHeight - 320),
    width: typeof window === 'undefined' ? 900 : Math.max(560, window.innerWidth - 120),
    height: 280,
  },
  dsl: {
    x: 56,
    y: topbarHeight + 10,
    width: typeof window === 'undefined' ? 980 : Math.max(620, window.innerWidth - 112),
    height: typeof window === 'undefined' ? 560 : Math.max(360, window.innerHeight - topbarHeight - 90),
  },
  help: {
    x: 28,
    y: topbarHeight + 10,
    width: 520,
    height: 440,
  },
  preferences: {
    x: typeof window === 'undefined' ? 860 : Math.max(12, window.innerWidth - 396),
    y: topbarHeight + 10,
    width: 380,
    height: 372,
  },
})
