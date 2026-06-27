/**
 * Purpose: Verify UI-only technology icon placement stays within node bounds.
 */

import { describe, expect, it } from 'vitest'
import {
  clampNodeTechIconPlacement,
  DEFAULT_NODE_TECH_ICON_SIZE,
  MIN_SIDE_BY_TEXT_NODE_TECH_ICON_SIZE,
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
  it('places a large default icon beside short technology text and below the node name', () => {
    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 220, h: 120 },
      labelLayout,
      'Component',
    )

    expect(placement.size).toBeGreaterThan(DEFAULT_NODE_TECH_ICON_SIZE)
    expect(placement.size).toBeCloseTo(72)
    expect(placement.x).toBeGreaterThan(labelLayout.subtitleX + 60)
    expect(placement.y).toBeGreaterThan(labelLayout.titleY)
    expect(placement.x + placement.size).toBeLessThanOrEqual(216)
  })

  it('uses the available right-side room so database labels get a larger default icon', () => {
    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 130, h: 70 },
      labelLayout,
      'PostgreSQL',
    )

    expect(placement.size).toBeGreaterThan(DEFAULT_NODE_TECH_ICON_SIZE)
    expect(placement.x).toBeGreaterThan(labelLayout.subtitleX + 60)
    expect(placement.x + placement.size).toBeLessThanOrEqual(126)
  })

  it('centers the default icon below when long technology text would force a tiny side icon', () => {
    const constrainedLabelLayout: NodeLabelLayout = {
      ...labelLayout,
      maxSubtitleWidth: 150,
    }

    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 180, h: 120 },
      constrainedLabelLayout,
      'Very Long Enterprise Integration Framework',
    )

    expect(placement.size).toBeGreaterThan(MIN_SIDE_BY_TEXT_NODE_TECH_ICON_SIZE)
    expect(placement.x).toBeCloseTo((180 - placement.size) / 2)
    expect(placement.y).toBeGreaterThan(constrainedLabelLayout.subtitleY)
  })

  it('centers hexagonal component icons below the technology text', () => {
    const hexLabelLayout: NodeLabelLayout = {
      titleX: 80,
      titleY: 32,
      subtitleX: 80,
      subtitleY: 53,
      textAnchor: 'middle',
      maxTitleWidth: 100,
      maxSubtitleWidth: 100,
    }

    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 160, h: 120 },
      hexLabelLayout,
      'NGINX',
      { preferCentered: true },
    )

    expect(placement.x).toBeCloseTo((160 - placement.size) / 2)
    expect(placement.y).toBeGreaterThan(hexLabelLayout.subtitleY)
    expect(placement.size).toBeGreaterThan(DEFAULT_NODE_TECH_ICON_SIZE)
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
