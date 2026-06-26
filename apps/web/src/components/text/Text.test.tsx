/**
 * Purpose: Verify shared text primitives render DOM text, SVG labels, and inline editors consistently.
 */

import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Text } from './Text'

let activeContainer: HTMLDivElement | null = null
let activeRoot: Root | null = null

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  vi.useRealTimers()
  if (activeRoot) {
    act(() => {
      activeRoot?.unmount()
    })
  }
  activeRoot = null
  activeContainer?.remove()
  activeContainer = null
})

const render = (element: ReactNode): void => {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)
  act(() => {
    activeRoot?.render(element)
  })
}

const typeIntoInput = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

const dispatchPointer = (
  element: Element,
  type: string,
  init: { pointerId?: number; clientX?: number; clientY?: number; button?: number } = {},
): void => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    button: init.button ?? 0,
  })
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 })
  Object.defineProperty(event, 'pointerType', { value: 'mouse' })
  element.dispatchEvent(event)
}

describe('Text primitives', () => {
  it('renders configurable DOM text classes', () => {
    render(<Text as="p" tone="muted" size="xs" weight="bold" truncate>System Journey Viewer</Text>)

    const text = activeContainer?.querySelector('p')
    expect(text?.className).toContain('app-text-tone-muted')
    expect(text?.className).toContain('app-text-size-xs')
    expect(text?.className).toContain('app-text-weight-bold')
    expect(text?.className).toContain('app-text-truncate')
  })

  it('splits multiline SVG labels into tspans', () => {
    render(
      <svg>
        <Text.Svg x={10} y={20}>Line one{'\n'}Line two</Text.Svg>
      </svg>,
    )

    expect(activeContainer?.querySelectorAll('tspan')).toHaveLength(2)
    expect(activeContainer?.querySelector('text')?.classList.contains('app-text-svg')).toBe(true)
  })

  it('emits inline editor value changes for in-place editing', () => {
    const onChange = vi.fn()
    render(<Text.InlineEditor value="Before" onChange={onChange} />)

    const input = activeContainer?.querySelector<HTMLInputElement>('input')
    act(() => {
      if (input) {
        typeIntoInput(input, 'After')
      }
    })

    expect(onChange).toHaveBeenCalledWith('After')
  })

  it('opens SVG text long-press editing only after the hold delay', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    render(
      <svg>
        <Text.Svg x={10} y={20} longPressDelayMs={500} onLongPress={onLongPress}>
          Editable
        </Text.Svg>
      </svg>,
    )

    const text = activeContainer?.querySelector('text')
    expect(text).toBeTruthy()

    act(() => {
      if (text) {
        dispatchPointer(text, 'pointerdown')
        dispatchPointer(text, 'pointerup')
      }
      vi.advanceTimersByTime(500)
    })
    expect(onLongPress).not.toHaveBeenCalled()

    act(() => {
      if (text) {
        dispatchPointer(text, 'pointerdown')
      }
      vi.advanceTimersByTime(499)
    })
    expect(onLongPress).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('cancels SVG text long-press when pointer movement starts dragging', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    const onPressMoveStart = vi.fn()
    render(
      <svg>
        <Text.Svg
          x={10}
          y={20}
          longPressDelayMs={500}
          longPressMoveTolerancePx={4}
          onLongPress={onLongPress}
          onPressMoveStart={onPressMoveStart}
        >
          Draggable label
        </Text.Svg>
      </svg>,
    )

    const text = activeContainer?.querySelector('text')
    act(() => {
      if (text) {
        dispatchPointer(text, 'pointerdown', { clientX: 10, clientY: 10 })
        dispatchPointer(text, 'pointermove', { clientX: 18, clientY: 10 })
      }
      vi.advanceTimersByTime(500)
    })

    expect(onPressMoveStart).toHaveBeenCalledTimes(1)
    expect(onLongPress).not.toHaveBeenCalled()
  })
})
