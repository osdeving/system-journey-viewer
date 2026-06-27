/**
 * Purpose: Verify JourneyTimelinePanel renders timeline rows and delegates interactions.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EdgeModel, JourneyModel } from '../../model/types'
import type { JourneyTimelineRow } from '../../journeys/timelineRows'
import { JourneyTimelinePanel, type JourneyTimelinePanelProps } from './JourneyTimelinePanel'

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

const edge: EdgeModel = {
  id: 'e1',
  from: { nodeId: 'source' },
  to: { nodeId: 'target' },
  protocolPresetId: 'https',
  label: 'Request account',
  route: { kind: 'auto', points: [] },
  style: { dashed: false, thickness: 2, arrow: true },
}

const activeJourney: JourneyModel = {
  id: 'journey-login',
  name: 'Login',
  colorKey: '#2563eb',
  steps: [{ n: 1, edgeId: 'e1' }],
  player: { loop: false, speedMs: 900, pauseOnStep: false },
}

const rows: JourneyTimelineRow[] = [
  {
    key: '0:main:e1',
    tickIndex: 0,
    tickStepCount: 2,
    showTickBadge: true,
    laneKind: 'main',
    laneStepNumber: 1,
    edgeId: 'e1',
    accentColor: '#2563eb',
  },
  {
    key: '0:thread:e2',
    tickIndex: 0,
    tickStepCount: 2,
    showTickBadge: false,
    laneKind: 'thread',
    threadId: 'audit',
    laneStepNumber: 1,
    edgeId: 'e2',
    accentColor: '#9333ea',
  },
]

const renderPanel = (props: Partial<JourneyTimelinePanelProps> = {}): JourneyTimelinePanelProps => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)

  const resolvedProps: JourneyTimelinePanelProps = {
    activeJourney,
    rows,
    edgesById: { e1: edge },
    playerJourneyId: activeJourney.id,
    playerStepIndex: 0,
    playerJourneyPlaybackLength: 1,
    onStepDragStart: vi.fn(),
    onStepDrop: vi.fn(),
    onStepDragEnd: vi.fn(),
    onRemoveStep: vi.fn(),
    onIndentStep: vi.fn(),
    onOutdentStep: vi.fn(),
    ...props,
  }

  act(() => {
    activeRoot?.render(<JourneyTimelinePanel {...resolvedProps} />)
  })

  return resolvedProps
}

describe('JourneyTimelinePanel', () => {
  it('renders empty state when no journey is active', () => {
    renderPanel({ activeJourney: undefined, rows: [] })

    expect(activeContainer?.textContent).toContain(
      'Select a journey on the sidebar to view the timeline.',
    )
  })

  it('renders current tick, main rows, and editable thread rows', () => {
    renderPanel()

    expect(activeContainer?.textContent).toContain('Step 1/1')
    expect(activeContainer?.textContent).toContain('Parallel x2')
    expect(activeContainer?.textContent).toContain('Current')
    expect(activeContainer?.textContent).toContain('1. Request account')
    expect(activeContainer?.textContent).toContain('Thread audit')
    expect(activeContainer?.querySelector('button[title="Outdent to main lane (Shift+Tab)"]')).not.toBeNull()
  })

  it('delegates drag, drop, and remove actions for main rows', () => {
    const props = renderPanel()
    const mainRow = activeContainer?.querySelector<HTMLLIElement>(
      '.journey-step-item-main',
    )
    const removeButton = Array.from(mainRow?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
      (button) => button.textContent === 'Remove',
    )

    act(() => {
      mainRow?.dispatchEvent(new Event('dragstart', { bubbles: true }))
      mainRow?.dispatchEvent(new Event('drop', { bubbles: true }))
      mainRow?.dispatchEvent(new Event('dragend', { bubbles: true }))
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(props.onStepDragStart).toHaveBeenCalledWith('journey-login', 'e1')
    expect(props.onStepDrop).toHaveBeenCalledWith('journey-login', 'e1')
    expect(props.onStepDragEnd).toHaveBeenCalled()
    expect(props.onRemoveStep).toHaveBeenCalledWith('journey-login', 'e1')
  })

  it('opens step context actions and delegates indent to the selected anchor', () => {
    const props = renderPanel({
      activeJourney: {
        ...activeJourney,
        steps: [
          { n: 1, edgeId: 'e0' },
          { n: 2, edgeId: 'e1' },
          { n: 3, edgeId: 'e3' },
        ],
      },
      rows: [
        {
          key: '1:main:e1',
          tickIndex: 1,
          tickStepCount: 1,
          showTickBadge: true,
          laneKind: 'main',
          laneStepNumber: 2,
          edgeId: 'e1',
          accentColor: '#2563eb',
        },
      ],
    })
    const row = activeContainer?.querySelector<HTMLLIElement>('.journey-step-item-main')

    act(() => {
      row?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 140 }))
    })

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.journey-step-context-menu button'))
    expect(buttons.map((button) => button.textContent)).toContain('Indent after step 1')
    expect(buttons.map((button) => button.textContent)).toContain('Indent after step 3')

    act(() => {
      buttons.find((button) => button.textContent === 'Indent after step 3')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(props.onIndentStep).toHaveBeenCalledWith('journey-login', 'e1', 'e3')
  })

  it('keeps the step context menu inside the viewport edge', () => {
    const originalInnerWidth = window.innerWidth
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 260 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 140 })

    try {
      renderPanel({
        activeJourney: {
          ...activeJourney,
          steps: [
            { n: 1, edgeId: 'e0' },
            { n: 2, edgeId: 'e1' },
            { n: 3, edgeId: 'e3' },
          ],
        },
        rows: [
          {
            key: '1:main:e1',
            tickIndex: 1,
            tickStepCount: 1,
            showTickBadge: true,
            laneKind: 'main',
            laneStepNumber: 2,
            edgeId: 'e1',
            accentColor: '#2563eb',
          },
        ],
      })
      const row = activeContainer?.querySelector<HTMLLIElement>('.journey-step-item-main')

      act(() => {
        row?.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, clientX: 252, clientY: 132 }),
        )
      })

      const menu = document.querySelector<HTMLElement>('.journey-step-context-menu')
      expect(menu).not.toBeNull()
      expect(Number.parseFloat(menu?.style.left ?? '0')).toBe(32)
      expect(Number.parseFloat(menu?.style.top ?? '0')).toBe(8)
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
    }
  })

  it('supports Tab indent and Shift+Tab outdent from focused rows', () => {
    const props = renderPanel({
      activeJourney: {
        ...activeJourney,
        steps: [
          { n: 1, edgeId: 'e0' },
          { n: 2, edgeId: 'e1' },
        ],
      },
    })
    const mainRow = activeContainer?.querySelector<HTMLLIElement>('.journey-step-item-main')
    const threadRow = activeContainer?.querySelector<HTMLLIElement>('.journey-step-item-thread')

    act(() => {
      mainRow?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      threadRow?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    expect(props.onIndentStep).toHaveBeenCalledWith('journey-login', 'e1', 'e0')
    expect(props.onOutdentStep).toHaveBeenCalledWith('journey-login', 'audit', 'e2')
  })
})
