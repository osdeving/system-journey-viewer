/**
 * Purpose: Provide reusable React window shells and dock host components for floating and docked panels.
 */

import { useRef, type ReactNode } from 'react'
import { OverflowStrip } from '../chrome/OverflowStrip'

export type DockHostTab<TTabId extends string = string> = {
  id: TTabId
  label: string
  icon?: ReactNode
}

type DockHostProps<TTabId extends string = string> = {
  tabs: Array<DockHostTab<TTabId>>
  activeTabId: TTabId | null
  onTabSelect: (tabId: TTabId) => void
  onTabReorder?: (sourceTabId: TTabId, targetTabId: TTabId) => void
  renderTabPanel: (tabId: TTabId) => ReactNode
  headerActions?: ReactNode
  className?: string
  bodyClassName?: string
  emptyState?: ReactNode
}

export function DockHost<TTabId extends string = string>({
  tabs,
  activeTabId,
  onTabSelect,
  onTabReorder,
  renderTabPanel,
  headerActions,
  className,
  bodyClassName,
  emptyState,
}: DockHostProps<TTabId>) {
  const dragTabIdRef = useRef<TTabId | null>(null)
  const resolvedActiveTabId =
    activeTabId && tabs.some((tab) => tab.id === activeTabId) ? activeTabId : tabs[0]?.id ?? null

  return (
    <section className={className ? `dock-host ${className}` : 'dock-host'}>
      <div className="dock-host-strip">
        {headerActions ? (
          <div className="dock-host-actions-row">
            <span className="dock-host-actions">{headerActions}</span>
          </div>
        ) : null}
        <OverflowStrip
          className="dock-host-tabs-row"
          viewportClassName="dock-host-tabs-viewport"
          contentClassName="dock-host-tabs"
          contentProps={{ role: 'tablist', 'aria-label': 'Docked windows' }}
          navAriaLabel="dock tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              draggable={tabs.length > 1}
              aria-selected={resolvedActiveTabId === tab.id}
              className={resolvedActiveTabId === tab.id ? 'dock-tab dock-host-tab dock-tab-active' : 'dock-tab dock-host-tab'}
              onClick={() => onTabSelect(tab.id)}
              title={tab.label}
              onDragStart={() => {
                dragTabIdRef.current = tab.id
              }}
              onDragOver={(event) => {
                if (!onTabReorder) {
                  return
                }
                event.preventDefault()
              }}
              onDrop={() => {
                if (!onTabReorder) {
                  return
                }
                const sourceTabId = dragTabIdRef.current
                if (!sourceTabId || sourceTabId === tab.id) {
                  return
                }
                onTabReorder(sourceTabId, tab.id)
              }}
              onDragEnd={() => {
                dragTabIdRef.current = null
              }}
            >
              {tab.icon ? (
                <span className="dock-tab-icon" aria-hidden="true">
                  {tab.icon}
                </span>
              ) : null}
              <span className="dock-tab-label">{tab.label}</span>
            </button>
          ))}
        </OverflowStrip>
      </div>
      <div className={bodyClassName ? `dock-host-body ${bodyClassName}` : 'dock-host-body'}>
        {resolvedActiveTabId ? renderTabPanel(resolvedActiveTabId) : emptyState ?? null}
      </div>
    </section>
  )
}
