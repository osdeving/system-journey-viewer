/**
 * Purpose: Render the active journey timeline as a reusable drag-aware panel.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { GripVertical, IndentDecrease, IndentIncrease, MoreHorizontal, Workflow } from 'lucide-react'
import type { EdgeModel, JourneyModel } from '../../model/types'
import type { JourneyTimelineRow } from '../../journeys/timelineRows'
import {
  resolveDefaultJourneyThreadIndentTarget,
  resolveJourneyThreadIndentTargets,
} from '../../journeys/threadEditing'
import { resolveViewportClampedFloatingMenuPoint } from '../../layout/floatingMenu'

export interface JourneyTimelinePanelProps {
  activeJourney?: JourneyModel
  rows: JourneyTimelineRow[]
  edgesById: Record<string, EdgeModel>
  playerJourneyId: string | null
  playerStepIndex: number
  playerJourneyPlaybackLength: number
  onStepDragStart: (journeyId: string, edgeId: string) => void
  onStepDrop: (journeyId: string, targetEdgeId: string) => void
  onStepDragEnd: () => void
  onRemoveStep: (journeyId: string, edgeId: string) => void
  onIndentStep: (journeyId: string, edgeId: string, anchorEdgeId?: string) => void
  onOutdentStep: (journeyId: string, threadId: string, edgeId: string) => void
}

type TimelineStepContextMenu = {
  anchorX: number
  anchorY: number
  x: number
  y: number
  rowKey: string
  estimatedWidth: number
  estimatedHeight: number
}

const TIMELINE_CONTEXT_MENU_WIDTH = 220
const TIMELINE_CONTEXT_MENU_MARGIN = 8
const TIMELINE_CONTEXT_MENU_HEADER_HEIGHT = 28
const TIMELINE_CONTEXT_MENU_ROW_HEIGHT = 31
const TIMELINE_CONTEXT_MENU_SHELL_HEIGHT = 14
const TIMELINE_CONTEXT_MENU_GAP = 4

const estimateTimelineContextMenuHeight = (
  row: JourneyTimelineRow,
  indentTargetCount: number,
): number => {
  const actionCount = row.laneKind === 'main' ? Math.max(indentTargetCount, 1) + 1 : 2

  return (
    TIMELINE_CONTEXT_MENU_SHELL_HEIGHT +
    TIMELINE_CONTEXT_MENU_HEADER_HEIGHT +
    actionCount * TIMELINE_CONTEXT_MENU_ROW_HEIGHT +
    Math.max(0, actionCount - 1) * TIMELINE_CONTEXT_MENU_GAP
  )
}

export const JourneyTimelinePanel = ({
  activeJourney,
  rows,
  edgesById,
  playerJourneyId,
  playerStepIndex,
  playerJourneyPlaybackLength,
  onStepDragStart,
  onStepDrop,
  onStepDragEnd,
  onRemoveStep,
  onIndentStep,
  onOutdentStep,
}: JourneyTimelinePanelProps) => {
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<TimelineStepContextMenu | null>(null)
  const rowsByKey = useMemo(() => new Map(rows.map((row) => [row.key, row])), [rows])
  const effectiveSelectedRowKey = selectedRowKey && rowsByKey.has(selectedRowKey) ? selectedRowKey : null
  const contextRow = contextMenu ? rowsByKey.get(contextMenu.rowKey) : undefined

  useEffect(() => {
    if (!contextMenu) {
      return
    }
    const close = () => setContextMenu(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [contextMenu])

  const openContextMenuForRow = (
    row: JourneyTimelineRow,
    event: Pick<ReactMouseEvent, 'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation'>,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedRowKey(row.key)

    const indentTargetCount =
      activeJourney && row.laneKind === 'main'
        ? resolveJourneyThreadIndentTargets(activeJourney, row.edgeId).length
        : 0
    const estimatedWidth = TIMELINE_CONTEXT_MENU_WIDTH
    const estimatedHeight = estimateTimelineContextMenuHeight(row, indentTargetCount)
    const point = resolveViewportClampedFloatingMenuPoint({
      anchor: { x: event.clientX, y: event.clientY },
      menu: { width: estimatedWidth, height: estimatedHeight },
      viewport: {
        width:
          typeof window === 'undefined'
            ? estimatedWidth + TIMELINE_CONTEXT_MENU_MARGIN * 2
            : window.innerWidth,
        height:
          typeof window === 'undefined'
            ? estimatedHeight + TIMELINE_CONTEXT_MENU_MARGIN * 2
            : window.innerHeight,
      },
      margin: TIMELINE_CONTEXT_MENU_MARGIN,
    })

    setContextMenu({
      anchorX: event.clientX,
      anchorY: event.clientY,
      x: point.x,
      y: point.y,
      rowKey: row.key,
      estimatedWidth,
      estimatedHeight,
    })
  }

  const positionContextMenu = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !contextMenu) {
        return
      }

      const rect = element.getBoundingClientRect()
      const width = rect.width || contextMenu.estimatedWidth
      const height = rect.height || contextMenu.estimatedHeight
      const point = resolveViewportClampedFloatingMenuPoint({
        anchor: { x: contextMenu.anchorX, y: contextMenu.anchorY },
        menu: { width, height },
        viewport: {
          width:
            typeof window === 'undefined'
              ? width + TIMELINE_CONTEXT_MENU_MARGIN * 2
              : window.innerWidth,
          height:
            typeof window === 'undefined'
              ? height + TIMELINE_CONTEXT_MENU_MARGIN * 2
              : window.innerHeight,
        },
        margin: TIMELINE_CONTEXT_MENU_MARGIN,
      })

      element.style.left = `${point.x}px`
      element.style.top = `${point.y}px`
    },
    [contextMenu],
  )

  const runIndentStep = (row: JourneyTimelineRow, anchorEdgeId?: string) => {
    if (!activeJourney || row.laneKind !== 'main') {
      return
    }
    onIndentStep(activeJourney.id, row.edgeId, anchorEdgeId)
    setContextMenu(null)
  }

  const runOutdentStep = (row: JourneyTimelineRow) => {
    if (!activeJourney || row.laneKind !== 'thread' || !row.threadId) {
      return
    }
    onOutdentStep(activeJourney.id, row.threadId, row.edgeId)
    setContextMenu(null)
  }

  const onRowKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>, row: JourneyTimelineRow) => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    if (event.shiftKey) {
      if (row.laneKind === 'thread') {
        event.preventDefault()
        runOutdentStep(row)
      }
      return
    }

    if (row.laneKind !== 'main') {
      return
    }
    const target = resolveDefaultJourneyThreadIndentTarget(activeJourney, row.edgeId)
    if (!target) {
      return
    }
    event.preventDefault()
    runIndentStep(row, target.anchorEdgeId)
  }

  const renderContextMenu = () => {
    if (!activeJourney || !contextMenu || !contextRow) {
      return null
    }
    const label = edgesById[contextRow.edgeId]?.label ?? contextRow.edgeId
    const indentTargets =
      contextRow.laneKind === 'main'
        ? resolveJourneyThreadIndentTargets(activeJourney, contextRow.edgeId)
        : []

    return (
      <div
        ref={positionContextMenu}
        className="journey-step-context-menu"
        role="menu"
        aria-label="Timeline step actions"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="journey-step-context-label">{label}</span>
        {contextRow.laneKind === 'main' ? (
          <>
            {indentTargets.length ? (
              indentTargets.map((target) => (
                <button
                  key={`${target.direction}:${target.anchorEdgeId}`}
                  type="button"
                  role="menuitem"
                  onClick={() => runIndentStep(contextRow, target.anchorEdgeId)}
                >
                  <IndentIncrease size={13} />
                  <span>Indent after step {target.anchorStepNumber}</span>
                </button>
              ))
            ) : (
              <span className="journey-step-context-empty">No valid thread anchor</span>
            )}
          </>
        ) : (
          <button type="button" role="menuitem" onClick={() => runOutdentStep(contextRow)}>
            <IndentDecrease size={13} />
            <span>Outdent to main lane</span>
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRemoveStep(activeJourney.id, contextRow.edgeId)
            setContextMenu(null)
          }}
        >
          <Workflow size={13} />
          <span>Remove from journey</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="journey-timeline-toolbar">
        <strong>Active journey timeline</strong>
        <span className="player-step-info">
          Step {playerStepIndex + 1}/{playerJourneyPlaybackLength}
        </span>
      </div>
      {activeJourney ? (
        <ol className="journey-steps" aria-label={`${activeJourney.name} timeline steps`}>
          {rows.map((row) => {
            const isCurrentTick =
              activeJourney.id === playerJourneyId && row.tickIndex === playerStepIndex
            const isSelected = row.key === effectiveSelectedRowKey
            const canIndent = row.laneKind === 'main' && resolveJourneyThreadIndentTargets(activeJourney, row.edgeId).length > 0
            return (
              <Fragment key={`${activeJourney.id}:${row.key}`}>
                {row.showTickBadge ? (
                  <li
                    className={[
                      'journey-tick-group-header',
                      row.tickStepCount > 1 ? 'journey-tick-group-header-parallel' : '',
                      isCurrentTick ? 'journey-tick-group-header-current' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="journey-tick-group-title">Tick {row.tickIndex + 1}</span>
                    {row.tickStepCount > 1 ? (
                      <span className="journey-thread-pill journey-thread-pill-parallel">
                        Parallel x{row.tickStepCount}
                      </span>
                    ) : null}
                    {isCurrentTick ? (
                      <span className="journey-thread-pill journey-tick-current-pill">
                        Current
                      </span>
                    ) : null}
                  </li>
                ) : null}
                <li
                  className={[
                    'journey-step-item',
                    'journey-item',
                    row.laneKind === 'thread'
                      ? 'journey-step-item-thread'
                      : 'journey-step-item-main',
                    isCurrentTick ? 'journey-step-item-current-tick' : '',
                    isSelected ? 'journey-step-item-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-selected={isSelected}
                  tabIndex={0}
                  draggable={row.laneKind === 'main'}
                  onClick={() => setSelectedRowKey(row.key)}
                  onFocus={() => setSelectedRowKey(row.key)}
                  onKeyDown={(event) => onRowKeyDown(event, row)}
                  onContextMenu={(event) => openContextMenuForRow(row, event)}
                  onDragStart={
                    row.laneKind === 'main'
                      ? () => onStepDragStart(activeJourney.id, row.edgeId)
                      : undefined
                  }
                  onDragOver={
                    row.laneKind === 'main'
                      ? (event) => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }
                      : undefined
                  }
                  onDrop={
                    row.laneKind === 'main'
                      ? () => onStepDrop(activeJourney.id, row.edgeId)
                      : undefined
                  }
                  onDragEnd={row.laneKind === 'main' ? onStepDragEnd : undefined}
                >
                  <span
                    className={[
                      'journey-tick-badge',
                      row.showTickBadge ? '' : 'journey-tick-badge-placeholder',
                      row.tickStepCount > 1 ? 'journey-tick-badge-parallel' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={
                      row.showTickBadge
                        ? `Tick ${row.tickIndex + 1}${
                            row.tickStepCount > 1
                              ? ` (${row.tickStepCount} parallel edges)`
                              : ''
                          }`
                        : undefined
                    }
                    aria-hidden={!row.showTickBadge}
                  >
                    {row.showTickBadge ? row.tickIndex + 1 : ''}
                  </span>
                  <span className="journey-drag-handle" aria-hidden="true">
                    {row.laneKind === 'main' ? (
                      <GripVertical size={13} />
                    ) : (
                      <Workflow size={12} />
                    )}
                  </span>
                  <span className="journey-color-dot" style={{ background: row.accentColor }} />
                  <span className="journey-step-label">
                    {row.laneKind === 'thread' ? (
                      <span
                        className="journey-thread-pill"
                        style={{ borderColor: row.accentColor, color: row.accentColor }}
                      >
                        Thread {row.threadId}
                      </span>
                    ) : null}
                    {row.laneKind === 'thread' && row.tickStepCount > 1 ? (
                      <span className="journey-thread-pill journey-thread-pill-tick">
                        Tick {row.tickIndex + 1}
                      </span>
                    ) : null}
                    <span>
                      {row.laneKind === 'main'
                        ? `${row.laneStepNumber}. `
                        : `${row.threadId}.${row.laneStepNumber} `}
                      {edgesById[row.edgeId]?.label ?? row.edgeId}
                    </span>
                  </span>
                  <span className="journey-step-actions">
                    <button
                      type="button"
                      className="journey-step-icon-action"
                      aria-label={`Open actions for ${edgesById[row.edgeId]?.label ?? row.edgeId}`}
                      onClick={(event) => openContextMenuForRow(row, event)}
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    {row.laneKind === 'main' ? (
                      <>
                        <button
                          type="button"
                          disabled={!canIndent}
                          title="Indent as thread (Tab)"
                          onClick={() => {
                            const target = resolveDefaultJourneyThreadIndentTarget(activeJourney, row.edgeId)
                            if (target) {
                              runIndentStep(row, target.anchorEdgeId)
                            }
                          }}
                        >
                          <IndentIncrease size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveStep(activeJourney.id, row.edgeId)}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        title="Outdent to main lane (Shift+Tab)"
                        onClick={() => runOutdentStep(row)}
                      >
                        <IndentDecrease size={12} />
                      </button>
                    )}
                  </span>
                </li>
              </Fragment>
            )
          })}
        </ol>
      ) : (
        <p>Select a journey on the sidebar to view the timeline.</p>
      )}
      {renderContextMenu()}
    </>
  )
}
