/**
 * Purpose: Verify canvas inline text sanitization before model and SJV Script export updates.
 */

import { describe, expect, it } from 'vitest'
import { fullWorkspaceToLiteDsl, liteToFullWorkspace } from '../../dsl-lite/convert'
import { parseLiteDsl } from '../../dsl-lite/parser'
import { createDefaultWorkspace } from '../../model/defaultWorkspace'
import { sanitizeInlineTextEditValue } from './inlineTextEditing'

describe('sanitizeInlineTextEditValue', () => {
  it('trims single-line labels and removes unsupported script control characters', () => {
    expect(sanitizeInlineTextEditValue('  Orders\u0000\tAPI\nGateway  ')).toBe('Orders API Gateway')
  })

  it('preserves multiline note text while normalizing carriage returns', () => {
    expect(sanitizeInlineTextEditValue('Line 1\r\nLine 2\u0007', { multiline: true })).toBe('Line 1\nLine 2')
  })

  it('keeps inline-edited model text exportable as valid SJV Script', () => {
    const workspace = createDefaultWorkspace()
    const firstNodeId = Object.keys(workspace.nodes)[0] ?? ''
    const firstEdgeId = Object.keys(workspace.edges)[0] ?? ''
    if (!firstNodeId || !firstEdgeId) {
      throw new Error('Default workspace fixture must include at least one node and one edge.')
    }

    workspace.nodes[firstNodeId].name = sanitizeInlineTextEditValue('Orders\u0000 "API"\nGateway')
    workspace.edges[firstEdgeId].label = sanitizeInlineTextEditValue('load \u0001"orders"')

    const script = fullWorkspaceToLiteDsl(workspace)
    expect(script).not.toContain('\u0000')
    expect(script).not.toContain('\u0001')
    expect(script).toContain('Orders \\"API\\" Gateway')
    expect(script).toContain('load \\"orders\\"')

    const reparsed = parseLiteDsl(script)
    const rebuilt = liteToFullWorkspace(reparsed)
    expect(Object.values(rebuilt.nodes).some((node) => node.name === 'Orders "API" Gateway')).toBe(true)
    expect(Object.values(rebuilt.edges).some((edge) => edge.label === 'load "orders"')).toBe(true)
  })
})
