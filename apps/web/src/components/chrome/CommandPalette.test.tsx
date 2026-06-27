/**
 * Purpose: Verify the command palette renders searchable actions and runs the selected item.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandPalette } from './CommandPalette'
import type { CommandPaletteItem } from '../../commandPalette/commandPalette'

let activeContainer: HTMLDivElement | null = null
let activeRoot: Root | null = null

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  if (activeRoot) {
    act(() => {
      activeRoot?.unmount()
    })
  }
  activeRoot = null
  activeContainer?.remove()
  activeContainer = null
})

const items: CommandPaletteItem[] = [
  {
    id: 'command:fit',
    title: 'Fit View to Canvas',
    section: 'Commands',
    shortcut: 'Shift+1',
  },
  {
    id: 'node:checkout',
    title: 'Checkout API',
    section: 'Nodes',
    subtitle: 'Select node',
  },
]

describe('CommandPalette', () => {
  it('renders matching items and runs the clicked command', () => {
    const onRun = vi.fn()
    activeContainer = document.createElement('div')
    document.body.append(activeContainer)
    activeRoot = createRoot(activeContainer)

    act(() => {
      activeRoot?.render(
        <CommandPalette
          open
          items={items}
          query="checkout"
          onQueryChange={() => undefined}
          onRun={onRun}
          onClose={() => undefined}
        />,
      )
    })

    expect(activeContainer.textContent).toContain('Checkout API')
    expect(activeContainer.textContent).not.toContain('Fit View to Canvas')

    const option = activeContainer.querySelector<HTMLButtonElement>('.command-palette-row')
    expect(option).not.toBeNull()

    act(() => {
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onRun).toHaveBeenCalledWith('node:checkout')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    activeContainer = document.createElement('div')
    document.body.append(activeContainer)
    activeRoot = createRoot(activeContainer)

    act(() => {
      activeRoot?.render(
        <CommandPalette
          open
          items={items}
          query=""
          onQueryChange={() => undefined}
          onRun={() => undefined}
          onClose={onClose}
        />,
      )
    })

    const dialog = activeContainer.querySelector<HTMLDivElement>('.command-palette')
    expect(dialog).not.toBeNull()

    act(() => {
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('marks hidden overflow cues without exposing a visible scrollbar state', () => {
    activeContainer = document.createElement('div')
    document.body.append(activeContainer)
    activeRoot = createRoot(activeContainer)

    act(() => {
      activeRoot?.render(
        <CommandPalette
          open
          items={Array.from({ length: 12 }, (_, index) => ({
            id: `command:${index}`,
            title: `Command ${index}`,
            section: 'Commands',
          }))}
          query=""
          onQueryChange={() => undefined}
          onRun={() => undefined}
          onClose={() => undefined}
        />,
      )
    })

    const shell = activeContainer.querySelector<HTMLDivElement>('.command-palette-list-shell')
    const list = activeContainer.querySelector<HTMLDivElement>('.command-palette-list')
    expect(shell).not.toBeNull()
    expect(list).not.toBeNull()

    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 120 })
    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 360 })
    Object.defineProperty(list, 'scrollTop', { configurable: true, value: 0, writable: true })

    act(() => {
      list?.dispatchEvent(new Event('scroll', { bubbles: true }))
    })

    expect(shell?.classList.contains('command-palette-results-scroll-top')).toBe(false)
    expect(shell?.classList.contains('command-palette-results-scroll-bottom')).toBe(true)

    if (list) {
      list.scrollTop = 240
    }
    act(() => {
      list?.dispatchEvent(new Event('scroll', { bubbles: true }))
    })

    expect(shell?.classList.contains('command-palette-results-scroll-top')).toBe(true)
    expect(shell?.classList.contains('command-palette-results-scroll-bottom')).toBe(false)
  })
})
