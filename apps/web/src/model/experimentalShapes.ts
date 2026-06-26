/**
 * Purpose: Centralize experimental freeform shape metadata and SJV exclusion helpers.
 */

import type { BasicShapeKind, EdgeModel, NodeModel, WorkspaceModel } from './types'

export type BasicShapeDefinition = {
  kind: BasicShapeKind
  label: string
  defaultWidth: number
  defaultHeight: number
  fillColor: string
  textColor: string
}

export const BASIC_SHAPE_DEFINITIONS: BasicShapeDefinition[] = [
  {
    kind: 'shape-rectangle',
    label: 'Rectangle',
    defaultWidth: 150,
    defaultHeight: 96,
    fillColor: '#f8fafc',
    textColor: '#111827',
  },
  {
    kind: 'shape-circle',
    label: 'Circle',
    defaultWidth: 126,
    defaultHeight: 126,
    fillColor: '#e0f2fe',
    textColor: '#0f172a',
  },
  {
    kind: 'shape-triangle',
    label: 'Triangle',
    defaultWidth: 144,
    defaultHeight: 124,
    fillColor: '#fef3c7',
    textColor: '#111827',
  },
  {
    kind: 'shape-diamond',
    label: 'Diamond',
    defaultWidth: 136,
    defaultHeight: 136,
    fillColor: '#dcfce7',
    textColor: '#052e16',
  },
]

const BASIC_SHAPE_KIND_SET = new Set<BasicShapeKind>(
  BASIC_SHAPE_DEFINITIONS.map((shape) => shape.kind),
)

export const isExperimentalShapeKind = (kind: string): kind is BasicShapeKind =>
  BASIC_SHAPE_KIND_SET.has(kind as BasicShapeKind)

export const isExperimentalShapeNode = (
  node: Pick<NodeModel, 'kind'> | null | undefined,
): boolean => Boolean(node && isExperimentalShapeKind(node.kind))

export const resolveBasicShapeDefinition = (
  kind: BasicShapeKind,
): BasicShapeDefinition =>
  BASIC_SHAPE_DEFINITIONS.find((shape) => shape.kind === kind) ??
  BASIC_SHAPE_DEFINITIONS[0]

export const isSJVScriptNode = (node: Pick<NodeModel, 'kind'> | null | undefined): boolean =>
  !isExperimentalShapeNode(node)

export const isSJVScriptEdge = (
  edge: EdgeModel | null | undefined,
  nodes: WorkspaceModel['nodes'],
): boolean => {
  if (!edge) {
    return false
  }
  return isSJVScriptNode(nodes[edge.from.nodeId]) && isSJVScriptNode(nodes[edge.to.nodeId])
}
