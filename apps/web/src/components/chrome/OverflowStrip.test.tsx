/**
 * Purpose: Verify horizontal overflow navigation behavior for reusable chrome strips.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { OverflowStrip } from './OverflowStrip'

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

const renderOverflowStrip = (disableNavigation = false): void => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot?.render(
      <OverflowStrip collapseNavWhenHidden disableNavigation={disableNavigation}>
        <button type="button">One long tab title</button>
        <button type="button">Another long tab title</button>
      </OverflowStrip>,
    )
  })
}

const simulateMeasuredOverflow = (): void => {
  const viewport = activeContainer?.querySelector('.overflow-strip-viewport')
  expect(viewport).toBeInstanceOf(HTMLElement)
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 80 })
  Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 240 })
  Object.defineProperty(viewport, 'scrollLeft', { configurable: true, writable: true, value: 0 })

  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

describe('OverflowStrip', () => {
  it('shows overflow navigation when measured content overflows', () => {
    renderOverflowStrip()
    simulateMeasuredOverflow()

    expect(activeContainer?.querySelector('.overflow-strip')?.className).not.toContain(
      'overflow-strip-navs-collapsed',
    )
    const navButtons = Array.from(activeContainer?.querySelectorAll('.overflow-strip-nav') ?? [])
    expect(navButtons.every((button) => button.className.includes('overflow-strip-nav-collapsed'))).toBe(false)
    expect((navButtons[1] as HTMLButtonElement | undefined)?.disabled).toBe(false)
  })

  it('keeps overflow navigation collapsed when navigation is disabled', () => {
    renderOverflowStrip(true)
    simulateMeasuredOverflow()

    expect(activeContainer?.querySelector('.overflow-strip')?.className).toContain(
      'overflow-strip-navs-collapsed',
    )
    const navButtons = Array.from(activeContainer?.querySelectorAll('.overflow-strip-nav') ?? [])
    expect(navButtons.every((button) => button.className.includes('overflow-strip-nav-collapsed'))).toBe(true)
    expect(navButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
  })
})
