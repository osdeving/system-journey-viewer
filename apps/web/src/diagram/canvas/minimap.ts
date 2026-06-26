/**
 * Purpose: Compute minimap geometry for the diagram canvas without coupling to React rendering.
 */

import type { NodeBounds, ViewportState } from '../../model/types'

export type MinimapSourceNode = {
  id: string
  kind: string
  bounds: NodeBounds
}

export type MinimapSize = {
  width: number
  height: number
}

export type MinimapRect = {
  x: number
  y: number
  width: number
  height: number
}

export type MinimapNodeRect = MinimapRect & {
  id: string
  kind: string
}

export type MinimapModel = {
  worldBounds: MinimapRect
  scale: number
  offsetX: number
  offsetY: number
  nodes: MinimapNodeRect[]
  viewport: MinimapRect
}

const isFinitePositive = (value: number): boolean => Number.isFinite(value) && value > 0

const unionBounds = (left: MinimapRect, right: MinimapRect): MinimapRect => {
  const minX = Math.min(left.x, right.x)
  const minY = Math.min(left.y, right.y)
  const maxX = Math.max(left.x + left.width, right.x + right.width)
  const maxY = Math.max(left.y + left.height, right.y + right.height)
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

const boundsToRect = (bounds: NodeBounds): MinimapRect => ({
  x: bounds.x,
  y: bounds.y,
  width: bounds.w,
  height: bounds.h,
})

const toMinimapRect = (rect: MinimapRect, model: Pick<MinimapModel, 'worldBounds' | 'scale' | 'offsetX' | 'offsetY'>): MinimapRect => ({
  x: model.offsetX + (rect.x - model.worldBounds.x) * model.scale,
  y: model.offsetY + (rect.y - model.worldBounds.y) * model.scale,
  width: Math.max(2, rect.width * model.scale),
  height: Math.max(2, rect.height * model.scale),
})

export const resolveMinimapModel = ({
  nodes,
  viewport,
  canvasSize,
  minimapSize,
  worldPadding = 140,
}: {
  nodes: MinimapSourceNode[]
  viewport: ViewportState
  canvasSize: MinimapSize
  minimapSize: MinimapSize
  worldPadding?: number
}): MinimapModel | null => {
  if (!nodes.length || !isFinitePositive(canvasSize.width) || !isFinitePositive(canvasSize.height)) {
    return null
  }
  if (!isFinitePositive(viewport.zoom) || !isFinitePositive(minimapSize.width) || !isFinitePositive(minimapSize.height)) {
    return null
  }

  const nodeBounds = nodes.map((node) => boundsToRect(node.bounds))
  const contentBounds = nodeBounds.reduce(unionBounds)
  const viewportWorldBounds: MinimapRect = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: canvasSize.width / viewport.zoom,
    height: canvasSize.height / viewport.zoom,
  }
  const combinedBounds = unionBounds(contentBounds, viewportWorldBounds)
  const paddedWorldBounds: MinimapRect = {
    x: combinedBounds.x - worldPadding,
    y: combinedBounds.y - worldPadding,
    width: combinedBounds.width + worldPadding * 2,
    height: combinedBounds.height + worldPadding * 2,
  }
  const scale = Math.min(
    minimapSize.width / paddedWorldBounds.width,
    minimapSize.height / paddedWorldBounds.height,
  )
  const offsetX = (minimapSize.width - paddedWorldBounds.width * scale) / 2
  const offsetY = (minimapSize.height - paddedWorldBounds.height * scale) / 2
  const transform = { worldBounds: paddedWorldBounds, scale, offsetX, offsetY }

  return {
    ...transform,
    nodes: nodes.map((node) => ({
      ...toMinimapRect(boundsToRect(node.bounds), transform),
      id: node.id,
      kind: node.kind,
    })),
    viewport: toMinimapRect(viewportWorldBounds, transform),
  }
}

export const resolveMinimapWorldPoint = (
  point: { x: number; y: number },
  model: Pick<MinimapModel, 'worldBounds' | 'scale' | 'offsetX' | 'offsetY'>,
): { x: number; y: number } => ({
  x: model.worldBounds.x + (point.x - model.offsetX) / model.scale,
  y: model.worldBounds.y + (point.y - model.offsetY) / model.scale,
})
