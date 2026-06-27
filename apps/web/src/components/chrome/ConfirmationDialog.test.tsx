/**
 * Purpose: Verify the app-native confirmation dialog actions and keyboard behavior.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmationDialog } from './ConfirmationDialog'
import type { ConfirmationDialogProps } from './ConfirmationDialog'

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

const renderDialog = (props?: Partial<ConfirmationDialogProps>) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot?.render(
      <ConfirmationDialog
        open
        title="Delete item?"
        message="This item will be removed."
        details={['This cannot be undone.']}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />,
    )
  })

  return { onConfirm, onCancel }
}

describe('ConfirmationDialog', () => {
  it('renders app-native confirmation copy and dispatches the confirm action', () => {
    const { onConfirm } = renderDialog()

    expect(activeContainer?.textContent).toContain('Delete item?')
    expect(activeContainer?.textContent).toContain('This cannot be undone.')

    const confirmButton = Array.from(activeContainer?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Delete',
    )
    expect(confirmButton).toBeDefined()

    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels on Escape', () => {
    const { onCancel } = renderDialog()
    const dialog = activeContainer?.querySelector<HTMLElement>('.confirmation-dialog')
    expect(dialog).not.toBeNull()

    act(() => {
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
