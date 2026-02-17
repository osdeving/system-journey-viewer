import type { WorkspaceModel } from '../model/types'

export type JourneyFocusScope = {
  edgeIds: Set<string>
  nodeIds: Set<string>
}

const sortByStepOrder = <T extends { n: number }>(steps: T[]): T[] =>
  steps.slice().sort((left, right) => left.n - right.n)

const addBoundaryParents = (
  workspace: WorkspaceModel,
  view: WorkspaceModel['views'][string],
  nodeIds: Set<string>,
): void => {
  let changed = true
  while (changed) {
    changed = false
    for (const nodeId of view.nodeIds) {
      const node = workspace.nodes[nodeId]
      if (!node || node.kind !== 'boundary') {
        continue
      }
      if (nodeIds.has(nodeId)) {
        continue
      }
      if (!node.children.some((childId) => nodeIds.has(childId))) {
        continue
      }
      nodeIds.add(nodeId)
      changed = true
    }
  }
}

export const resolveJourneyFocusScope = (
  workspace: WorkspaceModel,
  viewId: string,
  journeyId: string | null | undefined,
): JourneyFocusScope | null => {
  if (!journeyId) {
    return null
  }
  const view = workspace.views[viewId]
  const journey = workspace.journeys[journeyId]
  if (!view || !journey) {
    return null
  }

  const edgeIdsInView = new Set(view.edgeIds)
  const nodeIdsInView = new Set(view.nodeIds)
  const focusedEdgeIds = new Set<string>()
  const focusedNodeIds = new Set<string>()

  for (const step of sortByStepOrder(journey.steps)) {
    if (!edgeIdsInView.has(step.edgeId)) {
      continue
    }
    const edge = workspace.edges[step.edgeId]
    if (!edge) {
      continue
    }
    focusedEdgeIds.add(edge.id)
    if (nodeIdsInView.has(edge.from.nodeId)) {
      focusedNodeIds.add(edge.from.nodeId)
    }
    if (nodeIdsInView.has(edge.to.nodeId)) {
      focusedNodeIds.add(edge.to.nodeId)
    }
    for (const highlightNodeId of step.highlightNodes ?? []) {
      if (nodeIdsInView.has(highlightNodeId)) {
        focusedNodeIds.add(highlightNodeId)
      }
    }
  }

  if (!focusedEdgeIds.size) {
    return null
  }

  addBoundaryParents(workspace, view, focusedNodeIds)

  return {
    edgeIds: focusedEdgeIds,
    nodeIds: focusedNodeIds,
  }
}
