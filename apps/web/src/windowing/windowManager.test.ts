import { describe, expect, it } from 'vitest'
import {
  closeManagedWindow,
  createManagedWindowsState,
  openManagedWindow,
  setManagedWindowFloatingRect,
  setManagedWindowPlacement,
} from './windowManager'

describe('windowManager helpers', () => {
  const defaults = {
    help: { x: 20, y: 100, width: 420, height: 320 },
    preferences: { x: 840, y: 100, width: 380, height: 360 },
  }

  it('creates closed floating windows with independent rect copies', () => {
    const state = createManagedWindowsState(defaults)
    expect(state.help.open).toBe(false)
    expect(state.preferences.open).toBe(false)
    expect(state.help.placement).toBe('floating')
    expect(state.help.floatingRect).toEqual(defaults.help)
    expect(state.help.floatingRect).not.toBe(defaults.help)
  })

  it('opens a window and preserves last placement by default', () => {
    const state = createManagedWindowsState(defaults)
    const moved = setManagedWindowPlacement(state, 'help', 'right')
    const opened = openManagedWindow(moved, 'help')
    expect(opened.help.open).toBe(true)
    expect(opened.help.placement).toBe('right')
  })

  it('can override placement when opening', () => {
    const state = createManagedWindowsState(defaults)
    const opened = openManagedWindow(state, 'preferences', { placement: 'floating' })
    expect(opened.preferences.open).toBe(true)
    expect(opened.preferences.placement).toBe('floating')
  })

  it('closes only the targeted window', () => {
    const state = openManagedWindow(createManagedWindowsState(defaults), 'help')
    const next = closeManagedWindow(state, 'help')
    expect(next.help.open).toBe(false)
    expect(next.preferences.open).toBe(false)
  })

  it('updates floating rect without mutating other windows', () => {
    const state = createManagedWindowsState(defaults)
    const next = setManagedWindowFloatingRect(state, 'help', { x: 30, y: 140, width: 500, height: 330 })
    expect(next.help.floatingRect).toEqual({ x: 30, y: 140, width: 500, height: 330 })
    expect(next.preferences.floatingRect).toEqual(defaults.preferences)
  })
})
