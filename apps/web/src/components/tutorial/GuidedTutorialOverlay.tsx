/**
 * Purpose: Render a reusable guided tutorial overlay with spotlight targeting and step navigation controls.
 */

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  resolveGuidedTutorialCardLayout,
  resolveGuidedTutorialTargetRect,
  type GuidedTutorialRect,
  type GuidedTutorialStep,
} from '../../tutorial/guidedTutorial'

type GuidedTutorialOverlayProps = {
  step: GuidedTutorialStep
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

const rectEquals = (left: GuidedTutorialRect | null, right: GuidedTutorialRect | null) => {
  if (left === right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  )
}

export function GuidedTutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: GuidedTutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<GuidedTutorialRect | null>(null)

  useEffect(() => {
    const measure = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return
      }
      const nextRect = resolveGuidedTutorialTargetRect(step.target, document, window.innerWidth, window.innerHeight)
      setTargetRect((current) => (rectEquals(current, nextRect) ? current : nextRect))
    }

    measure()

    const rafA = window.requestAnimationFrame(measure)
    const rafB = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(measure)
    })
    const delayedMeasure = window.setTimeout(measure, 140)

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.cancelAnimationFrame(rafA)
      window.cancelAnimationFrame(rafB)
      window.clearTimeout(delayedMeasure)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onSkip()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onBack()
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onBack, onNext, onSkip])

  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 720 : window.innerHeight
  const cardLayout = useMemo(
    () =>
      resolveGuidedTutorialCardLayout({
        targetRect,
        placement: step.placement,
        viewportWidth,
        viewportHeight,
      }),
    [step.placement, targetRect, viewportHeight, viewportWidth],
  )

  const spotlightStyle = targetRect
    ? ({
        left: `${Math.round(targetRect.x)}px`,
        top: `${Math.round(targetRect.y)}px`,
        width: `${Math.round(targetRect.width)}px`,
        height: `${Math.round(targetRect.height)}px`,
      } satisfies CSSProperties)
    : undefined

  const cardStyle = {
    left: `${cardLayout.left}px`,
    top: `${cardLayout.top}px`,
    maxWidth: `${cardLayout.maxWidth}px`,
  } satisfies CSSProperties

  return (
    <div className="guided-tutorial-overlay" role="dialog" aria-modal="true" aria-label="Guided tutorial">
      <div className="guided-tutorial-backdrop" />
      {targetRect ? <div className="guided-tutorial-spotlight" style={spotlightStyle} /> : null}
      <section className="guided-tutorial-card" style={cardStyle} data-tutorial-id="guided-tutorial-card">
        <header className="guided-tutorial-card-header">
          <div>
            <p className="guided-tutorial-eyebrow">Guided Tutorial</p>
            <h3>{step.title}</h3>
          </div>
          <span className="guided-tutorial-progress">
            {Math.min(stepIndex + 1, totalSteps)}/{totalSteps}
          </span>
        </header>
        <p className="guided-tutorial-body">{step.body}</p>
        {step.target && !targetRect ? (
          <p className="guided-tutorial-missing-target">
            {step.missingTargetHint ?? 'This UI area is currently hidden by layout or preferences. You can continue the tutorial.'}
          </p>
        ) : null}
        <footer className="guided-tutorial-actions">
          <button type="button" onClick={onBack} disabled={stepIndex <= 0}>
            Back
          </button>
          <span className="guided-tutorial-actions-spacer" />
          <button type="button" className="guided-tutorial-link-button" onClick={onSkip}>
            Skip
          </button>
          <button type="button" className="guided-tutorial-primary-button" onClick={onNext}>
            {stepIndex >= totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </footer>
        <p className="guided-tutorial-shortcuts">Shortcuts: Left/Right arrows, Enter, Esc</p>
      </section>
    </div>
  )
}

