/**
 * Purpose: Provide editor engine helpers for canvas interactions, hit-testing, and connector placement.
 */

import type { NodeBounds, NodeModel } from '../model/types'

export const DEFAULT_GRID_SIZE = 20
const DEFAULT_SNAP_THRESHOLD = 10

export interface Point {
  x: number
  y: number
}

export const nodeCenter = (node: NodeModel): Point => ({
  x: node.bounds.x + node.bounds.w / 2,
  y: node.bounds.y + node.bounds.h / 2,
})

export const portWorldPosition = (node: NodeModel, portId?: string): Point => {
  if (!portId) {
    return nodeCenter(node)
  }
  const port = node.ports.find((candidate) => candidate.id === portId)
  if (!port) {
    return nodeCenter(node)
  }
  return {
    x: node.bounds.x + node.bounds.w * port.x,
    y: node.bounds.y + node.bounds.h * port.y,
  }
}

export const nearestPortId = (node: NodeModel, target: Point): string | undefined => {
  if (!node.ports.length) {
    return undefined
  }
  let nearest = node.ports[0]
  let minDistance = Number.POSITIVE_INFINITY
  for (const port of node.ports) {
    const px = node.bounds.x + node.bounds.w * port.x
    const py = node.bounds.y + node.bounds.h * port.y
    const distance = Math.hypot(target.x - px, target.y - py)
    if (distance < minDistance) {
      minDistance = distance
      nearest = port
    }
  }
  return nearest.id
}

export const snapToGrid = (value: number, gridSize: number): number =>
  Math.round(value / gridSize) * gridSize

const getCandidates = (bounds: NodeBounds): number[] => [
  bounds.x,
  bounds.x + bounds.w / 2,
  bounds.x + bounds.w,
]

const getCandidatesY = (bounds: NodeBounds): number[] => [
  bounds.y,
  bounds.y + bounds.h / 2,
  bounds.y + bounds.h,
]

export const snapBounds = (
  input: NodeBounds,
  nodeId: string,
  nodes: Record<string, NodeModel>,
  options?: {
    gridSize?: number
    snapGrid?: boolean
    snapShapes?: boolean
    threshold?: number
  },
): NodeBounds => {
  const gridSize = options?.gridSize ?? DEFAULT_GRID_SIZE
  const threshold = options?.threshold ?? DEFAULT_SNAP_THRESHOLD
  const snapGridEnabled = options?.snapGrid ?? true
  const snapShapeEnabled = options?.snapShapes ?? true

  const snapped: NodeBounds = { ...input }
  if (snapGridEnabled) {
    snapped.x = snapToGrid(snapped.x, gridSize)
    snapped.y = snapToGrid(snapped.y, gridSize)
    snapped.w = Math.max(gridSize * 2, snapToGrid(snapped.w, gridSize))
    snapped.h = Math.max(gridSize * 2, snapToGrid(snapped.h, gridSize))
  }

  if (!snapShapeEnabled) {
    return snapped
  }

  const ownX = getCandidates(snapped)
  const ownY = getCandidatesY(snapped)

  for (const candidate of Object.values(nodes)) {
    if (candidate.id === nodeId) {
      continue
    }
    const candidateX = getCandidates(candidate.bounds)
    const candidateY = getCandidatesY(candidate.bounds)

    for (const own of ownX) {
      for (const other of candidateX) {
        const diff = other - own
        if (Math.abs(diff) <= threshold) {
          snapped.x += diff
          ownX[0] += diff
          ownX[1] += diff
          ownX[2] += diff
          break
        }
      }
    }
    for (const own of ownY) {
      for (const other of candidateY) {
        const diff = other - own
        if (Math.abs(diff) <= threshold) {
          snapped.y += diff
          ownY[0] += diff
          ownY[1] += diff
          ownY[2] += diff
          break
        }
      }
    }
  }

  return snapped
}
