/**
 * Purpose: Verify UI-only technology icon placement stays within node bounds.
 */

import { describe, expect, it } from 'vitest'
import {
  clampNodeTechIconPlacement,
  DEFAULT_NODE_TECH_ICON_SIZE,
  MIN_NODE_TECH_ICON_SIZE,
  resolveAnchoredNodeTechIconPlacement,
  resolveDefaultNodeTechIconPlacement,
  resolveNodeTechIconMaxSize,
  resolveResizedNodeTechIconPlacement,
} from './nodeTechIconLayout'
import type { NodeLabelLayout } from './nodeLabelLayout'
import {
  resolveDbCylinderShape,
  resolveQueueCylinderShape,
} from './nodeShapePaths'

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
  it('sizes normal-node icons from text-free width and height and anchors bottom-right', () => {
    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 220, h: 120 },
      labelLayout,
      'Component',
      { title: 'Component 19' },
    )

    expect(placement.size).toBe(72)
    expect(placement.x + placement.size).toBe(216)
    expect(placement.y + placement.size).toBe(116)
    expect(placement.x).toBe(144)
    expect(placement.y).toBe(44)
  })

  it('uses the full measured free space for larger normal nodes', () => {
    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 320, h: 220 },
      labelLayout,
      'Spring Boot',
      { title: 'Component 28' },
    )

    expect(placement.size).toBe(172)
    expect(placement.x + placement.size).toBe(316)
    expect(placement.y + placement.size).toBe(216)
  })

  it('centers normal-node icons below text when long labels leave a tiny corner', () => {
    const constrainedLabelLayout: NodeLabelLayout = {
      ...labelLayout,
      maxSubtitleWidth: 150,
    }

    const placement = resolveDefaultNodeTechIconPlacement(
      { w: 180, h: 120 },
      constrainedLabelLayout,
      'Very Long Enterprise Integration Framework',
      { title: 'Component' },
    )

    expect(placement.size).toBe(48)
    expect(placement.x).toBe(66)
    expect(placement.y).toBe(68)
    expect(placement.y + placement.size).toBe(116)
  })

  it('keeps queue cylinder icons inside the lateral body instead of the front cap', () => {
    const queueLabelLayout: NodeLabelLayout = {
      titleX: 12,
      titleY: 18,
      subtitleX: 12,
      subtitleY: 34,
      textAnchor: 'start',
      maxTitleWidth: 78,
      maxSubtitleWidth: 78,
    }
    const bounds = { w: 104, h: 50 }
    const shape = resolveQueueCylinderShape(bounds.w, bounds.h)

    const placement = resolveDefaultNodeTechIconPlacement(
      bounds,
      queueLabelLayout,
      'Kafka',
      { shapeKind: 'queue-cylinder', title: 'Queue / Stream' },
    )

    expect(placement.x + placement.size).toBeLessThanOrEqual(
      bounds.w - shape.capRx - 4,
    )
    expect(placement.y + placement.size).toBeLessThanOrEqual(bounds.h - 4)
    expect(placement.size).toBeGreaterThanOrEqual(MIN_NODE_TECH_ICON_SIZE)
    expect(placement.size).toBeLessThan(DEFAULT_NODE_TECH_ICON_SIZE)
  })

  it('keeps database cylinder icons in the body between the caps', () => {
    const bounds = { w: 130, h: 70 }
    const shape = resolveDbCylinderShape(bounds.w, bounds.h)

    const placement = resolveDefaultNodeTechIconPlacement(
      bounds,
      labelLayout,
      'PostgreSQL',
      { shapeKind: 'db-cylinder', title: 'Database 26' },
    )

    expect(placement.size).toBeGreaterThan(DEFAULT_NODE_TECH_ICON_SIZE)
    expect(placement.y).toBeGreaterThanOrEqual(shape.capRy + 4)
    expect(placement.y + placement.size).toBeLessThanOrEqual(
      bounds.h - shape.capRy - 4,
    )
  })

  it('centers hexagonal component icons in the largest lower polygon space', () => {
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
      { shapeKind: 'hexagon', title: 'API Gateway' },
    )

    expect(placement.x).toBeCloseTo((160 - placement.size) / 2)
    expect(placement.y).toBeGreaterThan(hexLabelLayout.subtitleY)
    expect(placement.size).toBeGreaterThan(50)
    expect(placement.y + placement.size).toBeLessThanOrEqual(116)
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

  it('keeps technology icons anchored and proportionally sized when nodes resize', () => {
    const placement = resolveAnchoredNodeTechIconPlacement(
      { w: 220, h: 120 },
      { w: 440, h: 240 },
      { x: 144, y: 44, size: 72 },
    )

    expect(placement.size).toBe(144)
    expect(placement.x + placement.size).toBe(432)
    expect(placement.y + placement.size).toBe(232)
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
