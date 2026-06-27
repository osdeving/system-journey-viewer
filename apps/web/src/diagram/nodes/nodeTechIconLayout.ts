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
export const MIN_NODE_TECH_ICON_SIZE = 14
export const NODE_TECH_ICON_PADDING = 4
export const NODE_TECH_ICON_TEXT_GAP = 6

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
): NodeTechIconPlacement => {
  const size = Math.min(DEFAULT_NODE_TECH_ICON_SIZE, resolveNodeTechIconMaxSize(bounds))
  const subtitleWidth = Math.min(
    labelLayout.maxSubtitleWidth,
    estimateCanvasTextWidth(subtitle, 12),
  )
  const subtitleLeft =
    labelLayout.textAnchor === 'middle'
      ? labelLayout.subtitleX - subtitleWidth / 2
      : labelLayout.subtitleX
  return clampNodeTechIconPlacement(bounds, {
    x: subtitleLeft + subtitleWidth + NODE_TECH_ICON_TEXT_GAP,
    y: labelLayout.subtitleY - size + 4,
    size,
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

