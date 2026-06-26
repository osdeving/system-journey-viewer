/**
 * Purpose: Verify pure node label layout and text truncation helpers.
 */

import { describe, expect, it } from 'vitest'
import type { NodeModel } from '../../model/types'
import {
  resolveNodeLabelLayout,
  resolveStickyNoteShape,
  truncateCanvasMultilineText,
  truncateCanvasText,
} from './nodeLabelLayout'

const makeNode = (overrides: Partial<NodeModel> = {}): NodeModel => ({
  id: 'n_1',
  kind: 'container',
  name: 'Orders Service',
  tags: [],
  bounds: { x: 0, y: 0, w: 220, h: 120 },
  ports: [],
  children: [],
  ...overrides,
})

describe('node label layout helpers', () => {
  it('truncates single-line node text using canvas width estimates', () => {
    const truncated = truncateCanvasText('A very long service name', 72, 14)

    expect(truncated.endsWith('\u2026')).toBe(true)
    expect(truncated.length).toBeLessThan('A very long service name'.length)
  })

  it('limits multiline sticky-note text by line count', () => {
    const truncated = truncateCanvasMultilineText('line one\nline two\nline three', 120, 13, 2)

    expect(truncated.split('\n')).toHaveLength(2)
    expect(truncated.endsWith('\u2026')).toBe(true)
  })

  it('builds sticky-note shell and fold paths from node bounds', () => {
    const shape = resolveStickyNoteShape(230, 96)

    expect(shape.shellPath).toContain('H 211')
    expect(shape.foldPath).toContain('M 211 0')
  })

  it('resolves start-aligned regular node label layout', () => {
    const layout = resolveNodeLabelLayout(makeNode(), false)

    expect(layout.textAnchor).toBe('start')
    expect(layout.titleX).toBe(16)
    expect(layout.maxTitleWidth).toBe(190)
  })

  it('resolves centered hexagon node label layout', () => {
    const layout = resolveNodeLabelLayout(makeNode({ bounds: { x: 0, y: 0, w: 240, h: 120 } }), true)

    expect(layout.textAnchor).toBe('middle')
    expect(layout.titleX).toBe(120)
    expect(layout.maxTitleWidth).toBeCloseTo(139.2, 1)
  })
})
