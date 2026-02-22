/**
 * Purpose: Verify exporters behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { serializeCanvasSvg } from './exporters'

describe('export helpers', () => {
  it('serializes an svg element with namespace', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '800')
    svg.setAttribute('height', '600')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', '10')
    rect.setAttribute('y', '10')
    rect.setAttribute('width', '100')
    rect.setAttribute('height', '60')
    svg.appendChild(rect)

    const serialized = serializeCanvasSvg(svg)

    expect(serialized).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(serialized).toContain('<rect')
  })
})
