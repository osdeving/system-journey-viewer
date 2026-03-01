/**
 * Purpose: Verify the reusable PanelGroup collapses by default and toggles open state on demand.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { PanelGroup } from './PanelGroup'

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

describe('PanelGroup', () => {
  it('starts collapsed when requested and expands on toggle', () => {
    activeContainer = document.createElement('div')
    document.body.append(activeContainer)
    activeRoot = createRoot(activeContainer)

    act(() => {
      activeRoot?.render(
        <PanelGroup title="Filter & Layout" defaultExpanded={false}>
          <p>Body content</p>
        </PanelGroup>,
      )
    })

    expect(activeContainer.textContent).toContain('Filter & Layout')
    expect(activeContainer.textContent).not.toContain('Body content')

    const toggle = activeContainer.querySelector<HTMLButtonElement>('.panel-group-toggle')
    expect(toggle).not.toBeNull()

    act(() => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(activeContainer.textContent).toContain('Body content')
  })
})
