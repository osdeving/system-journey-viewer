/**
 * Purpose: Verify the reusable status bar renders metrics and dispatches quick actions.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusBar } from './StatusBar'

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

describe('StatusBar', () => {
  it('renders left metrics and invokes action buttons', () => {
    const onToggle = vi.fn()
    activeContainer = document.createElement('div')
    document.body.append(activeContainer)
    activeRoot = createRoot(activeContainer)

    act(() => {
      activeRoot?.render(
        <StatusBar
          items={[
            { id: 'view', label: 'Root view', priority: 'primary' },
            { id: 'zoom', label: '100%' },
          ]}
          actions={[
            {
              id: 'minimap',
              label: 'Minimap',
              icon: <span>M</span>,
              active: true,
              onClick: onToggle,
            },
          ]}
        />,
      )
    })

    expect(activeContainer.textContent).toContain('Root view')
    expect(activeContainer.textContent).toContain('100%')
    const button = activeContainer.querySelector<HTMLButtonElement>('.app-status-bar-button')
    expect(button?.getAttribute('aria-pressed')).toBe('true')

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
