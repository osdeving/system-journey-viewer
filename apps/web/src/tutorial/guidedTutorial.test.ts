/**
 * Purpose: Verify guided tutorial step and overlay helper behavior with deterministic unit tests.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  clampGuidedTutorialStepIndex,
  resolveGuidedTutorialCardLayout,
  resolveGuidedTutorialTargetRect,
} from './guidedTutorial'

describe('guidedTutorial helpers', () => {
  it('clamps step indexes within available steps', () => {
    expect(clampGuidedTutorialStepIndex(-3, 5)).toBe(0)
    expect(clampGuidedTutorialStepIndex(2, 5)).toBe(2)
    expect(clampGuidedTutorialStepIndex(99, 5)).toBe(4)
    expect(clampGuidedTutorialStepIndex(3, 0)).toBe(0)
  })

  it('resolves selector targets with padding and viewport clamping', () => {
    const element = {
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: 100,
        height: 40,
      }),
    } as unknown as HTMLElement
    const doc = {
      querySelector: vi.fn(() => element),
    } as unknown as Document

    const rect = resolveGuidedTutorialTargetRect(
      { kind: 'selector', selector: '[data-tutorial-id="main-menu-bar"]', padding: 6 },
      doc,
      140,
      80,
    )

    expect(rect).toEqual({
      x: 4,
      y: 14,
      width: 112,
      height: 52,
    })
  })

  it('returns null when selector target is missing or collapsed', () => {
    const missingDoc = {
      querySelector: vi.fn(() => null),
    } as unknown as Document

    expect(
      resolveGuidedTutorialTargetRect(
        { kind: 'selector', selector: '.missing' },
        missingDoc,
        800,
        600,
      ),
    ).toBeNull()

    const collapsedDoc = {
      querySelector: vi.fn(
        () =>
          ({
            getBoundingClientRect: () => ({ left: 10, top: 10, width: 0, height: 0 }),
          }) as unknown as HTMLElement,
      ),
    } as unknown as Document

    expect(
      resolveGuidedTutorialTargetRect(
        { kind: 'selector', selector: '.collapsed' },
        collapsedDoc,
        800,
        600,
      ),
    ).toBeNull()
  })

  it('positions the tutorial card near the target with viewport fallback', () => {
    const bottomLayout = resolveGuidedTutorialCardLayout({
      placement: 'bottom',
      targetRect: { x: 120, y: 40, width: 220, height: 48 },
      viewportWidth: 900,
      viewportHeight: 480,
    })

    expect(bottomLayout.left).toBeGreaterThanOrEqual(16)
    expect(bottomLayout.top).toBeGreaterThan(80)
    expect(bottomLayout.maxWidth).toBeLessThanOrEqual(360)

    const topFallbackLayout = resolveGuidedTutorialCardLayout({
      placement: 'bottom',
      targetRect: { x: 220, y: 360, width: 180, height: 60 },
      viewportWidth: 900,
      viewportHeight: 480,
    })

    expect(topFallbackLayout.top).toBeLessThan(360)
  })
})

