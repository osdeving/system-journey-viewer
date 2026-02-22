/**
 * Purpose: Verify guided tutorial step and overlay helper behavior with deterministic unit tests.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  clampGuidedTutorialStepIndex,
  resolveGuidedTutorialBackdropPanes,
  resolveGuidedTutorialStepCompletion,
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

  it('resolves multi-selector targets as a single union spotlight rect', () => {
    const elementsBySelector: Record<string, HTMLElement> = {
      '.menu-trigger': {
        getBoundingClientRect: () => ({
          left: 12,
          top: 18,
          width: 90,
          height: 32,
        }),
      } as unknown as HTMLElement,
      '.menu-list': {
        getBoundingClientRect: () => ({
          left: 12,
          top: 54,
          width: 220,
          height: 140,
        }),
      } as unknown as HTMLElement,
    }
    const doc = {
      querySelector: vi.fn((selector: string) => elementsBySelector[selector] ?? null),
    } as unknown as Document

    const rect = resolveGuidedTutorialTargetRect(
      { kind: 'selectors', selectors: ['.menu-trigger', '.menu-list'], padding: 6 },
      doc,
      600,
      400,
    )

    expect(rect).toEqual({
      x: 6,
      y: 12,
      width: 232,
      height: 188,
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

  it('splits the backdrop into panes around the spotlight target', () => {
    const panes = resolveGuidedTutorialBackdropPanes(
      { x: 100, y: 60, width: 200, height: 120 },
      800,
      600,
    )

    expect(panes).toHaveLength(4)
    expect(panes[0]).toEqual({ top: 0, left: 0, width: 800, height: 60 })
    expect(panes[1]).toEqual({ top: 60, left: 0, width: 100, height: 120 })
    expect(panes[2]).toEqual({ top: 60, left: 300, width: 500, height: 120 })
    expect(panes[3]).toEqual({ top: 180, left: 0, width: 800, height: 420 })
  })

  it('resolves action-gated step completion from menu state and event counters', () => {
    const menuStepStatus = resolveGuidedTutorialStepCompletion(
      {
        id: 'window-menu',
        title: 'Window Menu',
        body: 'Open window menu',
        placement: 'bottom',
        completionRule: {
          kind: 'desktopMenuOpen',
          menuId: 'window',
          prompt: 'Click Window',
        },
      },
      {
        openDesktopMenuId: 'window',
        eventCounts: {},
        eventBaselineByStepId: {},
      },
    )

    expect(menuStepStatus).toEqual({
      requiresAction: true,
      isComplete: true,
      prompt: 'Click Window',
    })

    const eventStepStatus = resolveGuidedTutorialStepCompletion(
      {
        id: 'panel-shortcuts',
        title: 'Panel Shortcuts',
        body: 'Click a shortcut',
        placement: 'bottom',
        completionRule: {
          kind: 'event',
          eventId: 'panel-shortcut-click',
          prompt: 'Click shortcut',
        },
      },
      {
        openDesktopMenuId: null,
        eventCounts: { 'panel-shortcut-click': 4 },
        eventBaselineByStepId: { 'panel-shortcuts': 3 },
      },
    )

    expect(eventStepStatus.isComplete).toBe(true)
    expect(eventStepStatus.requiresAction).toBe(true)
    expect(eventStepStatus.prompt).toBe('Click shortcut')
  })
})
