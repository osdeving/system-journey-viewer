/**
 * Purpose: Render a reusable dock palette for dragging node presets into a canvas.
 */

import type { DragEvent, ReactNode } from 'react'
import { NODE_PRESET_DRAG_MIME_TYPE } from '../../presets/presetDragData'
import { PanelGroup } from '../chrome/PanelGroup'

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
  description = 'Drag to canvas:',
  dragMimeType = NODE_PRESET_DRAG_MIME_TYPE,
  renderPresetIcon,
  onPresetDragStart,
}: PalettePanelProps) => (
  <div className="dock-content-section">
    <h2>{title}</h2>
    <p>{description}</p>
    {categories.map((category, index) => (
      <PanelGroup
        key={category.id}
        title={category.title}
        defaultExpanded={index === 0}
        className="toolbox-group"
      >
        <ul className="toolbox-list">
          {category.presets.map((preset) => (
            <li
              key={preset.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(dragMimeType, preset.id)
                onPresetDragStart?.(preset, event)
              }}
            >
              <span className="toolbox-item-icon" aria-hidden="true">
                {renderPresetIcon?.(preset)}
              </span>
              <span className="toolbox-item-label">{preset.label}</span>
            </li>
          ))}
        </ul>
      </PanelGroup>
    ))}
  </div>
)
