/**
 * Purpose: Provide editor engine helpers for canvas interactions, hit-testing, and connector placement.
 */

import { nearestPortId, nodeCenter, portWorldPosition } from './geometry'
import type { EdgeModel, NodeModel } from '../model/types'

type Vector = { x: number; y: number }

export type ResolvedEdgeCurve = {
  start: Vector
  control1: Vector
  control2: Vector
  end: Vector
  fromPortId?: string
  toPortId?: string
}

const resolveAxisDirection = (x: number, y: number): Vector => {
  if (Math.abs(x) < 0.0001 && Math.abs(y) < 0.0001) {
    return { x: 1, y: 0 }
  }
  if (Math.abs(x) >= Math.abs(y)) {
    return { x: x >= 0 ? 1 : -1, y: 0 }
  }
  return { x: 0, y: y >= 0 ? 1 : -1 }
}

const resolvePortOutwardDirection = (
  node: NodeModel,
  portId: string | undefined,
  fallbackPoint: Vector,
): Vector => {
  const port = portId ? node.ports.find((candidate) => candidate.id === portId) : undefined
  if (port) {
    const relativeX = port.x - 0.5
    const relativeY = port.y - 0.5
    if (Math.abs(relativeX) > 0.0001 || Math.abs(relativeY) > 0.0001) {
      return resolveAxisDirection(relativeX, relativeY)
    }
  }
  const center = nodeCenter(node)
  return resolveAxisDirection(fallbackPoint.x - center.x, fallbackPoint.y - center.y)
}

export const resolveEdgeCurve = (
  edge: EdgeModel,
  nodes: Record<string, NodeModel>,
): ResolvedEdgeCurve | null => {
  const from = nodes[edge.from.nodeId]
  const to = nodes[edge.to.nodeId]
  if (!from || !to) {
    return null
  }

  const fromPortId = edge.from.portId ?? nearestPortId(from, nodeCenter(to))
  const toPortId = edge.to.portId ?? nearestPortId(to, nodeCenter(from))
  const start = portWorldPosition(from, fromPortId)
  const end = portWorldPosition(to, toPortId)

  const fromOutwardDirection = resolvePortOutwardDirection(from, fromPortId, end)
  const toOutwardDirection = resolvePortOutwardDirection(to, toPortId, start)

  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const handleDistance = Math.max(16, Math.min(120, distance * 0.45))

  return {
    start,
    control1: {
      x: start.x + fromOutwardDirection.x * handleDistance,
      y: start.y + fromOutwardDirection.y * handleDistance,
    },
    control2: {
      x: end.x + toOutwardDirection.x * handleDistance,
      y: end.y + toOutwardDirection.y * handleDistance,
    },
    end,
    fromPortId,
    toPortId,
  }
}
