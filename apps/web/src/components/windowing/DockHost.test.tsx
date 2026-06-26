/**
 * Purpose: Verify DockHost renders a compact header and scroll affordance controls.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { DockHost } from './DockHost'

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

const renderDockHost = (): void => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot?.render(
      <DockHost
        tabs={[
          { id: 'palette', label: 'Palette', icon: <span>P</span> },
          { id: 'inspector', label: 'Inspector', icon: <span>I</span> },
        ]}
        activeTabId="palette"
        onTabSelect={() => undefined}
        headerActions={<button type="button">Dock right</button>}
        renderTabPanel={(tabId) => <div>{tabId} panel</div>}
      />,
    )
  })
}

describe('DockHost', () => {
  it('renders tabs and actions inside a compact header', () => {
    renderDockHost()

    expect(activeContainer?.querySelector('.dock-host-header')).not.toBeNull()
    expect(activeContainer?.querySelector('.dock-host-actions-row')?.textContent).toContain('Dock right')
    expect(activeContainer?.querySelector('[role="tablist"]')?.className).toContain('dock-host-tabs')
    expect(activeContainer?.querySelector('.dock-host-body')?.textContent).toContain('palette panel')
  })

  it('renders vertical scroll controls without exposing native scrollbar chrome', () => {
    renderDockHost()

    expect(activeContainer?.querySelector('.dock-host-scroll-controls')).not.toBeNull()
    expect(activeContainer?.querySelector('button[aria-label="Scroll dock panel up"]')).not.toBeNull()
    expect(activeContainer?.querySelector('button[aria-label="Scroll dock panel down"]')).not.toBeNull()
  })
})
