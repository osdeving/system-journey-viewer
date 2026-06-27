/**
 * Purpose: Verify DockHost renders a compact header and scroll affordance controls.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DockHost } from './DockHost'

let activeContainer: HTMLDivElement | null = null
let activeRoot: Root | null = null
const defaultDockHostTabs = [
  { id: 'palette', label: 'Palette', icon: <span>P</span> },
  { id: 'inspector', label: 'Inspector', icon: <span>I</span> },
]

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

const renderDockHost = (
  options: {
    onHeaderTearOff?: () => void
    tabs?: typeof defaultDockHostTabs
    activeTabId?: string
  } = {},
): void => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)
  const tabs = options.tabs ?? defaultDockHostTabs

  act(() => {
    activeRoot?.render(
      <DockHost
        tabs={tabs}
        activeTabId={options.activeTabId ?? 'palette'}
        onTabSelect={() => undefined}
        onHeaderTearOff={options.onHeaderTearOff}
        headerActions={<button type="button">Dock right</button>}
        renderTabPanel={(tabId) => <div>{tabId} panel</div>}
      />,
    )
  })
}

const dispatchPointerEvent = (
  target: Element,
  type: string,
  options: { clientX: number; clientY: number; pointerId?: number; button?: number },
) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    button: { value: options.button ?? 0 },
    clientX: { value: options.clientX },
    clientY: { value: options.clientY },
    pointerId: { value: options.pointerId ?? 1 },
  })
  target.dispatchEvent(event)
}

describe('DockHost', () => {
  it('renders tabs and actions inside a compact header', () => {
    renderDockHost()

    expect(activeContainer?.querySelector('.dock-host-header')).not.toBeNull()
    expect(activeContainer?.querySelector('.dock-host-tabs-row')?.className).toContain(
      'overflow-strip-navs-collapsed',
    )
    expect(activeContainer?.querySelector('.dock-host-actions-row')?.textContent).toContain('Dock right')
    expect(activeContainer?.querySelector('[role="tablist"]')?.className).toContain('dock-host-tabs')
    expect(activeContainer?.querySelector('.dock-host-body')?.textContent).toContain('palette panel')
  })

  it('keeps tab overflow controls collapsed when the host has one tab', () => {
    renderDockHost({
      tabs: [{ id: 'palette', label: 'Palette', icon: <span>P</span> }],
      activeTabId: 'palette',
    })

    expect(activeContainer?.querySelectorAll('[role="tab"]')).toHaveLength(1)
    expect(activeContainer?.querySelector('.dock-host-tabs-row')?.className).toContain(
      'overflow-strip-navs-collapsed',
    )
    const navButtons = Array.from(activeContainer?.querySelectorAll('.overflow-strip-nav') ?? [])
    expect(navButtons).toHaveLength(2)
    expect(navButtons.every((button) => button.className.includes('overflow-strip-nav-collapsed'))).toBe(true)
  })

  it('calls the tear-off handler when the titlebar background is dragged', () => {
    const onHeaderTearOff = vi.fn()
    renderDockHost({ onHeaderTearOff })

    const header = activeContainer?.querySelector('.dock-host-header')
    expect(header).toBeInstanceOf(HTMLElement)
    Object.assign(header as HTMLElement, {
      releasePointerCapture: () => undefined,
      setPointerCapture: () => undefined,
    })

    act(() => {
      dispatchPointerEvent(header as Element, 'pointerdown', { clientX: 12, clientY: 12 })
      dispatchPointerEvent(header as Element, 'pointermove', { clientX: 24, clientY: 12 })
    })

    expect(onHeaderTearOff).toHaveBeenCalledTimes(1)
  })

  it('does not tear off when dragging a tab or an action button', () => {
    const onHeaderTearOff = vi.fn()
    renderDockHost({ onHeaderTearOff })

    const tab = activeContainer?.querySelector('[role="tab"]')
    const action = activeContainer?.querySelector('.dock-host-actions-row button')
    expect(tab).toBeInstanceOf(HTMLElement)
    expect(action).toBeInstanceOf(HTMLElement)

    act(() => {
      dispatchPointerEvent(tab as Element, 'pointerdown', { clientX: 12, clientY: 12 })
      dispatchPointerEvent(tab as Element, 'pointermove', { clientX: 24, clientY: 12 })
      dispatchPointerEvent(action as Element, 'pointerdown', { clientX: 12, clientY: 12, pointerId: 2 })
      dispatchPointerEvent(action as Element, 'pointermove', { clientX: 24, clientY: 12, pointerId: 2 })
    })

    expect(onHeaderTearOff).not.toHaveBeenCalled()
  })

  it('renders vertical scroll controls without exposing native scrollbar chrome', () => {
    renderDockHost()

    expect(activeContainer?.querySelector('.dock-host-scroll-controls')).not.toBeNull()
    expect(activeContainer?.querySelector('button[aria-label="Scroll dock panel up"]')).not.toBeNull()
    expect(activeContainer?.querySelector('button[aria-label="Scroll dock panel down"]')).not.toBeNull()
  })
})
