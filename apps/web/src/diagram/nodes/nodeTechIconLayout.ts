/**
 * Purpose: Keep UI-only node technology icons positioned and sized inside node bounds.
 */

import type { NodeBounds, NodeModel } from '../../model/types'
import type { NodeLabelLayout } from './nodeLabelLayout'
import { estimateCanvasTextWidth, resolveNodeLabelLayout } from './nodeLabelLayout'
import {
  resolveDbCylinderShape,
  resolveQueueCylinderShape,
} from './nodeShapePaths'

export type NodeTechIconPlacement = {
  x: number
  y: number
  size: number
}

export type NodeTechIconDefaultShapeKind =
  | 'rectangle'
  | 'hexagon'
  | 'queue-cylinder'
  | 'db-cylinder'

type IconSafeRect = {
  left: number
  top: number
  right: number
  bottom: number
}

type TextCollisionBox = {
  left: number
  top: number
  right: number
  bottom: number
}

export const DEFAULT_NODE_TECH_ICON_SIZE = 24
export const PREFERRED_NODE_TECH_ICON_SIZE = 128
export const MIN_NODE_TECH_ICON_SIZE = 14
export const NODE_TECH_ICON_PADDING = 4
const NODE_TECH_ICON_TEXT_CLEARANCE = 6
const NODE_TECH_ICON_TEXT_COLLISION_WIDTH_RATIO = 0.82
const NODE_TECH_ICON_HEIGHT_RATIO = 0.78
const HEX_NODE_TECH_ICON_TEXT_GAP = 3
const HEX_NODE_TECH_ICON_TEXT_CLEARANCE = 1
const NODE_TECH_ICON_SEARCH_STEP = 1
const NODE_TECH_ICON_CENTER_FALLBACK_RATIO = 0.7
const NODE_TECH_ICON_RECT_TEXT_GAP_X = 10
const NODE_TECH_ICON_RECT_TEXT_GAP_Y = 10
const NODE_TECH_ICON_RECT_MIN_USEFUL_SIZE = DEFAULT_NODE_TECH_ICON_SIZE * 2.25

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

const safeRectWidth = (rect: IconSafeRect): number => Math.max(0, rect.right - rect.left)
const safeRectHeight = (rect: IconSafeRect): number => Math.max(0, rect.bottom - rect.top)

const resolveTextBox = (
  text: string | undefined,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  textAnchor: 'start' | 'middle',
  widthRatio = NODE_TECH_ICON_TEXT_COLLISION_WIDTH_RATIO,
): TextCollisionBox | null => {
  const value = text?.trim()
  if (!value) {
    return null
  }
  const width =
    Math.min(maxWidth, estimateCanvasTextWidth(value, fontSize)) * widthRatio
  const left = textAnchor === 'middle' ? x - width / 2 : x
  return {
    left,
    top: y - fontSize,
    right: left + width,
    bottom: y + 2,
  }
}

const resolveTextCollisionBoxes = (
  labelLayout: NodeLabelLayout,
  subtitle: string,
  title?: string,
  widthRatio = NODE_TECH_ICON_TEXT_COLLISION_WIDTH_RATIO,
): TextCollisionBox[] =>
  [
    resolveTextBox(
      title,
      labelLayout.titleX,
      labelLayout.titleY,
      labelLayout.maxTitleWidth,
      14,
      labelLayout.textAnchor,
      widthRatio,
    ),
    resolveTextBox(
      subtitle,
      labelLayout.subtitleX,
      labelLayout.subtitleY,
      labelLayout.maxSubtitleWidth,
      12,
      labelLayout.textAnchor,
      widthRatio,
    ),
  ].filter((box): box is TextCollisionBox => Boolean(box))

const overlapsText = (
  placement: NodeTechIconPlacement,
  textBoxes: TextCollisionBox[],
  clearance = NODE_TECH_ICON_TEXT_CLEARANCE,
): boolean =>
  textBoxes.some((box) => {
    const iconLeft = placement.x
    const iconTop = placement.y
    const iconRight = placement.x + placement.size
    const iconBottom = placement.y + placement.size
    return !(
      iconRight <= box.left - clearance ||
      iconLeft >= box.right + clearance ||
      iconBottom <= box.top - clearance ||
      iconTop >= box.bottom + clearance
    )
  })

