/**
 * Purpose: Provide reusable text primitives for app chrome, SVG canvas labels, and in-place editing.
 */

import {
  createElement,
  useEffect,
  useRef,
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type SVGProps,
  type WheelEvent,
} from 'react'

type TextElement = 'span' | 'p' | 'div' | 'strong' | 'small' | 'label' | 'h2' | 'h3' | 'h4'
type TextTone = 'default' | 'muted' | 'strong' | 'accent' | 'inverse'
type TextSize = 'xs' | 'sm' | 'md' | 'lg'
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold'

type TextRootProps = HTMLAttributes<HTMLElement> & {
  as?: TextElement
  tone?: TextTone
  size?: TextSize
  weight?: TextWeight
  truncate?: boolean
}

type SvgTextProps = SVGProps<SVGTextElement> & {
  x: number
  y: number
  lineHeightEm?: number
  longPressDelayMs?: number
  longPressMoveTolerancePx?: number
  onLongPress?: (event: PointerEvent<SVGTextElement>) => void
  onPressMoveStart?: (event: PointerEvent<SVGTextElement>) => void
}

type InlineTextEditorProps = {
  multiline?: boolean
  value: string
  inputRef?: Ref<HTMLInputElement>
  textareaRef?: Ref<HTMLTextAreaElement>
  className?: string
  onChange: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: () => void
  onPointerDown?: (event: PointerEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onWheel?: (event: WheelEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  style?: CSSProperties
}

const joinClassNames = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ')

const DEFAULT_LONG_PRESS_DELAY_MS = 520
const DEFAULT_LONG_PRESS_MOVE_TOLERANCE_PX = 7

type LongPressState = {
  event: PointerEvent<SVGTextElement>
  pointerId: number
  startX: number
  startY: number
  timerId: number
  moved: boolean
  longPressed: boolean
}

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null): void => {
  if (!ref) {
    return
  }
  if (typeof ref === 'function') {
    ref(value)
    return
  }
  ;(ref as { current: T | null }).current = value
}

const resolveMultiline = (children: ReactNode): string[] | null => {
  const text =
    Array.isArray(children) && children.every((child) => typeof child === 'string' || typeof child === 'number')
      ? children.join('')
      : typeof children === 'string' || typeof children === 'number'
        ? String(children)
        : null

  if (text === null) {
    return null
  }
  const lines = text.split('\n')
  return lines.length > 1 ? lines : null
}

const TextRoot = ({
  as = 'span',
  tone = 'default',
  size = 'sm',
  weight = 'regular',
  truncate = false,
  className,
  ...props
}: TextRootProps) =>
  createElement(as, {
    ...props,
    className: joinClassNames(
      'app-text',
      `app-text-tone-${tone}`,
      `app-text-size-${size}`,
      `app-text-weight-${weight}`,
      truncate ? 'app-text-truncate' : null,
      className,
    ),
  })

const TextLabel = (props: Omit<TextRootProps, 'as' | 'weight' | 'size'>) => (
  <TextRoot as="span" size="xs" weight="semibold" {...props} />
)

const TextMeta = (props: Omit<TextRootProps, 'as' | 'tone' | 'size'>) => (
  <TextRoot as="span" tone="muted" size="xs" {...props} />
)

const SvgText = ({
  x,
  y,
  lineHeightEm = 1.18,
  longPressDelayMs = DEFAULT_LONG_PRESS_DELAY_MS,
  longPressMoveTolerancePx = DEFAULT_LONG_PRESS_MOVE_TOLERANCE_PX,
  onLongPress,
  onPressMoveStart,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  children,
  className,
  ...rest
}: SvgTextProps) => {
  const longPressRef = useRef<LongPressState | null>(null)
  const clearLongPressTimer = (): void => {
    const state = longPressRef.current
    if (state) {
      window.clearTimeout(state.timerId)
    }
  }
  const resetLongPress = (): void => {
    clearLongPressTimer()
    longPressRef.current = null
  }

  useEffect(
    () => () => {
      const state = longPressRef.current
      if (state) {
        window.clearTimeout(state.timerId)
      }
      longPressRef.current = null
    },
    [],
  )

  const beginLongPress = (event: PointerEvent<SVGTextElement>): void => {
    if (!onLongPress || event.button !== 0) {
      onPointerDown?.(event)
      return
    }

    event.preventDefault()
    event.stopPropagation()
    resetLongPress()

    const target = event.currentTarget as SVGTextElement & {
      setPointerCapture?: (pointerId: number) => void
    }
    target.setPointerCapture?.(event.pointerId)

    const state: LongPressState = {
      event,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timerId: window.setTimeout(() => {
        const current = longPressRef.current
        if (!current || current.pointerId !== event.pointerId || current.moved) {
          return
        }
        current.longPressed = true
        onLongPress(event)
      }, longPressDelayMs),
      moved: false,
      longPressed: false,
    }
    longPressRef.current = state
  }

  const moveLongPress = (event: PointerEvent<SVGTextElement>): void => {
    const state = longPressRef.current
    if (!state || state.pointerId !== event.pointerId) {
      onPointerMove?.(event)
      return
    }

    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY)
    if (!state.longPressed && !state.moved && distance > longPressMoveTolerancePx) {
      window.clearTimeout(state.timerId)
      state.moved = true
      onPressMoveStart?.(state.event)
    }
    onPointerMove?.(event)
  }

  const finishLongPress = (event: PointerEvent<SVGTextElement>, handler?: (event: PointerEvent<SVGTextElement>) => void): void => {
    const state = longPressRef.current
    if (!state || state.pointerId !== event.pointerId) {
      handler?.(event)
      return
    }

    const shouldSwallow = !state.moved || state.longPressed
    resetLongPress()
    if (shouldSwallow) {
      event.preventDefault()
      event.stopPropagation()
    }
    handler?.(event)
  }

  const lines = resolveMultiline(children)
  const resolvedClassName = joinClassNames('app-text-svg', className)
  if (!lines) {
    return (
      <text
        x={x}
        y={y}
        className={resolvedClassName}
        onPointerDown={beginLongPress}
        onPointerMove={moveLongPress}
        onPointerUp={(event) => finishLongPress(event, onPointerUp)}
        onPointerCancel={(event) => finishLongPress(event, onPointerCancel)}
        onPointerLeave={(event) => finishLongPress(event, onPointerLeave)}
        {...rest}
      >
        {children}
      </text>
    )
  }
  return (
    <text
      x={x}
      y={y}
      className={resolvedClassName}
      onPointerDown={beginLongPress}
      onPointerMove={moveLongPress}
      onPointerUp={(event) => finishLongPress(event, onPointerUp)}
      onPointerCancel={(event) => finishLongPress(event, onPointerCancel)}
      onPointerLeave={(event) => finishLongPress(event, onPointerLeave)}
      {...rest}
    >
      {lines.map((line, index) => (
        <tspan
          key={`${index}:${line}`}
          x={x}
          dy={index === 0 ? 0 : `${lineHeightEm}em`}
        >
          {line || '\u200b'}
        </tspan>
      ))}
    </text>
  )
}

