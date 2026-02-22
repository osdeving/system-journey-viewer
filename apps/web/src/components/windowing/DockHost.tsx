/**
 * Purpose: Provide reusable React window shells and dock host components for floating and docked panels.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

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
  const tabsViewportRef = useRef<HTMLDivElement | null>(null)
  const [tabScrollState, setTabScrollState] = useState({ canScrollLeft: false, canScrollRight: false })
  const resolvedActiveTabId =
    activeTabId && tabs.some((tab) => tab.id === activeTabId) ? activeTabId : tabs[0]?.id ?? null

  const refreshTabScrollState = useCallback(() => {
    const viewport = tabsViewportRef.current
    if (!viewport) {
      setTabScrollState((current) =>
        current.canScrollLeft || current.canScrollRight ? { canScrollLeft: false, canScrollRight: false } : current,
      )
      return
    }
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    const next = {
      canScrollLeft: viewport.scrollLeft > 1,
      canScrollRight: viewport.scrollLeft < maxScrollLeft - 1,
    }
    setTabScrollState((current) =>
      current.canScrollLeft === next.canScrollLeft && current.canScrollRight === next.canScrollRight ? current : next,
    )
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const raf = window.requestAnimationFrame(() => {
      refreshTabScrollState()
    })
    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [refreshTabScrollState, tabs, resolvedActiveTabId])

  useEffect(() => {
    const viewport = tabsViewportRef.current
    if (!viewport) {
      return
    }
    const onScroll = () => refreshTabScrollState()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => refreshTabScrollState())
      resizeObserver.observe(viewport)
      if (viewport.firstElementChild instanceof HTMLElement) {
        resizeObserver.observe(viewport.firstElementChild)
      }
    }
    window.addEventListener('resize', refreshTabScrollState)
    return () => {
      viewport.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', refreshTabScrollState)
    }
  }, [refreshTabScrollState])

  const scrollTabs = (direction: -1 | 1) => {
    const viewport = tabsViewportRef.current
    if (!viewport) {
      return
    }
    viewport.scrollBy({
      left: direction * Math.max(120, Math.round(viewport.clientWidth * 0.45)),
      behavior: 'smooth',
    })
  }
  const tabsOverflowing = tabScrollState.canScrollLeft || tabScrollState.canScrollRight

  return (
    <section className={className ? `dock-host ${className}` : 'dock-host'}>
      <div className="dock-host-strip">
        {headerActions ? <div className="dock-host-actions-row"><span className="dock-host-actions">{headerActions}</span></div> : null}
        <div className="dock-host-tabs-row">
          <button
            type="button"
            className={tabsOverflowing ? 'dock-host-tabs-nav' : 'dock-host-tabs-nav dock-host-tabs-nav-hidden'}
            onClick={() => scrollTabs(-1)}
            disabled={!tabScrollState.canScrollLeft}
            aria-label="Scroll dock tabs left"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="dock-host-tabs-viewport" ref={tabsViewportRef}>
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
          </div>
          <button
            type="button"
            className={tabsOverflowing ? 'dock-host-tabs-nav' : 'dock-host-tabs-nav dock-host-tabs-nav-hidden'}
            onClick={() => scrollTabs(1)}
            disabled={!tabScrollState.canScrollRight}
            aria-label="Scroll dock tabs right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className={bodyClassName ? `dock-host-body ${bodyClassName}` : 'dock-host-body'}>
        {resolvedActiveTabId ? renderTabPanel(resolvedActiveTabId) : emptyState ?? null}
      </div>
    </section>
  )
}