const resolveDefaultSizeLimit = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  safeRect: IconSafeRect,
): number =>
  Math.min(
    PREFERRED_NODE_TECH_ICON_SIZE,
    resolveNodeTechIconMaxSize(bounds),
    safeRectWidth(safeRect),
    safeRectHeight(safeRect),
    Math.max(DEFAULT_NODE_TECH_ICON_SIZE, bounds.h * NODE_TECH_ICON_HEIGHT_RATIO),
  )

const resolveTextBlockRect = (
  labelLayout: NodeLabelLayout,
  subtitle: string,
  title?: string,
  widthRatio = NODE_TECH_ICON_TEXT_COLLISION_WIDTH_RATIO,
): IconSafeRect => {
  const textBoxes = resolveTextCollisionBoxes(labelLayout, subtitle, title, widthRatio)
  if (!textBoxes.length) {
    return {
      left: labelLayout.titleX,
      top: labelLayout.titleY,
      right: labelLayout.titleX,
      bottom: labelLayout.titleY,
    }
  }
  return {
    left: Math.min(...textBoxes.map((box) => box.left)),
    top: Math.min(...textBoxes.map((box) => box.top)),
    right: Math.max(...textBoxes.map((box) => box.right)),
    bottom: Math.max(...textBoxes.map((box) => box.bottom)),
  }
}

const resolveRectangleCenteredBelowTextPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  textBlock: IconSafeRect,
): NodeTechIconPlacement => {
  const safeLeft = NODE_TECH_ICON_PADDING
  const safeRight = bounds.w - NODE_TECH_ICON_PADDING
  const safeBottom = bounds.h - NODE_TECH_ICON_PADDING
  const top = Math.min(
    safeBottom - MIN_NODE_TECH_ICON_SIZE,
    Math.max(NODE_TECH_ICON_PADDING, textBlock.bottom + NODE_TECH_ICON_RECT_TEXT_GAP_Y),
  )
  const size = Math.max(
    MIN_NODE_TECH_ICON_SIZE,
    Math.min(
      resolveNodeTechIconMaxSize(bounds),
      safeRight - safeLeft,
      safeBottom - top,
    ),
  )

  return clampNodeTechIconPlacement(bounds, {
    x: safeLeft + (safeRight - safeLeft - size) / 2,
    y: safeBottom - size,
    size,
  })
}

const resolveRectanglePlacementFromTextBlock = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  labelLayout: NodeLabelLayout,
  subtitle: string,
  title?: string,
): NodeTechIconPlacement => {
  const textBlock = resolveTextBlockRect(labelLayout, subtitle, title, 1)
  const safeRight = bounds.w - NODE_TECH_ICON_PADDING
  const safeBottom = bounds.h - NODE_TECH_ICON_PADDING
  const maxSize = resolveNodeTechIconMaxSize(bounds)
  const textBoxes = resolveTextCollisionBoxes(labelLayout, subtitle, title, 1)

  for (let size = maxSize; size >= MIN_NODE_TECH_ICON_SIZE; size -= NODE_TECH_ICON_SEARCH_STEP) {
    const placement = {
      x: safeRight - size,
      y: safeBottom - size,
      size,
    }
    if (!overlapsText(placement, textBoxes, NODE_TECH_ICON_RECT_TEXT_GAP_X)) {
      if (size < Math.min(NODE_TECH_ICON_RECT_MIN_USEFUL_SIZE, maxSize)) {
        const centeredPlacement = resolveRectangleCenteredBelowTextPlacement(bounds, textBlock)
        if (centeredPlacement.size >= size) {
          return centeredPlacement
        }
      }
      return clampNodeTechIconPlacement(bounds, placement)
    }
  }

  return resolveRectangleCenteredBelowTextPlacement(bounds, textBlock)
}

