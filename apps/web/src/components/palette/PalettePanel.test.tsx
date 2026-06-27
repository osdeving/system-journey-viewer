/**
 * Purpose: Verify the reusable PalettePanel renders preset categories and emits drag data.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NODE_PRESET_DRAG_MIME_TYPE } from '../../presets/presetDragData'
import { TECH_ICON_DRAG_MIME_TYPE } from '../../icons/techIconCatalog'
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
          {
            id: 'app',
            title: 'Application',
            presets: [
              { id: 'service', label: 'Service', iconKey: 'service' },
              {
                id: 'spring-boot',
                label: 'Spring Boot',
                iconKey: 'brand svg',
                dragMimeType: TECH_ICON_DRAG_MIME_TYPE,
                searchText: 'jvm java',
              },
            ],
          },
        ]}
        renderPresetIcon={(preset) => preset.iconKey}
      />,
    )
  })
}

const typeIntoInput = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('PalettePanel', () => {
  it('renders categories and preset labels from props', () => {
    renderPalette()

    expect(activeContainer?.textContent).toContain('Palette')
    expect(activeContainer?.textContent).toContain('Infra')
    expect(activeContainer?.textContent).toContain('Application')
    expect(activeContainer?.textContent).toContain('Kafka')
    expect(activeContainer?.textContent).toContain('kafka')
  })

  it('uses explicit palette text classes instead of browser heading defaults', () => {
    renderPalette()

    expect(activeContainer?.querySelector('h2')).toBeNull()
    expect(activeContainer?.querySelector('h3')).toBeNull()
    expect(activeContainer?.querySelector('.palette-browser-title')?.textContent).toBe('Palette')
    expect(activeContainer?.querySelector('.palette-section-title')?.textContent).toBe('Infra')
  })

  it('uses arrow overflow controls for category navigation', () => {
    renderPalette()

    expect(activeContainer?.querySelector('.palette-category-overflow')).not.toBeNull()
    expect(activeContainer?.querySelector('.palette-category-viewport')).not.toBeNull()
    expect(activeContainer?.querySelector('[role="tablist"]')?.className).toContain('palette-category-strip')
    expect(activeContainer?.querySelectorAll('.overflow-strip-nav')).toHaveLength(2)
  })

  it('filters presets by search text and active category', () => {
    renderPalette()

    const appCategory = [...(activeContainer?.querySelectorAll<HTMLButtonElement>('.palette-category-chip') ?? [])]
      .find((button) => button.textContent?.includes('Application'))
    act(() => {
      appCategory?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(activeContainer?.textContent).toContain('Service')
    expect(activeContainer?.textContent).not.toContain('Kafka')

    const search = activeContainer?.querySelector<HTMLInputElement>('.palette-search input')
    act(() => {
      if (search) {
        typeIntoInput(search, 'missing')
      }
    })

    expect(activeContainer?.textContent).toContain('No components match this palette filter.')
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

  it('supports per-preset drag mime types and alias search text', () => {
    renderPalette()

    const search = activeContainer?.querySelector<HTMLInputElement>('.palette-search input')
    act(() => {
      if (search) {
        typeIntoInput(search, 'jvm')
      }
    })

    const item = [...(activeContainer?.querySelectorAll<HTMLLIElement>('.toolbox-list li') ?? [])]
      .find((candidate) => candidate.textContent?.includes('Spring Boot'))
    const setData = vi.fn()
    const dragStart = new Event('dragstart', { bubbles: true })
    Object.defineProperty(dragStart, 'dataTransfer', {
      value: { setData },
    })

    act(() => {
      item?.dispatchEvent(dragStart)
    })

    expect(item?.textContent).toContain('Spring Boot')
    expect(setData).toHaveBeenCalledWith(TECH_ICON_DRAG_MIME_TYPE, 'spring-boot')
  })
})