const InlineTextEditor = forwardRef<HTMLInputElement | HTMLTextAreaElement, InlineTextEditorProps>(
  (
    {
      multiline = false,
      value,
      inputRef,
      textareaRef,
      className,
      onChange,
      onKeyDown,
      onBlur,
      onPointerDown,
      onWheel,
      style,
    },
    forwardedRef,
  ) => {
    const sharedProps = {
      className: joinClassNames('app-text-inline-editor-control', className),
      value,
      onInput: (event: { currentTarget: { value: string } }) => onChange(event.currentTarget.value),
      onKeyDown,
      onBlur,
      onPointerDown,
      onWheel,
      style,
    }

    if (multiline) {
      return (
        <textarea
          {...sharedProps}
          ref={(node) => {
            assignRef(textareaRef, node)
            assignRef(forwardedRef as Ref<HTMLTextAreaElement>, node)
          }}
        />
      )
    }

    return (
      <input
        {...sharedProps}
        ref={(node) => {
          assignRef(inputRef, node)
          assignRef(forwardedRef as Ref<HTMLInputElement>, node)
        }}
      />
    )
  },
)

InlineTextEditor.displayName = 'InlineTextEditor'

export const Text = Object.assign(TextRoot, {
  Label: TextLabel,
  Meta: TextMeta,
  Svg: SvgText,
  InlineEditor: InlineTextEditor,
})

export { SvgText }
