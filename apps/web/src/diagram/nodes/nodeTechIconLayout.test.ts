/**
 * Purpose: Verify UI-only technology icon placement stays within node bounds.
 */

import { describe, expect, it } from 'vitest'
import {
  clampNodeTechIconPlacement,
  DEFAULT_NODE_TECH_ICON_SIZE,
  resolveDefaultNodeTechIconPlacement,
  resolveNodeTechIconMaxSize,
  resolveResizedNodeTechIconPlacement,
} from './nodeTechIconLayout'
import type { NodeLabelLayout } from './nodeLabelLayout'

const labelLayout: NodeLabelLayout = {
  titleX: 16,
  titleY: 34,
  subtitleX: 16,
  subtitleY: 56,
  textAnchor: 'start',
  maxTitleWidth: 190,
  maxSubtitleWidth: 190,
}

describe('nodeTechIconLayout', () => {
  it('places a default icon beside the subtitle and inside the node', () => {
    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 220, h: 120 },
      labelLayout,
      'Spring Boot',
    )

    expect(placement.size).toBe(DEFAULT_NODE_TECH_ICON_SIZE)
    expect(placement.x).toBeGreaterThan(labelLayout.subtitleX)
    expect(placement.y).toBeGreaterThanOrEqual(4)
    expect(placement.x + placement.size).toBeLessThanOrEqual(216)
  })

  it('clamps movement and size so icons cannot exceed node bounds', () => {
    expect(resolveNodeTechIconMaxSize({ w: 30, h: 26 })).toBe(18)
    expect(
      clampNodeTechIconPlacement(
        { w: 100, h: 80 },
        { x: 90, y: -20, size: 300 },
      ),
    ).toEqual({ x: 24, y: 4, size: 72 })
  })

  it('resizes from corner grips while preserving the opposite corner', () => {
    expect(
      resolveResizedNodeTechIconPlacement(
        { w: 120, h: 90 },
        { x: 30, y: 24, size: 24 },
        'nw',
        -10,
        -10,
      ),
    ).toEqual({ x: 20, y: 14, size: 34 })
  })
})

