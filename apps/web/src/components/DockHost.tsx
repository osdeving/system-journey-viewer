import type { ReactNode } from 'react'

export type DockHostTab<TTabId extends string = string> = {
  id: TTabId
  label: string
  icon?: ReactNode
}

type DockHostProps<TTabId extends string = string> = {
  tabs: Array<DockHostTab<TTabId>>
  activeTabId: TTabId | null
  onTabSelect: (tabId: TTabId) => void
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
  renderTabPanel,
  headerActions,
  className,
  bodyClassName,
  emptyState,
}: DockHostProps<TTabId>) {
  const resolvedActiveTabId =
    activeTabId && tabs.some((tab) => tab.id === activeTabId) ? activeTabId : tabs[0]?.id ?? null

  return (
    <section className={className ? `dock-host ${className}` : 'dock-host'}>
      <div className="dock-host-strip">
        <div className="dock-host-tabs" role="tablist" aria-label="Docked windows">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={resolvedActiveTabId === tab.id}
              className={resolvedActiveTabId === tab.id ? 'dock-tab dock-host-tab dock-tab-active' : 'dock-tab dock-host-tab'}
              onClick={() => onTabSelect(tab.id)}
              title={tab.label}
            >
              {tab.icon ? (
                <span className="dock-tab-icon" aria-hidden="true">
                  {tab.icon}
                </span>
              ) : null}
              <span className="dock-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
        {headerActions ? <span className="dock-host-actions">{headerActions}</span> : null}
      </div>
      <div className={bodyClassName ? `dock-host-body ${bodyClassName}` : 'dock-host-body'}>
        {resolvedActiveTabId ? renderTabPanel(resolvedActiveTabId) : emptyState ?? null}
      </div>
    </section>
  )
}
