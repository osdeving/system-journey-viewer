/**
 * Purpose: Normalize marquee selection rectangles and resolve which nodes intersect them.
 */

import type { Point } from '../../engine/geometry'
import type { NodeBounds, NodeModel } from '../../model/types'

export const resolveMarqueeSelectionRect = (
  start: Point,
  current: Point,
): NodeBounds => ({
  x: Math.min(start.x, current.x),
  y: Math.min(start.y, current.y),
  w: Math.abs(current.x - start.x),
  h: Math.abs(current.y - start.y),
})

const rectsIntersect = (left: NodeBounds, right: NodeBounds): boolean =>
  left.x < right.x + right.w &&
  left.x + left.w > right.x &&
  left.y < right.y + right.h &&
  left.y + left.h > right.y

export const resolveNodeIdsIntersectingMarquee = (
  nodes: NodeModel[],
  marqueeRect: NodeBounds,
): string[] =>
  marqueeRect.w <= 0 || marqueeRect.h <= 0
    ? []
    :
  nodes
    .filter((node) => rectsIntersect(node.bounds, marqueeRect))
    .map((node) => node.id)
