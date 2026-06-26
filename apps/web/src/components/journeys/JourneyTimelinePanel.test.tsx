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

  it('renders current tick, main rows, and script-managed thread rows', () => {
    renderPanel()

    expect(activeContainer?.textContent).toContain('Step 1/1')
    expect(activeContainer?.textContent).toContain('Parallel x2')
    expect(activeContainer?.textContent).toContain('Current')
    expect(activeContainer?.textContent).toContain('1. Request account')
    expect(activeContainer?.textContent).toContain('Thread audit')
    expect(activeContainer?.textContent).toContain('Script-managed')
  })

  it('delegates drag, drop, and remove actions for main rows', () => {
    const props = renderPanel()
    const mainRow = activeContainer?.querySelector<HTMLLIElement>(
      '.journey-step-item-main',
    )
    const removeButton = mainRow?.querySelector<HTMLButtonElement>('button')

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
})
