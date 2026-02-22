/**
 * Purpose: Implement editor state management, persistence, and store utilities.
 */

import { resolveNodePorts } from '../model/nodePorts'
import type { NodeBounds, WorkspaceModel } from '../model/types'

const LAYOUT_STORAGE_VERSION = 'v1'
const MIN_EDGE_LABEL_POSITION = 0.08
const MAX_EDGE_LABEL_POSITION = 0.92
const MIN_EDGE_LABEL_ANGLE_DEG = -180
const MAX_EDGE_LABEL_ANGLE_DEG = 180
const MIN_EDGE_LABEL_FONT_SIZE = 1
const MAX_EDGE_LABEL_FONT_SIZE = 64

type LayoutViewSnapshot = {
  nodes: Record<string, NodeBounds>
  nodeFillColors: Record<string, string>
  nodeTextColors: Record<string, string>
  edgeLabelPositions: Record<string, number>
  edgeLabelSides: Record<string, 'left' | 'right'>
  edgeLabelFontSizes: Record<string, number>
  edgeLabelAngles: Record<string, number>
}

type WorkspaceLayoutSnapshot = {
  version: typeof LAYOUT_STORAGE_VERSION
  workspaceId: string
  views: Record<string, LayoutViewSnapshot>
}

export const layoutStorageKey = (workspaceId: string): string =>
  `sjv:layout:${workspaceId}:${LAYOUT_STORAGE_VERSION}`

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage

const clampLabelPosition = (position: number): number =>
  Math.min(MAX_EDGE_LABEL_POSITION, Math.max(MIN_EDGE_LABEL_POSITION, position))

const clampLabelAngle = (angleDeg: number): number =>
  Math.min(MAX_EDGE_LABEL_ANGLE_DEG, Math.max(MIN_EDGE_LABEL_ANGLE_DEG, angleDeg))

const clampLabelFontSize = (fontSize: number): number =>
  Math.min(MAX_EDGE_LABEL_FONT_SIZE, Math.max(MIN_EDGE_LABEL_FONT_SIZE, fontSize))

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const resolveLabelSide = (value: unknown): 'left' | 'right' =>
  value === 'right' ? 'right' : 'left'

