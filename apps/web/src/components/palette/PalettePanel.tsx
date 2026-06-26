/**
 * Purpose: Render a reusable dock palette for dragging node presets into a canvas.
 */

import { useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { NODE_PRESET_DRAG_MIME_TYPE } from '../../presets/presetDragData'
import { Text } from '../text/Text'

export interface PalettePanelPreset {
  id: string
  label: string
  iconKey: string
}

export interface PalettePanelCategory {
  id: string
  title: string
  presets: PalettePanelPreset[]
}

export interface PalettePanelProps {
  categories: PalettePanelCategory[]
  title?: string
  description?: string
  dragMimeType?: string
  renderPresetIcon?: (preset: PalettePanelPreset) => ReactNode
  onPresetDragStart?: (
    preset: PalettePanelPreset,
    event: DragEvent<HTMLLIElement>,
  ) => void
}

export const PalettePanel = ({
  categories,
  title = 'Palette',
  description = 'Drag components into the canvas.',
  dragMimeType = NODE_PRESET_DRAG_MIME_TYPE,
  renderPresetIcon,
  onPresetDragStart,
}: PalettePanelProps) => {
  const [query, setQuery] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const normalizedQuery = query.trim().toLowerCase()
  const totalPresetCount = categories.reduce((count, category) => count + category.presets.length, 0)
  const visibleCategories = useMemo(
    () =>
      categories
        .filter((category) => activeCategoryId === 'all' || category.id === activeCategoryId)
        .map((category) => ({
          ...category,
          presets: normalizedQuery
            ? category.presets.filter((preset) =>
                `${preset.label} ${preset.id} ${preset.iconKey}`.toLowerCase().includes(normalizedQuery),
              )
            : category.presets,
        }))
        .filter((category) => category.presets.length > 0),
    [activeCategoryId, categories, normalizedQuery],
  )
  const visiblePresetCount = visibleCategories.reduce((count, category) => count + category.presets.length, 0)

  return (
    <div className="palette-browser">
      <div className="palette-browser-header">
        <div className="palette-browser-heading">
          <Text as="h2" size="md" weight="bold">{title}</Text>
          <Text as="p" tone="muted" size="xs">{description}</Text>
        </div>
        <Text.Label className="palette-browser-count">
          {visiblePresetCount}/{totalPresetCount}
        </Text.Label>
      </div>
      <label className="palette-search">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="Search components"
          aria-label="Search palette components"
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      <div className="palette-category-strip" role="tablist" aria-label="Palette categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryId === 'all'}
          className={activeCategoryId === 'all' ? 'palette-category-chip palette-category-chip-active' : 'palette-category-chip'}
          onClick={() => setActiveCategoryId('all')}
        >
          All
          <span>{totalPresetCount}</span>
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={activeCategoryId === category.id}
            className={
              activeCategoryId === category.id
                ? 'palette-category-chip palette-category-chip-active'
                : 'palette-category-chip'
            }
            onClick={() => setActiveCategoryId(category.id)}
          >
            {category.title}
            <span>{category.presets.length}</span>
          </button>
        ))}
      </div>
      <div className="palette-sections">
        {visibleCategories.map((category) => (
          <section key={category.id} className="palette-section">
            <header className="palette-section-header">
              <Text as="h3" size="xs" weight="bold">{category.title}</Text>
              <Text.Meta>{category.presets.length} items</Text.Meta>
            </header>
            <ul className="toolbox-list palette-preset-grid">
              {category.presets.map((preset) => (
                <li
                  key={preset.id}
                  className="palette-preset-card"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(dragMimeType, preset.id)
                    onPresetDragStart?.(preset, event)
                  }}
                >
                  <span className="toolbox-item-icon palette-preset-icon" aria-hidden="true">
                    {renderPresetIcon?.(preset)}
                  </span>
                  <span className="palette-preset-copy">
                    <Text weight="semibold" truncate className="toolbox-item-label">{preset.label}</Text>
                    <Text.Meta truncate>{preset.iconKey}</Text.Meta>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!visibleCategories.length ? (
          <Text as="p" tone="muted" size="xs" className="palette-empty">
            No components match this palette filter.
          </Text>
        ) : null}
      </div>
    </div>
  )
}
