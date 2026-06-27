/**
 * Purpose: Render an app-native confirmation dialog for destructive or replacing actions.
 */

import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export type ConfirmationDialogTone = 'default' | 'danger'

export type ConfirmationDialogProps = {
  open: boolean
  title: string
  message: string
  details?: string[]
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmationDialogTone
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  open,
  title,
  message,
  details = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    if (tone === 'danger') {
      cancelButtonRef.current?.focus()
      return
    }
    confirmButtonRef.current?.focus()
  }, [open, tone])

  if (!open) {
    return null
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onConfirm()
    }
  }

  return (
    <div
      className="confirmation-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        className={`confirmation-dialog confirmation-dialog-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-message"
        onKeyDown={onKeyDown}
      >
        <div className="confirmation-dialog-header">
          <span className="confirmation-dialog-icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <strong id="confirmation-dialog-title">{title}</strong>
          <button
            type="button"
            className="confirmation-dialog-close"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
          >
            <X size={15} />
          </button>
        </div>
        <div className="confirmation-dialog-body">
          <p id="confirmation-dialog-message">{message}</p>
          {details.length ? (
            <ul className="confirmation-dialog-details">
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="confirmation-dialog-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="confirmation-dialog-button confirmation-dialog-button-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="confirmation-dialog-button confirmation-dialog-button-primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
