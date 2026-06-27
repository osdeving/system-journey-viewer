/**
 * Purpose: Provide reusable React window shells and dock host components for floating and docked panels.
 */

import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
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
  onHeaderTearOff?: () => void
  className?: string
  bodyClassName?: string
  emptyState?: ReactNode
}

const DOCK_HOST_TEAR_OFF_DISTANCE_PX = 8

const isInteractiveHeaderTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(target.closest('button, a, input, select, textarea, [role="tab"], [data-dock-host-action]'))

export function DockHost<TTabId extends string = string>({
  tabs,
  activeTabId,
  onTabSelect,
  onTabReorder,
  renderTabPanel,
  headerActions,
  onHeaderTearOff,
  className,
  bodyClassName,
  emptyState,
}: DockHostProps<TTabId>) {
  const dragTabIdRef = useRef<TTabId | null>(null)
  const headerTearOffRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    triggered: boolean
  } | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [verticalOverflow, setVerticalOverflow] = useState({
    canScrollDown: false,
    canScrollUp: false,
  })
  const resolvedActiveTabId =
    activeTabId && tabs.some((tab) => tab.id === activeTabId) ? activeTabId : tabs[0]?.id ?? null
  const hasVerticalOverflow = verticalOverflow.canScrollUp || verticalOverflow.canScrollDown

  const refreshVerticalOverflow = useCallback(() => {
    const body = bodyRef.current
    if (!body) {
      setVerticalOverflow((current) =>
        current.canScrollDown || current.canScrollUp
          ? { canScrollDown: false, canScrollUp: false }
          : current,
      )
      return
    }
    const maxScrollTop = Math.max(0, body.scrollHeight - body.clientHeight)
    const next = {
      canScrollUp: body.scrollTop > 1,
      canScrollDown: body.scrollTop < maxScrollTop - 1,
    }
    setVerticalOverflow((current) =>
      current.canScrollDown === next.canScrollDown && current.canScrollUp === next.canScrollUp
        ? current
        : next,
    )
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const raf = window.requestAnimationFrame(refreshVerticalOverflow)
    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [refreshVerticalOverflow, resolvedActiveTabId, tabs.length])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) {
      return
    }
    const onScroll = () => refreshVerticalOverflow()
    body.addEventListener('scroll', onScroll, { passive: true })
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        refreshVerticalOverflow()
      })
      resizeObserver.observe(body)
      if (body.firstElementChild instanceof HTMLElement) {
        resizeObserver.observe(body.firstElementChild)
      }
    }
    window.addEventListener('resize', refreshVerticalOverflow)
    return () => {
      body.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', refreshVerticalOverflow)
    }
  }, [refreshVerticalOverflow])

  const scrollBody = (direction: -1 | 1) => {
    const body = bodyRef.current
    if (!body) {
      return
    }
    body.scrollBy({
      top: direction * Math.max(120, Math.round(body.clientHeight * 0.42)),
      behavior: 'smooth',
    })
  }

  const onHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onHeaderTearOff || event.button !== 0 || isInteractiveHeaderTarget(event.target)) {
      return
    }
    headerTearOffRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      triggered: false,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onHeaderPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const interaction = headerTearOffRef.current
    if (!interaction || !onHeaderTearOff || interaction.pointerId !== event.pointerId || interaction.triggered) {
      return
    }
    const distance = Math.hypot(event.clientX - interaction.startX, event.clientY - interaction.startY)
    if (distance < DOCK_HOST_TEAR_OFF_DISTANCE_PX) {
      return
    }
    interaction.triggered = true
    headerTearOffRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    onHeaderTearOff()
  }

  const stopHeaderTearOff = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (headerTearOffRef.current?.pointerId === event.pointerId) {
      headerTearOffRef.current = null
    }
  }

  return (
    <section className={className ? `dock-host ${className}` : 'dock-host'}>
      <div
        className={onHeaderTearOff ? 'dock-host-header dock-host-header-draggable' : 'dock-host-header'}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={stopHeaderTearOff}
        onPointerCancel={stopHeaderTearOff}
        title={onHeaderTearOff ? 'Drag the titlebar to float this window' : undefined}
      >
        <OverflowStrip
          className="dock-host-tabs-row"
          viewportClassName="dock-host-tabs-viewport"
          contentClassName="dock-host-tabs"
          contentProps={{ role: 'tablist', 'aria-label': 'Docked windows' }}
          navAriaLabel="dock tabs"
          collapseNavWhenHidden
          disableNavigation={tabs.length <= 1}
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
        {headerActions ? (
          <div className="dock-host-actions-row">
            <span className="dock-host-actions">{headerActions}</span>
          </div>
        ) : null}
      </div>
      <div
        ref={bodyRef}
        className={bodyClassName ? `dock-host-body ${bodyClassName}` : 'dock-host-body'}
        onScroll={refreshVerticalOverflow}
      >
        {resolvedActiveTabId ? renderTabPanel(resolvedActiveTabId) : emptyState ?? null}
      </div>
      <div
        className={
          hasVerticalOverflow
            ? 'dock-host-scroll-controls'
            : 'dock-host-scroll-controls dock-host-scroll-controls-hidden'
        }
        aria-hidden={!hasVerticalOverflow}
      >
        <button
          type="button"
          onClick={() => scrollBody(-1)}
          disabled={!verticalOverflow.canScrollUp}
          aria-label="Scroll dock panel up"
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          onClick={() => scrollBody(1)}
          disabled={!verticalOverflow.canScrollDown}
          aria-label="Scroll dock panel down"
        >
          <ChevronDown size={12} />
        </button>
      </div>
    </section>
  )
}
