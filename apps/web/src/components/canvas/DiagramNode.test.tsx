/**
 * Purpose: Verify the reusable DiagramNode SVG component renders node visuals without the editor store.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NodeModel } from '../../model/types'
import { DiagramNode } from './DiagramNode'

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

const makeQueueNode = (): NodeModel => ({
  id: 'n_kafka',
  presetId: 'queue',
  kind: 'queue',
  name: 'Kafka',
  tags: [],
  tech: { id: 'kafka', label: 'Kafka', iconKey: 'kafka' },
  bounds: { x: 940, y: 100, w: 520, h: 80 },
  ports: [
    { id: 'north', x: 0.5, y: 0 },
    { id: 'east', x: 1, y: 0.5 },
  ],
  children: [],
})

const renderNode = (node = makeQueueNode()): void => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot?.render(
      <svg>
        <DiagramNode
          node={node}
          viewKind="container"
          presentationMode={false}
          activeTool="select"
          isConnectorMode={false}
          pendingConnectionFrom={null}
          hoveredConnectionTarget={null}
          hoveredPortKey="n_kafka:east"
          isSelected
          isPlayerHighlighted={false}
          isDimmedByJourney={false}
          nodeDepthEffectsEnabled
          onNodePointerDown={() => undefined}
          onNodePointerMove={() => undefined}
          onNodePointerUp={() => undefined}
          onNodePointerLeave={() => undefined}
          onCreateDrilldown={() => undefined}
          onOpenDrilldown={() => undefined}
          onNodeBorderPointerDown={() => undefined}
          onNodeBorderPointerMove={() => undefined}
          onNodeBorderPointerLeave={() => undefined}
          onStartInlineEdit={() => undefined}
          onPortPointerEnter={() => undefined}
          onPortPointerLeave={() => undefined}
          onPortPointerDown={() => undefined}
        />
      </svg>,
    )
  })
}

describe('DiagramNode', () => {
  it('renders a wide queue node with fixed-height-derived cylinder face', () => {
    renderNode()

    const group = activeContainer?.querySelector<SVGGElement>('.node-group')
    const detailPath = activeContainer?.querySelector<SVGPathElement>('.node-shape-detail')

    expect(group?.getAttribute('transform')).toBe('translate(940, 100)')
    expect(activeContainer?.textContent).toContain('Kafka')
    expect(detailPath?.getAttribute('d')).toContain('A 28.799999999999997 40')
  })

  it('renders selection, depth, and port affordance classes from explicit props', () => {
    renderNode()

    expect(activeContainer?.querySelector('.node-selected')).not.toBeNull()
    expect(activeContainer?.querySelector('.node-depth-fill')).not.toBeNull()
    expect(activeContainer?.querySelector('.node-port-hover')).not.toBeNull()
    expect(activeContainer?.querySelector('.node-port-affordance')).not.toBeNull()
  })

  it('calls drilldown actions from node-local double-click gestures', () => {
    const node = { ...makeQueueNode(), drilldownRef: 'v_kafka' }
    const onOpenDrilldown = vi.fn()
    activeContainer = document.createElement('div')
    document.body.append(activeContainer)
    activeRoot = createRoot(activeContainer)

    act(() => {
      activeRoot?.render(
        <svg>
          <DiagramNode
            node={node}
            viewKind="container"
            presentationMode={false}
            activeTool="select"
            isConnectorMode={false}
            pendingConnectionFrom={null}
            hoveredConnectionTarget={null}
            hoveredPortKey={null}
            isSelected={false}
            isPlayerHighlighted={false}
            isDimmedByJourney={false}
            nodeDepthEffectsEnabled={false}
            onNodePointerDown={() => undefined}
            onNodePointerMove={() => undefined}
            onNodePointerUp={() => undefined}
            onNodePointerLeave={() => undefined}
            onCreateDrilldown={() => undefined}
            onOpenDrilldown={onOpenDrilldown}
            onNodeBorderPointerDown={() => undefined}
            onNodeBorderPointerMove={() => undefined}
            onNodeBorderPointerLeave={() => undefined}
            onStartInlineEdit={() => undefined}
            onPortPointerEnter={() => undefined}
            onPortPointerLeave={() => undefined}
            onPortPointerDown={() => undefined}
          />
        </svg>,
      )
    })

    const group = activeContainer.querySelector<SVGGElement>('.node-group')
    act(() => {
      group?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })

    expect(onOpenDrilldown).toHaveBeenCalledWith('n_kafka')
  })
})
