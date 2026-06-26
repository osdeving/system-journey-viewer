/**
 * Purpose: Render the searchable command palette overlay used by the desktop shell.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { CornerDownLeft, Search, X } from 'lucide-react'
import {
  filterCommandPaletteItems,
  type CommandPaletteItem,
  type RankedCommandPaletteItem,
} from '../../commandPalette/commandPalette'

type CommandPaletteProps = {
  open: boolean
  items: CommandPaletteItem[]
  query: string
  onQueryChange: (query: string) => void
  onRun: (itemId: string) => void
  onClose: () => void
}

export function CommandPalette({
  open,
  items,
  query,
  onQueryChange,
  onRun,
  onClose,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const rankedItems = useMemo(() => filterCommandPaletteItems(items, query, 32), [items, query])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!open) {
      return
    }
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [open])

  if (!open) {
    return null
  }

  const activeSafeIndex = rankedItems.length ? Math.min(activeIndex, rankedItems.length - 1) : 0
  const runItem = (item: RankedCommandPaletteItem | undefined) => {
    if (!item || item.disabled) {
      return
    }
    onRun(item.id)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (rankedItems.length) {
        setActiveIndex((current) => Math.min(rankedItems.length - 1, current + 1))
      }
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(0, current - 1))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      runItem(rankedItems[activeSafeIndex])
    }
  }

  let lastSection: string | null = null

  return (
    <div
      className="command-palette-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <div className="command-palette-search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setActiveIndex(0)
              onQueryChange(event.target.value)
            }}
            placeholder="Search commands, views, journeys, nodes, and edges"
            aria-label="Search command palette"
          />
          <button type="button" onClick={onClose} aria-label="Close command palette">
            <X size={16} />
          </button>
        </div>
        <div className="command-palette-list" role="listbox" aria-label="Command palette results">
          {rankedItems.length ? (
            rankedItems.map((item, index) => {
              const showSection = item.section !== lastSection
              lastSection = item.section
              return (
                <div key={item.id} className="command-palette-row-shell">
                  {showSection ? <div className="command-palette-section">{item.section}</div> : null}
                  <button
                    type="button"
                    className={[
                      'command-palette-row',
                      index === activeSafeIndex ? 'command-palette-row-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="option"
                    aria-selected={index === activeSafeIndex}
                    disabled={item.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runItem(item)}
                  >
                    <span className="command-palette-copy">
                      <strong>{item.title}</strong>
                      {item.subtitle ? <span>{item.subtitle}</span> : null}
                    </span>
                    <span className="command-palette-meta">
                      {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                      <CornerDownLeft size={14} aria-hidden="true" />
                    </span>
                  </button>
                </div>
              )
            })
          ) : (
            <p className="command-palette-empty">No matching commands.</p>
          )}
        </div>
      </div>
    </div>
  )
}