const resolveShapeSafeRect = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  shapeKind: NodeTechIconDefaultShapeKind,
): IconSafeRect => {
  if (shapeKind === 'queue-cylinder') {
    const shape = resolveQueueCylinderShape(bounds.w, bounds.h)
    return {
      left: shape.capRx + NODE_TECH_ICON_PADDING,
      top: NODE_TECH_ICON_PADDING,
      right: bounds.w - shape.capRx - NODE_TECH_ICON_PADDING,
      bottom: bounds.h - NODE_TECH_ICON_PADDING,
    }
  }
  if (shapeKind === 'db-cylinder') {
    const shape = resolveDbCylinderShape(bounds.w, bounds.h)
    return {
      left: NODE_TECH_ICON_PADDING,
      top: shape.capRy + NODE_TECH_ICON_PADDING,
      right: bounds.w - NODE_TECH_ICON_PADDING,
      bottom: bounds.h - shape.capRy - NODE_TECH_ICON_PADDING,
    }
  }
  return {
    left: NODE_TECH_ICON_PADDING,
    top: NODE_TECH_ICON_PADDING,
    right: bounds.w - NODE_TECH_ICON_PADDING,
    bottom: bounds.h - NODE_TECH_ICON_PADDING,
  }
}

const resolveBottomRightPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  safeRect: IconSafeRect,
  textBoxes: TextCollisionBox[],
  centerWhenConstrained: boolean,
): NodeTechIconPlacement => {
  const maxSize = resolveDefaultSizeLimit(bounds, safeRect)
  for (let size = maxSize; size >= MIN_NODE_TECH_ICON_SIZE; size -= NODE_TECH_ICON_SEARCH_STEP) {
    const placement = {
      x: safeRect.right - size,
      y: safeRect.bottom - size,
      size,
    }
    if (!overlapsText(placement, textBoxes)) {
      if (centerWhenConstrained && size < maxSize * NODE_TECH_ICON_CENTER_FALLBACK_RATIO) {
        return resolveCenteredBelowTextPlacement(bounds, safeRect, textBoxes, maxSize)
      }
      return clampNodeTechIconPlacement(bounds, placement)
    }
  }

  return resolveCenteredBelowTextPlacement(bounds, safeRect, textBoxes, maxSize)
}

const resolveCenteredBelowTextPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  safeRect: IconSafeRect,
  textBoxes: TextCollisionBox[],
  maxSize: number,
): NodeTechIconPlacement => {
  const lastTextBottom = Math.max(
    safeRect.top,
    ...textBoxes.map((box) => box.bottom + NODE_TECH_ICON_TEXT_CLEARANCE),
  )
  const fallbackTop = Math.min(
    safeRect.bottom - MIN_NODE_TECH_ICON_SIZE,
    Math.max(safeRect.top, lastTextBottom),
  )
  const fallbackSize = Math.min(
    maxSize,
    safeRect.bottom - fallbackTop,
    safeRectWidth(safeRect),
  )
  return clampNodeTechIconPlacement(bounds, {
    x: safeRect.left + (safeRectWidth(safeRect) - fallbackSize) / 2,
    y: fallbackTop,
    size: Math.max(MIN_NODE_TECH_ICON_SIZE, fallbackSize),
  })
}

const resolveHexagonHorizontalInset = (width: number): number => {
  const safeWidth = Math.max(1, width)
  return Math.min(
    Math.max(safeWidth * 0.25, 6),
    Math.max(6, safeWidth / 2 - 0.5),
  )
}

const resolveHexagonXRangeAtY = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  y: number,
): { left: number; right: number } => {
  const centerY = bounds.h / 2
  const horizontalInset = resolveHexagonHorizontalInset(bounds.w)
  const clampedY = Math.min(bounds.h, Math.max(0, y))
  const left =
    clampedY <= centerY
      ? horizontalInset * (1 - clampedY / Math.max(1, centerY))
      : horizontalInset * ((clampedY - centerY) / Math.max(1, centerY))
  return {
    left: left + NODE_TECH_ICON_PADDING,
    right: bounds.w - left - NODE_TECH_ICON_PADDING,
  }
}

