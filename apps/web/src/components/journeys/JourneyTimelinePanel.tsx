/**
 * Purpose: Render the active journey timeline as a reusable drag-aware panel.
 */

import { Fragment } from 'react'
import { GripVertical, Workflow } from 'lucide-react'
import type { EdgeModel, JourneyModel } from '../../model/types'
import type { JourneyTimelineRow } from '../../journeys/timelineRows'

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
}: JourneyTimelinePanelProps) => (
  <>
    <div className="journey-timeline-toolbar">
      <strong>Active journey timeline</strong>
      <span className="player-step-info">
        Step {playerStepIndex + 1}/{playerJourneyPlaybackLength}
      </span>
    </div>
    {activeJourney ? (
      <ol className="journey-steps">
        {rows.map((row) => {
          const isCurrentTick =
            activeJourney.id === playerJourneyId && row.tickIndex === playerStepIndex
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
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable={row.laneKind === 'main'}
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
                  {row.laneKind === 'main' ? (
                    <button
                      type="button"
                      onClick={() => onRemoveStep(activeJourney.id, row.edgeId)}
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="journey-step-thread-note">Script-managed</span>
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
  </>
)
