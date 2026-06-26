/**
 * Purpose: Provide pure layout and sizing calculations for the desktop-style web shell.
 */

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
const EDGE_LABEL_FONT_SIZE = 11
const EDGE_LABEL_HEIGHT = 20
const EDGE_LABEL_PADDING_X = 20
const EDGE_LABEL_OFFSET = 15
const EDGE_LABEL_MIN_GAP = 14
const EDGE_LABEL_NODE_MIN_GAP = 12
const EDGE_LABEL_END_MARGIN_PX = 34

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
  edgeLabelSideById: Record<string, 'left' | 'right'>
}

export type AutoArrangeScope = {
  nodeIds?: string[]
  edgeIds?: string[]
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

const cubicTangentAt = (
  curve: EdgeCurve,
  progress: number,
): { x: number; y: number } => {
  const p = clamp(progress, 0, 1)
  const inverse = 1 - p
  return {
    x:
      3 * inverse ** 2 * (curve.control1.x - curve.start.x) +
      6 * inverse * p * (curve.control2.x - curve.control1.x) +
      3 * p ** 2 * (curve.end.x - curve.control2.x),
    y:
      3 * inverse ** 2 * (curve.control1.y - curve.start.y) +
      6 * inverse * p * (curve.control2.y - curve.control1.y) +
      3 * p ** 2 * (curve.end.y - curve.control2.y),
  }
}

const estimateCurveLength = (
  curve: EdgeCurve,
  segments = 28,
): number => {
  const safeSegments = Math.max(10, segments)
  let previous = cubicPointAt(curve, 0)
  let length = 0
  for (let index = 1; index <= safeSegments; index += 1) {
    const point = cubicPointAt(curve, index / safeSegments)
    length += Math.hypot(point.x - previous.x, point.y - previous.y)
    previous = point
  }
  return length
}

const normalizeVector = (vector: { x: number; y: number }): { x: number; y: number } => {
  const length = Math.hypot(vector.x, vector.y)
  if (length <= 0.0001) {
    return { x: 1, y: 0 }
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

const resolveEdgeLabelSide = (side?: string): 'left' | 'right' =>
  side === 'right' ? 'right' : 'left'

const resolveReadableDirection = (
  tangent: { x: number; y: number },
): { direction: { x: number; y: number }; angleDeg: number; isVertical: boolean } => {
  const normalized = normalizeVector(tangent)
  const isVertical = Math.abs(normalized.y) > Math.abs(normalized.x) * 1.18
  if (isVertical) {
    return {
      direction: { x: 0, y: -1 },
      angleDeg: -90,
      isVertical: true,
    }
  }
  const readable =
    normalized.x < 0
      ? {
          x: -normalized.x,
          y: -normalized.y,
        }
      : normalized
  return {
    direction: readable,
    angleDeg: (Math.atan2(readable.y, readable.x) * 180) / Math.PI,
    isVertical: false,
  }
}

const resolveLabelRect = (
  curve: EdgeCurve,
  position: number,
  side: 'left' | 'right',
  labelWidth: number,
  labelHeight: number,
): LabelRect => {
  const anchor = cubicPointAt(curve, position)
  const tangent = cubicTangentAt(curve, position)
  const readable = resolveReadableDirection(tangent)

  let leftOffset: { x: number; y: number }
  if (readable.isVertical) {
    leftOffset = { x: -1, y: 0 }
  } else if (Math.abs(readable.direction.x) >= Math.abs(readable.direction.y)) {
    leftOffset = { x: 0, y: -1 }
  } else {
    leftOffset = normalizeVector({
      x: -readable.direction.y,
      y: readable.direction.x,
    })
  }

  const sideFactor = side === 'left' ? 1 : -1
  const centerX = anchor.x + leftOffset.x * sideFactor * EDGE_LABEL_OFFSET
  const centerY = anchor.y + leftOffset.y * sideFactor * EDGE_LABEL_OFFSET
  const radians = Math.abs((readable.angleDeg * Math.PI) / 180)
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const rotatedWidth = labelWidth * cos + labelHeight * sin
  const rotatedHeight = labelWidth * sin + labelHeight * cos

  return {
    x: centerX - rotatedWidth / 2,
    y: centerY - rotatedHeight / 2,
    w: rotatedWidth,
    h: rotatedHeight,
  }
}

const resolveOverlapArea = (left: LabelRect, right: LabelRect): number => {
  const overlapX = Math.max(0, Math.min(left.x + left.w, right.x + right.w) - Math.max(left.x, right.x))
  const overlapY = Math.max(0, Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y))
  return overlapX * overlapY
}

const resolveRectGap = (left: LabelRect, right: LabelRect): number => {
  const horizontalGap = Math.max(0, Math.max(left.x, right.x) - Math.min(left.x + left.w, right.x + right.w))
  const verticalGap = Math.max(0, Math.max(left.y, right.y) - Math.min(left.y + left.h, right.y + right.h))
  return Math.hypot(horizontalGap, verticalGap)
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
  scope?: AutoArrangeScope,
): AutoArrangeResult | null => {
  const view = workspace.views[viewId]
  if (!view) {
    return null
  }

  const scopedNodeSet = scope?.nodeIds?.length ? new Set(scope.nodeIds) : null
  const scopedEdgeSet = scope?.edgeIds?.length ? new Set(scope.edgeIds) : null

  const viewNodeIds = view.nodeIds.filter((nodeId) => {
    if (!workspace.nodes[nodeId]) {
      return false
    }
    if (!scopedNodeSet) {
      return true
    }
    return scopedNodeSet.has(nodeId)
  })
  if (!viewNodeIds.length) {
    return null
  }

  const groupedBoundaryIds = new Set(
    viewNodeIds.filter((nodeId) => {
      const node = workspace.nodes[nodeId]
      return (
        node?.kind === 'boundary' &&
        node.children.some((childId) => viewNodeIds.includes(childId))
      )
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
    if (scopedEdgeSet && !scopedEdgeSet.has(edgeId)) {
      continue
    }
    const edge = workspace.edges[edgeId]
    if (!edge) {
      continue
    }
    if (!graphNodeIds.includes(edge.from.nodeId) || !graphNodeIds.includes(edge.to.nodeId)) {
      continue
    }
    const labelText = edge.protocolPresetId
      ? `${edge.label} (${edge.protocolPresetId})`
      : edge.label
    const labelWidth = Math.max(48, estimateTextWidth(labelText, EDGE_LABEL_FONT_SIZE) + EDGE_LABEL_PADDING_X)
    const minLengthByLabel = Math.ceil(labelWidth / 130)
    graph.setEdge(edge.from.nodeId, edge.to.nodeId, {
      minlen: clamp(Math.max(Math.ceil(edge.label.length / 28), minLengthByLabel), 1, 6),
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
  const edgeLabelSideById: Record<string, 'left' | 'right'> = {}
  const placedLabels: LabelRect[] = []
  for (const edgeId of view.edgeIds) {
    if (scopedEdgeSet && !scopedEdgeSet.has(edgeId)) {
      continue
    }
    const edge = workspace.edges[edgeId]
    if (!edge) {
      continue
    }
    const curve = resolveEdgeCurve(edge, arrangedNodes)
    if (!curve) {
      continue
    }

    const preferredPosition = clampLabelPosition(edge.style.labelPosition ?? 0.5)
    const preferredSide = resolveEdgeLabelSide(edge.style.labelSide)
    const labelText = edge.protocolPresetId
      ? `${edge.label} (${edge.protocolPresetId})`
      : edge.label
    const labelWidth = Math.max(42, estimateTextWidth(labelText, EDGE_LABEL_FONT_SIZE) + EDGE_LABEL_PADDING_X)
    const labelHeight = EDGE_LABEL_HEIGHT
    const curveLength = Math.max(1, estimateCurveLength(curve))
    const curveProgressPadding = (labelWidth / 2 + EDGE_LABEL_END_MARGIN_PX) / curveLength
    let minProgress = clampLabelPosition(curveProgressPadding)
    let maxProgress = clampLabelPosition(1 - curveProgressPadding)
    if (minProgress >= maxProgress) {
      minProgress = MIN_LABEL_POSITION
      maxProgress = MAX_LABEL_POSITION
    }
    const candidates = Array.from(
      new Set(
        [
          preferredPosition,
          preferredPosition - 0.16,
          preferredPosition - 0.08,
          preferredPosition - 0.04,
          preferredPosition + 0.04,
          preferredPosition + 0.08,
          preferredPosition + 0.16,
          0.2,
          0.35,
          0.5,
          0.65,
          0.8,
        ].map((value) => clamp(value, minProgress, maxProgress)),
      ),
    )
    const sideCandidates: Array<'left' | 'right'> =
      preferredSide === 'left' ? ['left', 'right'] : ['right', 'left']

    let bestPosition = preferredPosition
    let bestSide = preferredSide
    let bestRect: LabelRect | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const candidate of candidates) {
      for (const side of sideCandidates) {
        const rect = resolveLabelRect(curve, candidate, side, labelWidth, labelHeight)
        let score = Math.abs(candidate - preferredPosition) * 70
        if (side !== preferredSide) {
          score += 28
        }

        for (const placed of placedLabels) {
          const overlapArea = resolveOverlapArea(rect, placed)
          if (overlapArea > 0) {
            score += 540 + overlapArea * 0.18
            continue
          }
          const gap = resolveRectGap(rect, placed)
          if (gap < EDGE_LABEL_MIN_GAP) {
            score += (EDGE_LABEL_MIN_GAP - gap) * 24
          }
        }

        for (const nodeBounds of Object.values(nodeBoundsById)) {
          const overlapArea = resolveOverlapArea(rect, nodeBounds)
          if (overlapArea > 0) {
            score += 320 + overlapArea * 0.09
            continue
          }
          const gap = resolveRectGap(rect, nodeBounds)
          if (gap < EDGE_LABEL_NODE_MIN_GAP) {
            score += (EDGE_LABEL_NODE_MIN_GAP - gap) * 16
          }
        }

        if (score < bestScore) {
          bestScore = score
          bestPosition = candidate
          bestSide = side
          bestRect = rect
        }
      }
    }

    edgeLabelPositionById[edgeId] = bestPosition
    edgeLabelSideById[edgeId] = bestSide
    if (bestRect) {
      placedLabels.push(bestRect)
    }
  }

  return {
    nodeBoundsById,
    edgeLabelPositionById,
    edgeLabelSideById,
  }
}
