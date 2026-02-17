import dagre from '@dagrejs/dagre'
import { nearestPortId, nodeCenter, portWorldPosition } from '../engine/geometry'
import { resolveNodePorts } from '../model/nodePorts'
import type { NodeBounds, NodeModel, WorkspaceModel } from '../model/types'

const MIN_LABEL_POSITION = 0.08
const MAX_LABEL_POSITION = 0.92
const BASE_NODE_MIN_WIDTH = 160
const BASE_NODE_MIN_HEIGHT = 96
const BOUNDARY_NODE_MIN_WIDTH = 260
const BOUNDARY_NODE_MIN_HEIGHT = 170
const TITLE_FONT_SIZE = 14
const SUBTITLE_FONT_SIZE = 12
const HORIZONTAL_TEXT_PADDING = 60
const BOUNDARY_PADDING_X = 64
const BOUNDARY_PADDING_TOP = 64
const BOUNDARY_PADDING_BOTTOM = 44

type LabelRect = {
  x: number
  y: number
  w: number
  h: number
}

type EdgeCurve = {
  start: { x: number; y: number }
  control1: { x: number; y: number }
  control2: { x: number; y: number }
  end: { x: number; y: number }
}

export type AutoArrangeResult = {
  nodeBoundsById: Record<string, NodeBounds>
  edgeLabelPositionById: Record<string, number>
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const clampLabelPosition = (value: number): number =>
  clamp(value, MIN_LABEL_POSITION, MAX_LABEL_POSITION)

const estimateTextWidth = (text: string, fontSize: number): number => {
  let units = 0
  for (const character of text) {
    if (character === ' ') {
      units += 0.35
      continue
    }
    if (character === character.toUpperCase() && /[A-Z0-9]/.test(character)) {
      units += 0.68
      continue
    }
    if (/[\W_]/.test(character)) {
      units += 0.48
      continue
    }
    units += 0.56
  }
  return Math.ceil(units * fontSize)
}

const resolveNodeSize = (node: NodeModel): { w: number; h: number } => {
  const titleWidth = estimateTextWidth(node.name, TITLE_FONT_SIZE) + HORIZONTAL_TEXT_PADDING
  const subtitleWidth = node.tech?.label
    ? estimateTextWidth(node.tech.label, SUBTITLE_FONT_SIZE) + HORIZONTAL_TEXT_PADDING
    : 0
  const minWidth = node.kind === 'boundary' ? BOUNDARY_NODE_MIN_WIDTH : BASE_NODE_MIN_WIDTH
  const minHeight = node.kind === 'boundary' ? BOUNDARY_NODE_MIN_HEIGHT : BASE_NODE_MIN_HEIGHT
  const width = Math.max(node.bounds.w, minWidth, titleWidth, subtitleWidth)
  const height = Math.max(node.bounds.h, minHeight)
  return { w: width, h: height }
}

const resolveEdgeCurve = (
  edge: WorkspaceModel['edges'][string],
  nodesById: Record<string, NodeModel>,
): EdgeCurve | null => {
  const fromNode = nodesById[edge.from.nodeId]
  const toNode = nodesById[edge.to.nodeId]
  if (!fromNode || !toNode) {
    return null
  }
  const fromPortId = edge.from.portId ?? nearestPortId(fromNode, nodeCenter(toNode))
  const toPortId = edge.to.portId ?? nearestPortId(toNode, nodeCenter(fromNode))
  const start = portWorldPosition(fromNode, fromPortId)
  const end = portWorldPosition(toNode, toPortId)
  const middleX = (start.x + end.x) / 2
  return {
    start,
    control1: { x: middleX, y: start.y },
    control2: { x: middleX, y: end.y },
    end,
  }
}

const cubicPointAt = (
  curve: EdgeCurve,
  progress: number,
): { x: number; y: number } => {
  const p = clamp(progress, 0, 1)
  const inverse = 1 - p
  return {
    x:
      inverse ** 3 * curve.start.x +
      3 * inverse ** 2 * p * curve.control1.x +
      3 * inverse * p ** 2 * curve.control2.x +
      p ** 3 * curve.end.x,
    y:
      inverse ** 3 * curve.start.y +
      3 * inverse ** 2 * p * curve.control1.y +
      3 * inverse * p ** 2 * curve.control2.y +
      p ** 3 * curve.end.y,
  }
}

const resolveOverlapArea = (left: LabelRect, right: LabelRect): number => {
  const overlapX = Math.max(0, Math.min(left.x + left.w, right.x + right.w) - Math.max(left.x, right.x))
  const overlapY = Math.max(0, Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y))
  return overlapX * overlapY
}

