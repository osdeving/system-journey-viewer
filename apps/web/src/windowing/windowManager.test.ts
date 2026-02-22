/**
 * Purpose: Verify window Manager behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  closeManagedWindow,
  createManagedWindowsState,
  dockManagedWindow,
  floatManagedWindow,
  openManagedWindow,
  setManagedHostActiveTab,
  setManagedWindowFloatingRect,
  setManagedWindowPlacement,
} from './windowManager'

describe('windowManager helpers', () => {
  const defaults = {
    inspector: { x: 820, y: 100, width: 360, height: 380 },
    journeys: { x: 820, y: 130, width: 360, height: 420 },
    timeline: { x: 120, y: 520, width: 760, height: 280 },
    dsl: { x: 140, y: 180, width: 860, height: 520 },
    help: { x: 20, y: 100, width: 420, height: 320 },
    preferences: { x: 840, y: 100, width: 380, height: 360 },
  }

  it('creates closed windows and empty dock hosts', () => {
    const state = createManagedWindowsState(defaults)
    expect(state.windows.inspector.open).toBe(false)
    expect(state.windows.help.open).toBe(false)
    expect(state.windows.preferences.open).toBe(false)
    expect(state.windows.help.placement).toBe('floating')
    expect(state.windows.help.floatingRect).toEqual(defaults.help)
    expect(state.windows.help.floatingRect).not.toBe(defaults.help)
    expect(state.hosts.left.tabs).toEqual([])
    expect(state.hosts.right.activeTab).toBeNull()
    expect(state.hosts.bottom.tabs).toEqual([])
  })

  it('docks windows into hosts and keeps active tab per host', () => {
    const state = createManagedWindowsState(defaults)
    const withHelp = dockManagedWindow(state, 'help', 'right')
    const withBoth = dockManagedWindow(withHelp, 'preferences', 'right')

    expect(withBoth.windows.help.open).toBe(true)
    expect(withBoth.windows.help.placement).toBe('right')
    expect(withBoth.windows.preferences.open).toBe(true)
    expect(withBoth.windows.preferences.placement).toBe('right')
    expect(withBoth.hosts.right.tabs).toEqual(['help', 'preferences'])
    expect(withBoth.hosts.right.activeTab).toBe('preferences')
  })

  it('moving a window between hosts removes it from the previous host', () => {
    const state = dockManagedWindow(createManagedWindowsState(defaults), 'help', 'right')
    const moved = dockManagedWindow(state, 'help', 'left')

    expect(moved.hosts.right.tabs).toEqual([])
    expect(moved.hosts.left.tabs).toEqual(['help'])
    expect(moved.hosts.left.activeTab).toBe('help')
    expect(moved.windows.help.placement).toBe('left')
  })

  it('floating a window removes it from all dock hosts and keeps it open', () => {
    const state = dockManagedWindow(createManagedWindowsState(defaults), 'help', 'bottom')
    const floated = floatManagedWindow(state, 'help')

    expect(floated.windows.help.open).toBe(true)
    expect(floated.windows.help.placement).toBe('floating')
    expect(floated.hosts.bottom.tabs).toEqual([])
    expect(floated.hosts.bottom.activeTab).toBeNull()
  })

  it('close removes the target window from hosts but preserves other host tabs', () => {
    let state = createManagedWindowsState(defaults)
    state = dockManagedWindow(state, 'help', 'right')
    state = dockManagedWindow(state, 'preferences', 'right')
    const next = closeManagedWindow(state, 'preferences')

    expect(next.windows.preferences.open).toBe(false)
    expect(next.hosts.right.tabs).toEqual(['help'])
    expect(next.hosts.right.activeTab).toBe('help')
    expect(next.windows.help.open).toBe(true)
  })

  it('open without placement reuses remembered dock placement and host membership', () => {
    let state = createManagedWindowsState(defaults)
    state = dockManagedWindow(state, 'help', 'left')
    state = closeManagedWindow(state, 'help')
    const reopened = openManagedWindow(state, 'help')

    expect(reopened.windows.help.open).toBe(true)
    expect(reopened.windows.help.placement).toBe('left')
    expect(reopened.hosts.left.tabs).toEqual(['help'])
    expect(reopened.hosts.left.activeTab).toBe('help')
  })

  it('setting placement while closed updates placement and clears stale host membership', () => {
    const state = setManagedWindowPlacement(createManagedWindowsState(defaults), 'help', 'right')
    expect(state.windows.help.placement).toBe('right')
    expect(state.windows.help.open).toBe(false)
    expect(state.hosts.right.tabs).toEqual([])
  })

  it('updates host active tab only when the tab exists in that host', () => {
    let state = createManagedWindowsState(defaults)
    state = dockManagedWindow(state, 'help', 'right')
    state = dockManagedWindow(state, 'preferences', 'right')
    const switched = setManagedHostActiveTab(state, 'right', 'help')
    const ignored = setManagedHostActiveTab(switched, 'left', 'help')

    expect(switched.hosts.right.activeTab).toBe('help')
    expect(ignored).toBe(switched)
  })

  it('updates floating rect without mutating host layout', () => {
    const state = dockManagedWindow(createManagedWindowsState(defaults), 'help', 'right')
    const next = setManagedWindowFloatingRect(state, 'help', { x: 30, y: 140, width: 500, height: 330 })

    expect(next.windows.help.floatingRect).toEqual({ x: 30, y: 140, width: 500, height: 330 })
    expect(next.hosts.right.tabs).toEqual(['help'])
  })
})
