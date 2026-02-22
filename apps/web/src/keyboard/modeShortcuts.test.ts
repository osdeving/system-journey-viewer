/**
 * Purpose: Verify mode Shortcuts behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { resolveModeShortcutAction } from './modeShortcuts'

describe('resolveModeShortcutAction', () => {
  it('supports focus mode toggle with F only', () => {
    expect(resolveModeShortcutAction('f', { focusMode: false, presentationMode: false })).toBe('toggle-focus')
    expect(resolveModeShortcutAction('F', { focusMode: false, presentationMode: false })).toBe('toggle-focus')
  })

  it('does not map P key to presentation mode shortcut', () => {
    expect(resolveModeShortcutAction('p', { focusMode: false, presentationMode: false })).toBeNull()
    expect(resolveModeShortcutAction('P', { focusMode: true, presentationMode: true })).toBeNull()
  })

  it('supports Escape only when immersive mode is active', () => {
    expect(resolveModeShortcutAction('Escape', { focusMode: true, presentationMode: false })).toBe('exit-immersive')
    expect(resolveModeShortcutAction('Escape', { focusMode: false, presentationMode: true })).toBe('exit-immersive')
    expect(resolveModeShortcutAction('Escape', { focusMode: false, presentationMode: false })).toBeNull()
  })
})