const resolveBoundaryBoundsFromChildren = (
  childBounds: NodeBounds[],
  minWidth: number,
  minHeight: number,
): NodeBounds | null => {
  if (!childBounds.length) {
    return null
  }
  const minX = Math.min(...childBounds.map((bounds) => bounds.x))
  const minY = Math.min(...childBounds.map((bounds) => bounds.y))
  const maxX = Math.max(...childBounds.map((bounds) => bounds.x + bounds.w))
  const maxY = Math.max(...childBounds.map((bounds) => bounds.y + bounds.h))

  return {
    x: minX - BOUNDARY_PADDING_X,
    y: minY - BOUNDARY_PADDING_TOP,
    w: Math.max(minWidth, maxX - minX + BOUNDARY_PADDING_X * 2),
    h: Math.max(minHeight, maxY - minY + BOUNDARY_PADDING_TOP + BOUNDARY_PADDING_BOTTOM),
  }
}

const resolveEntryRankDirection = (kind: WorkspaceModel['views'][string]['kind']): 'LR' | 'TB' => {
  if (kind === 'component') {
    return 'TB'
  }
  return 'LR'
}

export const autoArrangeView = (
  workspace: WorkspaceModel,
  viewId: string,
): AutoArrangeResult | null => {
  const view = workspace.views[viewId]
  if (!view) {
    return null
  }

  const viewNodeIds = view.nodeIds.filter((nodeId) => Boolean(workspace.nodes[nodeId]))
  if (!viewNodeIds.length) {
    return null
  }

  const groupedBoundaryIds = new Set(
    viewNodeIds.filter((nodeId) => {
      const node = workspace.nodes[nodeId]
      return node?.kind === 'boundary' && node.children.some((childId) => viewNodeIds.includes(childId))
    }),
  )

  const graphNodeIds = viewNodeIds.filter((nodeId) => !groupedBoundaryIds.has(nodeId))
  const graph = new dagre.graphlib.Graph({ directed: true, compound: false, multigraph: false })
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: resolveEntryRankDirection(view.kind),
    nodesep: view.kind === 'hex' ? 84 : 96,
    ranksep: view.kind === 'component' ? 140 : 160,
    marginx: 72,
    marginy: 72,
  })

  for (const nodeId of graphNodeIds) {
    const node = workspace.nodes[nodeId]
    if (!node) {
      continue
    }
    const { w, h } = resolveNodeSize(node)
    graph.setNode(nodeId, { width: w, height: h })
  }

  for (const edgeId of view.edgeIds) {
    const edge = workspace.edges[edgeId]
    if (!edge) {
      continue
    }
    if (!graphNodeIds.includes(edge.from.nodeId) || !graphNodeIds.includes(edge.to.nodeId)) {
      continue
    }
    graph.setEdge(edge.from.nodeId, edge.to.nodeId, {
      minlen: clamp(Math.ceil(edge.label.length / 28), 1, 4),
      weight: 2,
    })
  }

  if (graphNodeIds.length > 0) {
    dagre.layout(graph)
  }

  const nodeBoundsById: Record<string, NodeBounds> = {}
  for (const nodeId of viewNodeIds) {
    const node = workspace.nodes[nodeId]
    if (!node) {
      continue
    }
    const layoutNode = graph.node(nodeId)
    if (!layoutNode) {
      const { w, h } = resolveNodeSize(node)
      nodeBoundsById[nodeId] = { ...node.bounds, w, h }
      continue
    }
    nodeBoundsById[nodeId] = {
      x: Math.round(layoutNode.x - layoutNode.width / 2),
      y: Math.round(layoutNode.y - layoutNode.height / 2),
      w: Math.round(layoutNode.width),
      h: Math.round(layoutNode.height),
    }
  }

  const laidOutBounds = Object.values(nodeBoundsById)
  const minLaidOutX = laidOutBounds.length ? Math.min(...laidOutBounds.map((bounds) => bounds.x)) : 0
  const minLaidOutY = laidOutBounds.length ? Math.min(...laidOutBounds.map((bounds) => bounds.y)) : 0
  const offsetX = minLaidOutX < 60 ? 60 - minLaidOutX : 0
  const offsetY = minLaidOutY < 60 ? 60 - minLaidOutY : 0
  if (offsetX || offsetY) {
    for (const bounds of Object.values(nodeBoundsById)) {
      bounds.x += offsetX
      bounds.y += offsetY
    }
  }

  for (const boundaryId of groupedBoundaryIds) {
    const boundary = workspace.nodes[boundaryId]
    if (!boundary) {
      continue
    }
    const childBounds = boundary.children
      .map((childId) => nodeBoundsById[childId])
      .filter((bounds): bounds is NodeBounds => !!bounds)
    const boundarySize = resolveNodeSize(boundary)
    const nextBounds = resolveBoundaryBoundsFromChildren(
      childBounds,
      boundarySize.w,
      boundarySize.h,
    )
    if (nextBounds) {
      nodeBoundsById[boundaryId] = nextBounds
    }
  }

  const arrangedNodes: Record<string, NodeModel> = {}
  for (const nodeId of viewNodeIds) {
    const node = workspace.nodes[nodeId]
    const bounds = nodeBoundsById[nodeId]
    if (!node || !bounds) {
      continue
    }
    arrangedNodes[nodeId] = {
      ...node,
      bounds,
      ports: resolveNodePorts(bounds),
    }
  }

  const edgeLabelPositionById: Record<string, number> = {}
  const placedLabels: LabelRect[] = []
  for (const edgeId of view.edgeIds) {
    const edge = workspace.edges[edgeId]
    if (!edge) {
      continue
    }
    const curve = resolveEdgeCurve(edge, arrangedNodes)
    if (!curve) {
      continue
    }

    const preferredPosition = clampLabelPosition(edge.style.labelPosition ?? 0.5)
    const candidates = Array.from(
      new Set([
        preferredPosition,
        0.34,
        0.5,
        0.66,
        0.24,
        0.76,
      ].map((value) => clampLabelPosition(value))),
    )
    const labelText = edge.protocolPresetId
      ? `${edge.label} (${edge.protocolPresetId})`
      : edge.label
    const labelWidth = Math.max(42, estimateTextWidth(labelText, 11) + 18)
    const labelHeight = 20

    let bestPosition = preferredPosition
    let bestRect: LabelRect | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const candidate of candidates) {
      const point = cubicPointAt(curve, candidate)
      const rect = {
        x: point.x - labelWidth / 2,
        y: point.y - labelHeight / 2,
        w: labelWidth,
        h: labelHeight,
      }
      let score = Math.abs(candidate - preferredPosition) * 60
      for (const placed of placedLabels) {
        const overlapArea = resolveOverlapArea(rect, placed)
        if (overlapArea > 0) {
          score += 220 + overlapArea * 0.06
        }
      }
      for (const nodeBounds of Object.values(nodeBoundsById)) {
        const overlapArea = resolveOverlapArea(rect, nodeBounds)
        if (overlapArea > 0) {
          score += 120 + overlapArea * 0.04
        }
      }

      if (score < bestScore) {
        bestScore = score
        bestPosition = candidate
        bestRect = rect
      }
    }

    edgeLabelPositionById[edgeId] = bestPosition
    if (bestRect) {
      placedLabels.push(bestRect)
    }
  }

  return {
    nodeBoundsById,
    edgeLabelPositionById,
  }
}
