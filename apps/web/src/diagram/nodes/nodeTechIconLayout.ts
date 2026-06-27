/**
 * Purpose: Keep UI-only node technology icons positioned and sized inside node bounds.
 */

import type { NodeBounds } from '../../model/types'
import type { NodeLabelLayout } from './nodeLabelLayout'
import { estimateCanvasTextWidth } from './nodeLabelLayout'

export type NodeTechIconPlacement = {
  x: number
  y: number
  size: number
}

export const DEFAULT_NODE_TECH_ICON_SIZE = 24
export const PREFERRED_NODE_TECH_ICON_SIZE = 72
export const MIN_NODE_TECH_ICON_SIZE = 14
export const MIN_SIDE_BY_TEXT_NODE_TECH_ICON_SIZE = 26
export const NODE_TECH_ICON_PADDING = 4
export const NODE_TECH_ICON_TEXT_GAP = 6
const NODE_TECH_ICON_TITLE_GAP = 8
const NODE_TECH_ICON_CENTERED_TEXT_GAP = 8
const NODE_TECH_ICON_HEIGHT_RATIO = 0.62
const HEX_NODE_TECH_ICON_WIDTH_RATIO = 0.42

export const resolveNodeTechIconMaxSize = (bounds: Pick<NodeBounds, 'w' | 'h'>): number =>
  Math.max(
    MIN_NODE_TECH_ICON_SIZE,
    Math.min(bounds.w - NODE_TECH_ICON_PADDING * 2, bounds.h - NODE_TECH_ICON_PADDING * 2),
  )

export const clampNodeTechIconPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  placement: NodeTechIconPlacement,
): NodeTechIconPlacement => {
  const maxSize = resolveNodeTechIconMaxSize(bounds)
  const size = Math.min(maxSize, Math.max(MIN_NODE_TECH_ICON_SIZE, placement.size))
  const maxX = Math.max(NODE_TECH_ICON_PADDING, bounds.w - size - NODE_TECH_ICON_PADDING)
  const maxY = Math.max(NODE_TECH_ICON_PADDING, bounds.h - size - NODE_TECH_ICON_PADDING)
  return {
    x: Math.min(maxX, Math.max(NODE_TECH_ICON_PADDING, placement.x)),
    y: Math.min(maxY, Math.max(NODE_TECH_ICON_PADDING, placement.y)),
    size,
  }
}

export const resolveDefaultNodeTechIconPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  labelLayout: NodeLabelLayout,
  subtitle: string,
  options: { preferCentered?: boolean } = {},
): NodeTechIconPlacement => {
  const preferredSize = Math.min(
    PREFERRED_NODE_TECH_ICON_SIZE,
    resolveNodeTechIconMaxSize(bounds),
    Math.max(DEFAULT_NODE_TECH_ICON_SIZE, bounds.h * NODE_TECH_ICON_HEIGHT_RATIO),
  )
  const subtitleWidth = Math.min(
    labelLayout.maxSubtitleWidth,
    estimateCanvasTextWidth(subtitle, 12),
  )
  const subtitleLeft =
    labelLayout.textAnchor === 'middle'
      ? labelLayout.subtitleX - subtitleWidth / 2
      : labelLayout.subtitleX
  const centeredPlacement = (): NodeTechIconPlacement => {
    const centeredTop = Math.min(
      bounds.h - MIN_NODE_TECH_ICON_SIZE - NODE_TECH_ICON_PADDING,
      labelLayout.subtitleY + NODE_TECH_ICON_CENTERED_TEXT_GAP,
    )
    const centeredSize = Math.max(
      MIN_NODE_TECH_ICON_SIZE,
      Math.min(
        preferredSize,
        bounds.w * HEX_NODE_TECH_ICON_WIDTH_RATIO,
        bounds.h - centeredTop - NODE_TECH_ICON_PADDING,
      ),
    )
    return clampNodeTechIconPlacement(bounds, {
      x: (bounds.w - centeredSize) / 2,
      y: centeredTop,
      size: centeredSize,
    })
  }

  if (options.preferCentered || labelLayout.textAnchor === 'middle') {
    return centeredPlacement()
  }

  const sideX = subtitleLeft + subtitleWidth + NODE_TECH_ICON_TEXT_GAP
  const sideAvailableWidth = bounds.w - sideX - NODE_TECH_ICON_PADDING
  const sideSize = Math.min(preferredSize, sideAvailableWidth)
  if (sideSize < MIN_SIDE_BY_TEXT_NODE_TECH_ICON_SIZE) {
    return centeredPlacement()
  }

  return clampNodeTechIconPlacement(bounds, {
    x: sideX,
    y: Math.min(
      labelLayout.titleY + NODE_TECH_ICON_TITLE_GAP,
      bounds.h - sideSize - NODE_TECH_ICON_PADDING,
    ),
    size: sideSize,
  })
}

export const resolveResizedNodeTechIconPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  origin: NodeTechIconPlacement,
  handle: 'nw' | 'ne' | 'sw' | 'se',
  dx: number,
  dy: number,
): NodeTechIconPlacement => {
  const horizontalDelta = handle.includes('w') ? -dx : dx
  const verticalDelta = handle.includes('n') ? -dy : dy
  const delta = Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta
  const nextSize = origin.size + delta
  const clampedSize = Math.min(
    resolveNodeTechIconMaxSize(bounds),
    Math.max(MIN_NODE_TECH_ICON_SIZE, nextSize),
  )
  return clampNodeTechIconPlacement(bounds, {
    x: handle.includes('w') ? origin.x + origin.size - clampedSize : origin.x,
    y: handle.includes('n') ? origin.y + origin.size - clampedSize : origin.y,
    size: clampedSize,
  })
}