const hexagonContainsSquare = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  placement: NodeTechIconPlacement,
): boolean =>
  [placement.y, placement.y + placement.size].every((y) => {
    const range = resolveHexagonXRangeAtY(bounds, y)
    return placement.x >= range.left && placement.x + placement.size <= range.right
  })

const resolveHexagonPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  labelLayout: NodeLabelLayout,
  textBoxes: TextCollisionBox[],
): NodeTechIconPlacement => {
  const safeRect = resolveShapeSafeRect(bounds, 'rectangle')
  const maxSize = resolveDefaultSizeLimit(bounds, safeRect)
  const minTop = Math.max(
    NODE_TECH_ICON_PADDING,
    labelLayout.subtitleY + HEX_NODE_TECH_ICON_TEXT_GAP,
    ...textBoxes.map((box) => box.bottom + HEX_NODE_TECH_ICON_TEXT_CLEARANCE),
  )

  for (let size = maxSize; size >= MIN_NODE_TECH_ICON_SIZE; size -= NODE_TECH_ICON_SEARCH_STEP) {
    const x = (bounds.w - size) / 2
    for (
      let y = bounds.h - NODE_TECH_ICON_PADDING - size;
      y >= minTop;
      y -= NODE_TECH_ICON_SEARCH_STEP
    ) {
      const placement = { x, y, size }
      if (
        hexagonContainsSquare(bounds, placement) &&
        !overlapsText(placement, textBoxes, HEX_NODE_TECH_ICON_TEXT_CLEARANCE)
      ) {
        return clampNodeTechIconPlacement(bounds, placement)
      }
    }
  }

  const fallbackSize = Math.min(
    DEFAULT_NODE_TECH_ICON_SIZE,
    resolveNodeTechIconMaxSize(bounds),
  )
  return clampNodeTechIconPlacement(bounds, {
    x: (bounds.w - fallbackSize) / 2,
    y: Math.max(minTop, bounds.h / 2),
    size: fallbackSize,
  })
}

export const resolveDefaultNodeTechIconPlacement = (
  bounds: Pick<NodeBounds, 'w' | 'h'>,
  labelLayout: NodeLabelLayout,
  subtitle: string,
  options: {
    shapeKind?: NodeTechIconDefaultShapeKind
    title?: string
  } = {},
): NodeTechIconPlacement => {
  const shapeKind = options.shapeKind ?? 'rectangle'
  if (shapeKind === 'rectangle') {
    return resolveRectanglePlacementFromTextBlock(
      bounds,
      labelLayout,
      subtitle,
      options.title,
    )
  }
  const textBoxes = resolveTextCollisionBoxes(labelLayout, subtitle, options.title)
  if (shapeKind === 'hexagon') {
    return resolveHexagonPlacement(bounds, labelLayout, textBoxes)
  }
  return resolveBottomRightPlacement(
    bounds,
    resolveShapeSafeRect(bounds, shapeKind),
    textBoxes,
    false,
  )
}

export const resolveDefaultNodeTechIconShapeKind = (
  node: Pick<NodeModel, 'kind'>,
): NodeTechIconDefaultShapeKind => {
  if (
    node.kind === 'gateway' ||
    node.kind === 'security' ||
    node.kind === 'load-balancer'
  ) {
    return 'hexagon'
  }
  if (node.kind === 'queue') {
    return 'queue-cylinder'
  }
  if (node.kind === 'db') {
    return 'db-cylinder'
  }
  return 'rectangle'
}

export const resolveDefaultNodeTechIconPlacementForNode = (
  node: Pick<NodeModel, 'kind' | 'bounds' | 'name' | 'tech'>,
): NodeTechIconPlacement => {
  const shapeKind = resolveDefaultNodeTechIconShapeKind(node)
  const labelLayout = resolveNodeLabelLayout(node, shapeKind === 'hexagon')
  return resolveDefaultNodeTechIconPlacement(
    node.bounds,
    labelLayout,
    node.tech?.label ?? node.kind,
    { shapeKind, title: node.name },
  )
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
