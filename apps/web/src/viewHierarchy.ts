/**
 * Purpose: Provide view hierarchy and view-related utilities for workspace navigation.
 */

import type { WorkspaceModel, ViewModel } from './model/types'

export type ViewHierarchyOption = {
  viewId: string
  depth: number
  lineage: string[]
}

const viewKindOrder: Record<ViewModel['kind'], number> = {
  'system-context': 0,
  container: 1,
  component: 2,
  hex: 3,
}

const compareViewIds = (
  workspace: WorkspaceModel,
  leftViewId: string,
  rightViewId: string,
): number => {
  const leftView = workspace.views[leftViewId]
  const rightView = workspace.views[rightViewId]
  if (!leftView || !rightView) {
    return leftViewId.localeCompare(rightViewId)
  }
  const kindOrderDiff = viewKindOrder[leftView.kind] - viewKindOrder[rightView.kind]
  if (kindOrderDiff !== 0) {
    return kindOrderDiff
  }
  const nameDiff = leftView.name.localeCompare(rightView.name)
  if (nameDiff !== 0) {
    return nameDiff
  }
  return leftView.id.localeCompare(rightView.id)
}

export const resolveViewParentById = (
  workspace: WorkspaceModel,
): Map<string, string | null> => {
  const parentByViewId = new Map<string, string | null>()
  for (const viewId of Object.keys(workspace.views)) {
    parentByViewId.set(viewId, null)
  }

  for (const view of Object.values(workspace.views)) {
    for (const nodeId of view.nodeIds) {
      const node = workspace.nodes[nodeId]
      const childViewId = node?.drilldownRef
      if (!childViewId || !workspace.views[childViewId]) {
        continue
      }
      if (!parentByViewId.has(childViewId) || parentByViewId.get(childViewId) === null) {
        parentByViewId.set(childViewId, view.id)
      }
    }
  }

  return parentByViewId
}

export const resolveViewLineage = (
  workspace: WorkspaceModel,
  viewId: string,
): string[] => {
  if (!workspace.views[viewId]) {
    return []
  }
  const parentByViewId = resolveViewParentById(workspace)
  const lineage = [viewId]
  const seen = new Set<string>(lineage)
  let currentViewId = viewId
  while (true) {
    const parentViewId = parentByViewId.get(currentViewId)
    if (!parentViewId || seen.has(parentViewId)) {
      break
    }
    lineage.unshift(parentViewId)
    seen.add(parentViewId)
    currentViewId = parentViewId
  }
  return lineage
}

export const resolveViewHistoryForView = (
  workspace: WorkspaceModel,
  viewId: string,
): string[] => resolveViewLineage(workspace, viewId).slice(0, -1)

export const resolvePreferredEntryViewId = (
  workspace: WorkspaceModel,
): string => {
  const viewIds = Object.keys(workspace.views)
  if (!viewIds.length) {
    return ''
  }
  const parentByViewId = resolveViewParentById(workspace)
  const rootViewIds = viewIds
    .filter((candidateViewId) => parentByViewId.get(candidateViewId) === null)
    .sort((leftViewId, rightViewId) => compareViewIds(workspace, leftViewId, rightViewId))
  const preferredRoot =
    rootViewIds.find((candidateViewId) => {
      const viewKind = workspace.views[candidateViewId]?.kind
      return viewKind === 'container' || viewKind === 'system-context'
    }) ?? rootViewIds[0]
  return preferredRoot ?? viewIds.sort((leftViewId, rightViewId) => compareViewIds(workspace, leftViewId, rightViewId))[0]
}

export const buildViewHierarchyOptions = (
  workspace: WorkspaceModel,
): ViewHierarchyOption[] => {
  const viewIds = Object.keys(workspace.views)
  if (!viewIds.length) {
    return []
  }
  const parentByViewId = resolveViewParentById(workspace)
  const childrenByViewId = new Map<string, string[]>()
  for (const [childViewId, parentViewId] of parentByViewId.entries()) {
    if (!parentViewId) {
      continue
    }
    const siblings = childrenByViewId.get(parentViewId) ?? []
    siblings.push(childViewId)
    childrenByViewId.set(parentViewId, siblings)
  }
  for (const [parentViewId, childViewIds] of childrenByViewId.entries()) {
    childViewIds.sort((leftViewId, rightViewId) => compareViewIds(workspace, leftViewId, rightViewId))
    childrenByViewId.set(parentViewId, childViewIds)
  }

  const rootViewIds = viewIds
    .filter((candidateViewId) => parentByViewId.get(candidateViewId) === null)
    .sort((leftViewId, rightViewId) => compareViewIds(workspace, leftViewId, rightViewId))

  const options: ViewHierarchyOption[] = []
  const visited = new Set<string>()
  const appendTree = (viewId: string, depth: number, lineage: string[]) => {
    if (!workspace.views[viewId] || visited.has(viewId)) {
      return
    }
    visited.add(viewId)
    const nextLineage = [...lineage, viewId]
    options.push({
      viewId,
      depth,
      lineage: nextLineage,
    })
    for (const childViewId of childrenByViewId.get(viewId) ?? []) {
      if (nextLineage.includes(childViewId)) {
        continue
      }
      appendTree(childViewId, depth + 1, nextLineage)
    }
  }

  for (const rootViewId of rootViewIds) {
    appendTree(rootViewId, 0, [])
  }
  for (const viewId of viewIds.sort((leftViewId, rightViewId) => compareViewIds(workspace, leftViewId, rightViewId))) {
    if (!visited.has(viewId)) {
      appendTree(viewId, 0, [])
    }
  }

  return options
}
