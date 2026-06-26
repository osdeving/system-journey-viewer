/**
 * Purpose: Verify InspectorPanel renders editor selections and delegates form actions.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EdgeModel, NodeModel } from '../../model/types'
import { InspectorPanel, type InspectorPanelProps } from './InspectorPanel'

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

const node: NodeModel = {
  id: 'n1',
  presetId: 'service',
  kind: 'component',
  name: 'API',
  tags: [],
  tech: { id: 'node', label: 'Node.js', iconKey: 'node' },
  bounds: { x: 0, y: 0, w: 180, h: 80 },
  ports: [],
  children: [],
  style: { fillColor: '#2563eb', textColor: '#ffffff' },
}

const edge: EdgeModel = {
  id: 'e1',
  from: { nodeId: 'n1' },
  to: { nodeId: 'n2' },
  protocolPresetId: 'https',
  label: 'Calls',
  route: { kind: 'auto', points: [] },
  style: { dashed: false, thickness: 2, arrow: true, labelPosition: 0.5 },
}

const renderPanel = (props: Partial<InspectorPanelProps> = {}): InspectorPanelProps => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)

  const resolvedProps: InspectorPanelProps = {
    selectedNode: node,
    selectedEdge: edge,
    selectedNodeCount: 1,
    selectedNodePresetLabel: 'Service',
    theme: 'dark',
    nodeColorPresets: ['#2563eb', '#16a34a'],
    nodeTextColorPresets: ['#ffffff', '#0f172a'],
    protocolOptions: [{ id: 'https', label: 'HTTPS' }],
    activeJourneyId: 'j1',
    getTooltip: (label) => `Tip: ${label}`,
    onNodeNameChange: vi.fn(),
    onNodeTechChange: vi.fn(),
    onNodeColorChange: vi.fn(),
    onNodeTextColorChange: vi.fn(),
    onEdgeLabelChange: vi.fn(),
    onEdgeProtocolChange: vi.fn(),
    onEdgeLabelPositionChange: vi.fn(),
    onEdgeLabelSideChange: vi.fn(),
    onEdgeLabelAngleChange: vi.fn(),
    onDuplicateSelection: vi.fn(),
    onDeleteSelection: vi.fn(),
    onAddEdgeToActiveJourney: vi.fn(),
    ...props,
  }

  act(() => {
    activeRoot?.render(<InspectorPanel {...resolvedProps} />)
  })

  return resolvedProps
}

describe('InspectorPanel', () => {
  it('renders empty state without a selection', () => {
    renderPanel({ selectedNode: null, selectedEdge: null, selectedNodeCount: 0 })

    expect(activeContainer?.textContent).toContain('Select a node or edge on the canvas.')
  })

  it('renders selected node and edge details from props', () => {
    renderPanel({ selectedNodeCount: 2 })

    expect(activeContainer?.textContent).toContain('2 selected components')
    expect(activeContainer?.textContent).toContain('Node details')
    expect(activeContainer?.textContent).toContain('Edge details')
    expect(activeContainer?.querySelector<HTMLInputElement>('#node-preset')?.value).toBe(
      'Service',
    )
    expect(activeContainer?.textContent).toContain('HTTPS')
  })

  it('delegates palette, duplicate, delete, and journey actions', () => {
    const props = renderPanel()
    const colorChip = activeContainer?.querySelector<HTMLButtonElement>(
      '.node-color-presets button',
    )
    const duplicateButton = Array.from(
      activeContainer?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => button.textContent === 'Duplicate')
    const deleteButton = Array.from(
      activeContainer?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => button.textContent === 'Delete')
    const addToJourneyButton = Array.from(
      activeContainer?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => button.textContent === 'Add to Active Journey')

    act(() => {
      colorChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      duplicateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      addToJourneyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(props.onNodeColorChange).toHaveBeenCalledWith('n1', '#2563eb')
    expect(props.onDuplicateSelection).toHaveBeenCalled()
    expect(props.onDeleteSelection).toHaveBeenCalled()
    expect(props.onAddEdgeToActiveJourney).toHaveBeenCalledWith('e1')
  })
})
