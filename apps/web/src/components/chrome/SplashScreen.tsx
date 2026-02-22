/**
 * Purpose: Render the reusable splash/onboarding screen with auto-dismiss and outside-click dismissal.
 */

import { useEffect } from 'react'

type SplashScreenProps = {
  visible: boolean
  versionLabel: string
  copyrightLabel: string
  autoHideMs?: number
  onDismiss: () => void
}

export function SplashScreen({
  visible,
  versionLabel,
  copyrightLabel,
  autoHideMs = 2200,
  onDismiss,
}: SplashScreenProps) {
  useEffect(() => {
    if (!visible) {
      return
    }
    const timeout = window.setTimeout(() => {
      onDismiss()
    }, autoHideMs)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [autoHideMs, onDismiss, visible])

  useEffect(() => {
    if (!visible) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onDismiss, visible])

  if (!visible) {
    return null
  }

  return (
    <div
      className="splash-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Application splash"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onDismiss()
        }
      }}
    >
      <div
        className="splash-card"
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="app-logo-badge splash-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <defs>
              <linearGradient id="sjvSplashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#sjvSplashGradient)" opacity="0.18" />
            <path
              d="M17 20 H29 M35 20 H47 M17 44 H29 M35 44 H47 M23 20 V44 M41 20 V44"
              stroke="url(#sjvSplashGradient)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle cx="23" cy="20" r="4.2" fill="#38bdf8" />
            <circle cx="41" cy="20" r="4.2" fill="#22c55e" />
            <circle cx="23" cy="44" r="4.2" fill="#22c55e" />
            <circle cx="41" cy="44" r="4.2" fill="#38bdf8" />
          </svg>
        </div>
        <div className="splash-copy">
          <h2>System Journey Viewer</h2>
          <p className="splash-version">{versionLabel}</p>
          <p className="splash-caption">Map systems, model journeys, inspect flows, and iterate with SJV Script.</p>
        </div>
        <div className="splash-preview" aria-hidden="true">
          <span className="splash-preview-chip splash-preview-chip-blue">Canvas</span>
          <span className="splash-preview-chip splash-preview-chip-green">Journey</span>
          <span className="splash-preview-chip splash-preview-chip-cyan">Inspector</span>
          <span className="splash-preview-chip splash-preview-chip-amber">SJV Script</span>
        </div>
        <small>{copyrightLabel}</small>
        <small className="splash-dismiss-hint">Click outside to dismiss</small>
      </div>
    </div>
  )
}

