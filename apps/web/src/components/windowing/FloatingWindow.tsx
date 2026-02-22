/**
 * Purpose: Provide reusable React window shells and dock host components for floating and docked panels.
 */

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { resolveFloatingDockResizeRect, type FloatingDockResizeHandle } from '../../layout/dockSizing'
import { clampFloatingDockRect, type FloatingDockRect } from '../../layout/floatingDock'

const FLOATING_WINDOW_HANDLES: FloatingDockResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

type FloatingWindowProps = {
  title: string
  ariaLabel?: string
  rect: FloatingDockRect
  onRectChange: (nextRect: FloatingDockRect) => void
  topbarHeight: number
  minWidth?: number
  minHeight?: number
  margin?: number
  zIndex?: number
  className?: string
  bodyClassName?: string
  headerActions?: ReactNode
  onClose?: () => void
  children: ReactNode
}

type DragState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
}

type ResizeState = {
  pointerId: number
  handle: FloatingDockResizeHandle
  startClientX: number
  startClientY: number
  startRect: FloatingDockRect
}

const DEFAULT_MARGIN = 8

export function FloatingWindow({
  title,
  ariaLabel,
  rect,
  onRectChange,
  topbarHeight,
  minWidth = 320,
  minHeight = 240,
  margin = DEFAULT_MARGIN,
  zIndex = 190,
  className,
  bodyClassName,
  headerActions,
  onClose,
  children,
}: FloatingWindowProps) {
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)
  const rectRef = useRef(rect)

  useEffect(() => {
    rectRef.current = rect
  }, [rect])

  const clampRect = useCallback(
    (candidate: FloatingDockRect): FloatingDockRect => {
      if (typeof window === 'undefined') {
        return candidate
      }
      return clampFloatingDockRect({
        rect: candidate,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        topbarHeight,
        margin,
        minWidth,
        minHeight,
      })
    },
    [margin, minHeight, minWidth, topbarHeight],
  )

  const onHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: rectRef.current.x,
      startY: rectRef.current.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onResizePointerDown = (handle: FloatingDockResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = {
      pointerId: event.pointerId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: rectRef.current,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  useEffect(() => {
    const onWindowPointerMove = (event: PointerEvent) => {
      const resize = resizeRef.current
      if (resize && resize.pointerId === event.pointerId) {
        const nextRect = resolveFloatingDockResizeRect({
          handle: resize.handle,
          startRect: resize.startRect,
          startClientX: resize.startClientX,
          startClientY: resize.startClientY,
          currentClientX: event.clientX,
          currentClientY: event.clientY,
        })
        onRectChange(clampRect(nextRect))
        return
      }

      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }
      const nextX = drag.startX + (event.clientX - drag.startClientX)
      const nextY = drag.startY + (event.clientY - drag.startClientY)
      onRectChange(clampRect({ ...rectRef.current, x: nextX, y: nextY }))
    }

    const stopInteraction = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) {
        dragRef.current = null
      }
      if (resizeRef.current?.pointerId === event.pointerId) {
        resizeRef.current = null
      }
    }

    const onWindowBlur = () => {
      dragRef.current = null
      resizeRef.current = null
    }

    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', stopInteraction)
    window.addEventListener('pointercancel', stopInteraction)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', stopInteraction)
      window.removeEventListener('pointercancel', stopInteraction)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [clampRect, onRectChange])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const emitIfChanged = (candidate: FloatingDockRect) => {
      const next = clampRect(candidate)
      if (
        next.x !== candidate.x ||
        next.y !== candidate.y ||
        next.width !== candidate.width ||
        next.height !== candidate.height
      ) {
        onRectChange(next)
      }
    }

    const onWindowResize = () => {
      emitIfChanged(rectRef.current)
    }

    emitIfChanged(rect)
    window.addEventListener('resize', onWindowResize)
    return () => {
      window.removeEventListener('resize', onWindowResize)
    }
  }, [clampRect, onRectChange, rect])

  return (
    <section
      className={className ? `floating-window ${className}` : 'floating-window'}
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel ?? title}
      style={{
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex,
      }}
    >
      {FLOATING_WINDOW_HANDLES.map((handle) => (
        <div
          key={handle}
          className={`floating-window-resize-handle floating-window-resize-${handle}`}
          onPointerDown={(event) => onResizePointerDown(handle, event)}
        />
      ))}
      <div className="floating-window-header" onPointerDown={onHeaderPointerDown}>
        <strong>{title}</strong>
        <span
          className="floating-window-header-actions"
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
        >
          {headerActions}
          {onClose ? (
            <button type="button" className="floating-window-close" onClick={onClose} aria-label={`Close ${title}`}>
              <X size={14} />
            </button>
          ) : null}
        </span>
      </div>
      <div className={bodyClassName ? `floating-window-body ${bodyClassName}` : 'floating-window-body'}>{children}</div>
    </section>
  )
}