const safeParseLayoutSnapshot = (payload: string): WorkspaceLayoutSnapshot | null => {
  try {
    const parsed = JSON.parse(payload) as WorkspaceLayoutSnapshot
    if (
      !parsed ||
      parsed.version !== LAYOUT_STORAGE_VERSION ||
      typeof parsed.workspaceId !== 'string' ||
      typeof parsed.views !== 'object'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const buildWorkspaceLayoutSnapshot = (
  workspace: WorkspaceModel,
): WorkspaceLayoutSnapshot => {
  const views: Record<string, LayoutViewSnapshot> = {}
  for (const view of Object.values(workspace.views)) {
    const nodes: Record<string, NodeBounds> = {}
    const nodeFillColors: Record<string, string> = {}
    const nodeTextColors: Record<string, string> = {}
    const edgeLabelPositions: Record<string, number> = {}
    const edgeLabelSides: Record<string, 'left' | 'right'> = {}
    const edgeLabelFontSizes: Record<string, number> = {}
    const edgeLabelAngles: Record<string, number> = {}

    for (const nodeId of view.nodeIds) {
      const node = workspace.nodes[nodeId]
      if (!node) {
        continue
      }
      nodes[nodeId] = { ...node.bounds }
      if (isNonEmptyString(node.style?.fillColor)) {
        nodeFillColors[nodeId] = node.style.fillColor.trim()
      }
      if (isNonEmptyString(node.style?.textColor)) {
        nodeTextColors[nodeId] = node.style.textColor.trim()
      }
    }

    for (const edgeId of view.edgeIds) {
      const edge = workspace.edges[edgeId]
      if (!edge) {
        continue
      }
      edgeLabelPositions[edgeId] = clampLabelPosition(edge.style.labelPosition ?? 0.5)
      edgeLabelSides[edgeId] = resolveLabelSide(edge.style.labelSide)
      if (isFiniteNumber(edge.style.labelFontSize)) {
        edgeLabelFontSizes[edgeId] = clampLabelFontSize(edge.style.labelFontSize)
      }
      edgeLabelAngles[edgeId] = clampLabelAngle(edge.style.labelAngle ?? 0)
    }

    views[view.id] = {
      nodes,
      nodeFillColors,
      nodeTextColors,
      edgeLabelPositions,
      edgeLabelSides,
      edgeLabelFontSizes,
      edgeLabelAngles,
    }
  }

  return {
    version: LAYOUT_STORAGE_VERSION,
    workspaceId: workspace.workspace.id,
    views,
  }
}

export const saveWorkspaceLayout = (
  workspace: WorkspaceModel,
  storage?: Pick<Storage, 'setItem'>,
): void => {
  const target = storage ?? (canUseStorage() ? window.localStorage : undefined)
  if (!target) {
    return
  }
  const snapshot = buildWorkspaceLayoutSnapshot(workspace)
  target.setItem(layoutStorageKey(workspace.workspace.id), JSON.stringify(snapshot))
}

export const loadWorkspaceLayout = (
  workspaceId: string,
  storage?: Pick<Storage, 'getItem'>,
): WorkspaceLayoutSnapshot | null => {
  const source = storage ?? (canUseStorage() ? window.localStorage : undefined)
  if (!source) {
    return null
  }
  const payload = source.getItem(layoutStorageKey(workspaceId))
  if (!payload) {
    return null
  }
  return safeParseLayoutSnapshot(payload)
}

export const applyWorkspaceLayout = (
  workspace: WorkspaceModel,
  snapshot: WorkspaceLayoutSnapshot | null,
): WorkspaceModel => {
  if (!snapshot || snapshot.workspaceId !== workspace.workspace.id) {
    return workspace
  }

  const nextWorkspace: WorkspaceModel = {
    ...workspace,
    views: { ...workspace.views },
    nodes: { ...workspace.nodes },
    edges: { ...workspace.edges },
    settings: {
      ...workspace.settings,
      journeyFocus: {
        ...workspace.settings.journeyFocus,
      },
    },
  }

  for (const [viewId, viewLayout] of Object.entries(snapshot.views)) {
    const view = nextWorkspace.views[viewId]
    if (!view) {
      continue
    }

    const nodeIdsInView = new Set(view.nodeIds)
    for (const [nodeId, bounds] of Object.entries(viewLayout.nodes ?? {})) {
      if (!nodeIdsInView.has(nodeId)) {
        continue
      }
      const node = nextWorkspace.nodes[nodeId]
      if (!node) {
        continue
      }
      if (
        !isFiniteNumber(bounds.x) ||
        !isFiniteNumber(bounds.y) ||
        !isFiniteNumber(bounds.w) ||
        !isFiniteNumber(bounds.h)
      ) {
        continue
      }
      const nextBounds = {
        x: bounds.x,
        y: bounds.y,
        w: Math.max(80, bounds.w),
        h: Math.max(80, bounds.h),
      }
      nextWorkspace.nodes[nodeId] = {
        ...node,
        style:
          isNonEmptyString(viewLayout.nodeFillColors?.[nodeId]) || isNonEmptyString(viewLayout.nodeTextColors?.[nodeId])
            ? {
                ...node.style,
                ...(isNonEmptyString(viewLayout.nodeFillColors?.[nodeId])
                  ? { fillColor: viewLayout.nodeFillColors[nodeId] }
                  : {}),
                ...(isNonEmptyString(viewLayout.nodeTextColors?.[nodeId])
                  ? { textColor: viewLayout.nodeTextColors[nodeId] }
                  : {}),
              }
            : node.style,
        bounds: nextBounds,
        ports: resolveNodePorts(nextBounds),
      }
    }

    const edgeIdsInView = new Set(view.edgeIds)
    for (const [edgeId, labelPosition] of Object.entries(viewLayout.edgeLabelPositions ?? {})) {
      if (!edgeIdsInView.has(edgeId)) {
        continue
      }
      const edge = nextWorkspace.edges[edgeId]
      if (!edge || !isFiniteNumber(labelPosition)) {
        continue
      }
      nextWorkspace.edges[edgeId] = {
        ...edge,
        style: {
          ...edge.style,
          labelPosition: clampLabelPosition(labelPosition),
          labelSide: resolveLabelSide(viewLayout.edgeLabelSides?.[edgeId]),
          labelFontSize: isFiniteNumber(viewLayout.edgeLabelFontSizes?.[edgeId])
            ? clampLabelFontSize(viewLayout.edgeLabelFontSizes[edgeId])
            : edge.style.labelFontSize,
          labelAngle: isFiniteNumber(viewLayout.edgeLabelAngles?.[edgeId])
            ? clampLabelAngle(viewLayout.edgeLabelAngles[edgeId])
            : edge.style.labelAngle,
        },
      }
    }
  }

  return nextWorkspace
}
