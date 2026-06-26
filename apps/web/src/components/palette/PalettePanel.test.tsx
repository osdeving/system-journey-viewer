/**
 * Purpose: Verify the reusable PalettePanel renders preset categories and emits drag data.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NODE_PRESET_DRAG_MIME_TYPE } from '../../presets/presetDragData'
import { PalettePanel } from './PalettePanel'

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

const renderPalette = (): void => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)

  act(() => {
    activeRoot?.render(
      <PalettePanel
        categories={[
          {
            id: 'infra',
            title: 'Infra',
            presets: [
              { id: 'queue', label: 'Kafka', iconKey: 'kafka' },
              { id: 'database', label: 'Database', iconKey: 'database' },
            ],
          },
        ]}
        renderPresetIcon={(preset) => preset.iconKey}
      />,
    )
  })
}

describe('PalettePanel', () => {
  it('renders categories and preset labels from props', () => {
    renderPalette()

    expect(activeContainer?.textContent).toContain('Palette')
    expect(activeContainer?.textContent).toContain('Infra')
    expect(activeContainer?.textContent).toContain('Kafka')
    expect(activeContainer?.textContent).toContain('kafka')
  })

  it('writes the preset id to browser drag data', () => {
    renderPalette()

    const item = activeContainer?.querySelector<HTMLLIElement>('.toolbox-list li')
    const setData = vi.fn()
    const dragStart = new Event('dragstart', { bubbles: true })
    Object.defineProperty(dragStart, 'dataTransfer', {
      value: { setData },
    })

    act(() => {
      item?.dispatchEvent(dragStart)
    })

    expect(setData).toHaveBeenCalledWith(NODE_PRESET_DRAG_MIME_TYPE, 'queue')
  })
})
