/**
 * Purpose: Preserve in-memory visual-only workspace state when DSL sync rebuilds the semantic model.
 */

import type { WorkspaceModel } from '../model/types'

const copyEdgeRoute = (route: WorkspaceModel['edges'][string]['route']): WorkspaceModel['edges'][string]['route'] => ({
  kind: route.kind,
  points: route.points.map((point) => ({ ...point })),
})

export const preserveWorkspaceVisualStateForDslSync = (
  importedWorkspace: WorkspaceModel,
  currentWorkspace: WorkspaceModel,
): WorkspaceModel => {
  const nextWorkspace: WorkspaceModel = {
    ...importedWorkspace,
    views: { ...importedWorkspace.views },
    nodes: { ...importedWorkspace.nodes },
    edges: { ...importedWorkspace.edges },
    settings: {
      ...importedWorkspace.settings,
      journeyFocus: {
        ...importedWorkspace.settings.journeyFocus,
      },
    },
  }

  for (const [nodeId, importedNode] of Object.entries(importedWorkspace.nodes)) {
    const currentNode = currentWorkspace.nodes[nodeId]
    if (!currentNode) {
      continue
    }

    nextWorkspace.nodes[nodeId] = {
      ...importedNode,
      bounds: { ...currentNode.bounds },
      ports:
        currentNode.kind === importedNode.kind
          ? currentNode.ports.map((port) => ({ ...port }))
          : importedNode.ports.map((port) => ({ ...port })),
      style:
        currentNode.style?.fillColor || currentNode.style?.textColor
          ? {
              ...importedNode.style,
              ...(currentNode.style?.fillColor ? { fillColor: currentNode.style.fillColor } : {}),
              ...(currentNode.style?.textColor ? { textColor: currentNode.style.textColor } : {}),
            }
          : importedNode.style,
    }
  }

  for (const [edgeId, importedEdge] of Object.entries(importedWorkspace.edges)) {
    const currentEdge = currentWorkspace.edges[edgeId]
    if (!currentEdge) {
      continue
    }

    const preserveFromPort = currentEdge.from.nodeId === importedEdge.from.nodeId
    const preserveToPort = currentEdge.to.nodeId === importedEdge.to.nodeId
    const preserveRoute = preserveFromPort && preserveToPort

    nextWorkspace.edges[edgeId] = {
      ...importedEdge,
      from: preserveFromPort
        ? {
            ...importedEdge.from,
            ...(currentEdge.from.portId ? { portId: currentEdge.from.portId } : {}),
          }
        : importedEdge.from,
      to: preserveToPort
        ? {
            ...importedEdge.to,
            ...(currentEdge.to.portId ? { portId: currentEdge.to.portId } : {}),
          }
        : importedEdge.to,
      route: preserveRoute ? copyEdgeRoute(currentEdge.route) : copyEdgeRoute(importedEdge.route),
      style: {
        ...importedEdge.style,
        ...currentEdge.style,
      },
    }
  }

  return nextWorkspace
}
