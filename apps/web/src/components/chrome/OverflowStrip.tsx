/**
 * Purpose: Provide a reusable horizontal overflow strip with wheel scrolling and optional arrow navigation.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react'

type OverflowStripProps = {
  children: ReactNode
  className?: string
  viewportClassName?: string
  contentClassName?: string
  contentProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>
  navAriaLabel?: string
  hideNavWhenNotOverflowing?: boolean
  collapseNavWhenHidden?: boolean
  disableNavigation?: boolean
  scrollStepPx?: number
}

type OverflowState = {
  canScrollLeft: boolean
  canScrollRight: boolean
}

const DEFAULT_OVERFLOW_STATE: OverflowState = {
  canScrollLeft: false,
  canScrollRight: false,
}

export function OverflowStrip({
  children,
  className,
  viewportClassName,
  contentClassName,
  contentProps,
  navAriaLabel = 'overflow strip',
  hideNavWhenNotOverflowing = true,
  collapseNavWhenHidden = false,
  disableNavigation = false,
  scrollStepPx,
}: OverflowStripProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [overflowState, setOverflowState] = useState<OverflowState>(DEFAULT_OVERFLOW_STATE)

  const refreshOverflowState = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      setOverflowState((current) =>
        current.canScrollLeft || current.canScrollRight ? DEFAULT_OVERFLOW_STATE : current,
      )
      return
    }
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    const next = {
      canScrollLeft: viewport.scrollLeft > 1,
      canScrollRight: viewport.scrollLeft < maxScrollLeft - 1,
    }
    setOverflowState((current) =>
      current.canScrollLeft === next.canScrollLeft && current.canScrollRight === next.canScrollRight
        ? current
        : next,
    )
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const raf = window.requestAnimationFrame(refreshOverflowState)
    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [children, refreshOverflowState])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }
    const onScroll = () => refreshOverflowState()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        refreshOverflowState()
      })
      resizeObserver.observe(viewport)
      if (viewport.firstElementChild instanceof HTMLElement) {
        resizeObserver.observe(viewport.firstElementChild)
      }
    }
    window.addEventListener('resize', refreshOverflowState)
    return () => {
      viewport.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', refreshOverflowState)
    }
  }, [refreshOverflowState])

  const scrollViewport = (direction: -1 | 1) => {
    const viewport = viewportRef.current
    if (!viewport || disableNavigation) {
      return
    }
    viewport.scrollBy({
      left: direction * (scrollStepPx ?? Math.max(120, Math.round(viewport.clientWidth * 0.45))),
      behavior: 'smooth',
    })
  }

  const onViewportWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    if (!viewport || disableNavigation) {
      return
    }
    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    if (Math.abs(horizontalDelta) < 0.5 || maxScrollLeft <= 0) {
      return
    }
    const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, viewport.scrollLeft + horizontalDelta))
    if (nextScrollLeft === viewport.scrollLeft) {
      return
    }
    event.preventDefault()
    viewport.scrollLeft = nextScrollLeft
    refreshOverflowState()
  }

  const isOverflowing = overflowState.canScrollLeft || overflowState.canScrollRight
  const leftNavHidden = disableNavigation || (hideNavWhenNotOverflowing && !isOverflowing)
  const rightNavHidden = disableNavigation || (hideNavWhenNotOverflowing && !isOverflowing)
  const navCollapsed = collapseNavWhenHidden && leftNavHidden && rightNavHidden
  const resolveNavClassName = (hidden: boolean) =>
    [
      'overflow-strip-nav',
      hidden ? 'overflow-strip-nav-hidden' : '',
      hidden && collapseNavWhenHidden ? 'overflow-strip-nav-collapsed' : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div
      className={[
        'overflow-strip',
        navCollapsed ? 'overflow-strip-navs-collapsed' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={resolveNavClassName(leftNavHidden)}
        onClick={() => scrollViewport(-1)}
        disabled={disableNavigation || !overflowState.canScrollLeft}
        aria-label={`Scroll ${navAriaLabel} left`}
      >
        <ChevronLeft size={14} />
      </button>
      <div
        ref={viewportRef}
        className={viewportClassName ? `overflow-strip-viewport ${viewportClassName}` : 'overflow-strip-viewport'}
        onWheel={onViewportWheel}
      >
        <div
          {...contentProps}
          className={contentClassName ? `overflow-strip-content ${contentClassName}` : 'overflow-strip-content'}
        >
          {children}
        </div>
      </div>
      <button
        type="button"
        className={resolveNavClassName(rightNavHidden)}
        onClick={() => scrollViewport(1)}
        disabled={disableNavigation || !overflowState.canScrollRight}
        aria-label={`Scroll ${navAriaLabel} right`}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
