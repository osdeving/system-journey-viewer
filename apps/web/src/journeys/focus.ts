/**
 * Purpose: Provide journey-specific focus logic (including threaded journey branches) for canvas filtering.
 */

import type { JourneyStep, WorkspaceModel } from '../model/types'

export type JourneyFocusScope = {
  edgeIds: Set<string>
  nodeIds: Set<string>
}

const sortByStepOrder = <T extends { n: number }>(steps: T[]): T[] =>
  steps.slice().sort((left, right) => left.n - right.n)

const forEachJourneyStep = (
  steps: JourneyStep[],
  visit: (step: JourneyStep) => void,
) => {
  for (const step of sortByStepOrder(steps)) {
    visit(step)
    for (const thread of step.threads ?? []) {
      for (const threadStep of sortByStepOrder(thread.steps)) {
        visit(threadStep as JourneyStep)
      }
    }
  }
}

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

  forEachJourneyStep(journey.steps, (step) => {
    if (!edgeIdsInView.has(step.edgeId)) {
      return
    }
    const edge = workspace.edges[step.edgeId]
    if (!edge) {
      return
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
  })

  if (!focusedEdgeIds.size) {
    return null
  }

  addBoundaryParents(workspace, view, focusedNodeIds)

  return {
    edgeIds: focusedEdgeIds,
    nodeIds: focusedNodeIds,
  }
}
