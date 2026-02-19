import { resolveNodePreset, resolveTechPreset } from '../presets/catalog'
import { resolveNodePorts } from '../model/nodePorts'
import { fallbackAliasFromNodeId, toEdgeLineText, toJourneyStepText, toNodeLineText } from './parser'
import type { LiteViewAst, LiteWorkspaceAst } from './types'
import type { WorkspaceModel } from '../model/types'

const MIN_NODE_SIZE = 80
const MIN_EDGE_LABEL_POSITION = 0.08
const MAX_EDGE_LABEL_POSITION = 0.92

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const sanitizeToken = (text: string, fallback: string): string => {
  const value = text
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return value || fallback
}

const resolveUniqueToken = (
  baseValue: string,
  used: Set<string>,
  fallbackPrefix: string,
): string => {
  const base = baseValue || fallbackPrefix
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${base}_${suffix}`
    suffix += 1
  }
  used.add(candidate)
  return candidate
}

const resolveGroupBounds = (
  nodes: WorkspaceModel['nodes'],
  nodeIds: string[],
): { x: number; y: number; w: number; h: number } | null => {
  if (!nodeIds.length) {
    return null
  }
  const children = nodeIds.map((nodeId) => nodes[nodeId]).filter((node) => !!node)
  if (!children.length) {
    return null
  }

  const minX = Math.min(...children.map((node) => node.bounds.x))
  const minY = Math.min(...children.map((node) => node.bounds.y))
  const maxX = Math.max(...children.map((node) => node.bounds.x + node.bounds.w))
  const maxY = Math.max(...children.map((node) => node.bounds.y + node.bounds.h))

  const paddingX = 70
  const paddingTop = 70
  const paddingBottom = 50

  return {
    x: minX - paddingX,
    y: minY - paddingTop,
    w: Math.max(200, maxX - minX + paddingX * 2),
    h: Math.max(140, maxY - minY + paddingTop + paddingBottom),
  }
}

const resolveAliasToken = (value: string, fallback: string): string => {
  const normalized = value
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return normalized || fallback
}

const clampEdgeLabelPosition = (position: number): number =>
  Math.min(MAX_EDGE_LABEL_POSITION, Math.max(MIN_EDGE_LABEL_POSITION, position))

const resolveLabelSide = (side?: string): 'left' | 'right' =>
  side === 'right' ? 'right' : 'left'

const toDslNumber = (value: number): string => {
  if (Number.isInteger(value)) {
    return String(value)
  }
  const rounded = Number(value.toFixed(2))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

const aliasFromNodeIdForView = (nodeId: string, viewId: string): string => {
  const prefix = `n_${viewId}_`
  if (nodeId.startsWith(prefix)) {
    const alias = nodeId.slice(prefix.length)
    if (alias.length) {
      return alias
    }
  }
  return fallbackAliasFromNodeId(nodeId)
}

const buildAliasMapByView = (
  workspace: WorkspaceModel,
): Record<string, Map<string, string>> => {
  const aliasesByView: Record<string, Map<string, string>> = {}

  for (const view of Object.values(workspace.views)) {
    const usedAliases = new Set<string>()
    const aliasByNodeId = new Map<string, string>()
    let fallbackCounter = 1

    for (const nodeId of view.nodeIds) {
      const node = workspace.nodes[nodeId]
      if (!node) {
        continue
      }
      const baseAlias = resolveAliasToken(
        aliasFromNodeIdForView(node.id, view.id),
        `node_${fallbackCounter}`,
      )
      const alias = resolveUniqueToken(baseAlias, usedAliases, `node_${fallbackCounter}`)
      fallbackCounter += 1
      aliasByNodeId.set(node.id, alias)
    }

    aliasesByView[view.id] = aliasByNodeId
  }

  return aliasesByView
}

const resolveParentRef = (
  workspace: WorkspaceModel,
  targetViewId: string,
  aliasByView: Record<string, Map<string, string>>,
): { viewId: string; viaAlias: string } | null => {
  for (const parentView of Object.values(workspace.views)) {
    for (const nodeId of parentView.nodeIds) {
      const node = workspace.nodes[nodeId]
      if (!node || node.drilldownRef !== targetViewId) {
        continue
      }
      const viaAlias =
        aliasByView[parentView.id]?.get(nodeId) ??
        resolveAliasToken(fallbackAliasFromNodeId(nodeId), nodeId)
      return { viewId: parentView.id, viaAlias }
    }
  }
  return null
}

const buildViewBlock = (
  workspace: WorkspaceModel,
  view: WorkspaceModel['views'][string],
  aliasByView: Record<string, Map<string, string>>,
): string => {
  const nodeAliasById = aliasByView[view.id] ?? new Map<string, string>()
  const parentRef = resolveParentRef(workspace, view.id, aliasByView)
  const viewHeader = parentRef
    ? `view ${view.id} ${view.kind} parent ${parentRef.viewId} via ${parentRef.viaAlias} {`
    : `view ${view.id} ${view.kind} {`

  const nodeLines = view.nodeIds
    .map((nodeId) => workspace.nodes[nodeId])
    .filter((node) => !!node)
    .map((node) => {
      const alias = nodeAliasById.get(node.id) ?? resolveAliasToken(node.id, 'node')
      const containsAliases =
        node.kind === 'boundary' && node.children.length > 0
          ? node.children
              .map((childNodeId) => nodeAliasById.get(childNodeId))
              .filter((childAlias): childAlias is string => !!childAlias)
          : undefined
      return `    ${toNodeLineText(node.kind, alias, node.name, {
        techId: node.tech?.id,
        drilldownToViewId: node.drilldownRef,
        containsAliases,
      })}`
    })

  const edgeLines = view.edgeIds
    .map((edgeId) => workspace.edges[edgeId])
    .filter((edge) => !!edge)
    .map((edge) => {
      const fromAlias = nodeAliasById.get(edge.from.nodeId) ?? edge.from.nodeId
      const toAlias = nodeAliasById.get(edge.to.nodeId) ?? edge.to.nodeId
      return `    ${toEdgeLineText(fromAlias, toAlias, edge.protocolPresetId, edge.label)}`
    })

  const journeyBlocks = view.journeyIds
    .map((journeyId) => workspace.journeys[journeyId])
    .filter((journey) => !!journey)
    .map((journey) => {
      const steps = journey.steps
        .slice()
        .sort((left, right) => left.n - right.n)
        .map((step) => {
          const edge = workspace.edges[step.edgeId]
          if (!edge) {
            return null
          }
          const fromAlias = nodeAliasById.get(edge.from.nodeId) ?? edge.from.nodeId
          const toAlias = nodeAliasById.get(edge.to.nodeId) ?? edge.to.nodeId
          return `      ${toJourneyStepText({ n: step.n, fromAlias, toAlias })}`
        })
        .filter((line): line is string => !!line)

      return [
        `    journey "${journey.name}" color ${journey.colorKey} {`,
        ...steps,
        '    }',
      ].join('\n')
    })

  return [
    `  ${viewHeader}`,
    ...nodeLines,
    edgeLines.length ? '' : null,
    ...edgeLines,
    journeyBlocks.length ? '' : null,
    ...journeyBlocks,
    '  }',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

const buildUiLayoutMetadataBlock = (
  workspace: WorkspaceModel,
  aliasByView: Record<string, Map<string, string>>,
  options?: { viewIds?: string[] },
): string | null => {
  const scopedViewIds = options?.viewIds?.length
    ? options.viewIds
    : Object.keys(workspace.views)

  const viewBlocks = scopedViewIds
    .map((viewId) => workspace.views[viewId])
    .filter((view): view is WorkspaceModel['views'][string] => !!view)
    .map((view) => {
      const nodeAliasById = aliasByView[view.id] ?? new Map<string, string>()
      const nodeLines = view.nodeIds
        .map((nodeId) => workspace.nodes[nodeId])
        .filter((node): node is WorkspaceModel['nodes'][string] => !!node)
        .map((node) => {
          const alias = nodeAliasById.get(node.id)
          if (!alias) {
            return null
          }
          return `      node ${alias} at ${toDslNumber(node.bounds.x)} ${toDslNumber(node.bounds.y)} size ${toDslNumber(node.bounds.w)} ${toDslNumber(node.bounds.h)}`
        })
        .filter((line): line is string => !!line)

      const edgeLines = view.edgeIds
        .map((edgeId) => workspace.edges[edgeId])
        .filter((edge): edge is WorkspaceModel['edges'][string] => !!edge)
        .map((edge) => {
          const fromAlias = nodeAliasById.get(edge.from.nodeId)
          const toAlias = nodeAliasById.get(edge.to.nodeId)
          if (!fromAlias || !toAlias) {
            return null
          }
          const labelPositionText = toDslNumber(
            clampEdgeLabelPosition(edge.style.labelPosition ?? 0.5),
          )
          const labelSideText = resolveLabelSide(edge.style.labelSide)
          const fontSize =
            typeof edge.style.labelFontSize === 'number'
              ? Math.max(1, Math.min(64, edge.style.labelFontSize))
              : null
          return `      edge ${fromAlias} -> ${toAlias} label ${labelPositionText} side ${labelSideText}${
            fontSize !== null ? ` font ${toDslNumber(fontSize)}` : ''
          }`
        })
        .filter((line): line is string => !!line)

      if (!nodeLines.length && !edgeLines.length) {
        return null
      }

      return [
        `    view ${view.id} {`,
        ...nodeLines,
        ...edgeLines,
        '    }',
      ].join('\n')
    })
    .filter((block): block is string => !!block)

  if (!viewBlocks.length) {
    return null
  }

  return ['  metadata ui-layout {', ...viewBlocks, '  }'].join('\n')
}

export const liteToFullWorkspace = (ast: LiteWorkspaceAst): WorkspaceModel => {
  const workspaceId = slugify(ast.workspaceName) || 'workspace-lite'
  const views: WorkspaceModel['views'] = {}
  const nodes: WorkspaceModel['nodes'] = {}
  const edges: WorkspaceModel['edges'] = {}
  const journeys: WorkspaceModel['journeys'] = {}

  const resolvedViewIdByOriginal = new Map<string, string>()
  const usedViewIds = new Set<string>()

  const parsedViews =
    ast.views.length > 0
      ? ast.views
      : [
          ({
            id: 'v_container',
            kind: 'container',
            nodes: [],
            edges: [],
            journeys: [],
          } satisfies LiteViewAst),
        ]

  const resolvedViews = parsedViews.map((view, index) => {
    const preferredId = sanitizeToken(
      view.id,
      `v_${view.kind}_${index + 1}`,
    )
    const resolvedId = resolveUniqueToken(preferredId, usedViewIds, `v_${view.kind}_${index + 1}`)
    if (!resolvedViewIdByOriginal.has(view.id)) {
      resolvedViewIdByOriginal.set(view.id, resolvedId)
    }
    views[resolvedId] = {
      id: resolvedId,
      kind: view.kind,
      name: `${view.kind} view`,
      nodeIds: [],
      edgeIds: [],
      journeyIds: [],
    }
    return { ...view, id: resolvedId }
  })

  const resolvedViewIdSet = new Set(Object.keys(views))
  const resolveViewRef = (value?: string): string | undefined => {
    if (!value) {
      return undefined
    }
    return resolvedViewIdByOriginal.get(value) ?? (resolvedViewIdSet.has(value) ? value : undefined)
  }

  const usedNodeIds = new Set<string>()
  const usedEdgeIds = new Set<string>()
  const usedJourneyIds = new Set<string>()

  const aliasToNodeIdByView = new Map<string, Map<string, string>>()
  const edgeLookupByView = new Map<string, Map<string, string>>()
  const boundaryNodeEntries: Array<{ viewId: string; nodeId: string; containsAliases: string[] }> = []

  for (const view of resolvedViews) {
    const aliasToNodeId = new Map<string, string>()
    aliasToNodeIdByView.set(view.id, aliasToNodeId)

    view.nodes.forEach((node, index) => {
      const preferredNodeId = sanitizeToken(
        `n_${view.id}_${node.alias}`,
        `n_${view.id}_${index + 1}`,
      )
      const nodeId = resolveUniqueToken(preferredNodeId, usedNodeIds, `n_${view.id}_${index + 1}`)
      aliasToNodeId.set(node.alias, nodeId)

      const preset = resolveNodePreset(node.kind) ?? resolveNodePreset('container')
      const techPreset = resolveTechPreset(node.techId ?? preset?.defaultTechId ?? '')
      const col = index % 3
      const row = Math.floor(index / 3)
      const bounds = {
        x: 120 + col * 280,
        y: 120 + row * 180,
        w: preset?.defaultWidth ?? 220,
        h: preset?.defaultHeight ?? 120,
      }
      nodes[nodeId] = {
        id: nodeId,
        presetId: preset?.id,
        kind: (preset?.kind ?? 'container') as WorkspaceModel['nodes'][string]['kind'],
        name: node.name,
        tags: [],
        tech: techPreset
          ? { id: techPreset.id, label: techPreset.label, iconKey: techPreset.iconKey }
          : undefined,
        bounds,
        ports: resolveNodePorts(bounds),
        children: [],
        drilldownRef: resolveViewRef(node.drilldownToViewId),
      }

      views[view.id].nodeIds.push(nodeId)

      if (node.kind === 'boundary' && node.containsAliases?.length) {
        boundaryNodeEntries.push({
          viewId: view.id,
          nodeId,
          containsAliases: node.containsAliases,
        })
      }
    })

    const edgeLookup = new Map<string, string>()
    edgeLookupByView.set(view.id, edgeLookup)

    view.edges.forEach((edge, index) => {
      const fromNodeId = aliasToNodeId.get(edge.fromAlias)
      const toNodeId = aliasToNodeId.get(edge.toAlias)
      if (!fromNodeId || !toNodeId) {
        return
      }

      const preferredEdgeId = sanitizeToken(
        `e_${view.id}_${index + 1}`,
        `e_${view.id}_${index + 1}`,
      )
      const edgeId = resolveUniqueToken(preferredEdgeId, usedEdgeIds, `e_${view.id}_${index + 1}`)
      edges[edgeId] = {
        id: edgeId,
        from: { nodeId: fromNodeId },
        to: { nodeId: toNodeId },
        protocolPresetId: edge.protocol,
        label: edge.label,
        route: { kind: 'auto', points: [] },
        style: { arrow: true, dashed: false, thickness: 2, labelPosition: 0.5, labelSide: 'left' },
      }
      views[view.id].edgeIds.push(edgeId)
      edgeLookup.set(`${edge.fromAlias}->${edge.toAlias}`, edgeId)
    })

    view.journeys.forEach((journey, index) => {
      const edgeLookupForView = edgeLookupByView.get(view.id) ?? new Map<string, string>()
      const steps = journey.steps
        .map((step) => ({
          n: step.n,
          edgeId: edgeLookupForView.get(`${step.fromAlias}->${step.toAlias}`),
        }))
        .filter((step): step is { n: number; edgeId: string } => !!step.edgeId)

      const preferredJourneyId = sanitizeToken(
        `j_${view.id}_${index + 1}`,
        `j_${view.id}_${index + 1}`,
      )
      const journeyId = resolveUniqueToken(
        preferredJourneyId,
        usedJourneyIds,
        `j_${view.id}_${index + 1}`,
      )
      journeys[journeyId] = {
        id: journeyId,
        name: journey.name,
        colorKey: journey.color,
        steps,
        player: {
          loop: false,
          speedMs: 900,
          pauseOnStep: false,
        },
      }
      views[view.id].journeyIds.push(journeyId)
    })
  }

  for (const view of resolvedViews) {
    if (!view.parent) {
      continue
    }
    const parentViewId = resolveViewRef(view.parent.viewId)
    if (!parentViewId || !views[parentViewId]) {
      continue
    }
    const parentAliasMap = aliasToNodeIdByView.get(parentViewId)
    const parentNodeId = parentAliasMap?.get(view.parent.viaAlias)
    if (!parentNodeId || !nodes[parentNodeId]) {
      continue
    }
    if (!nodes[parentNodeId].drilldownRef || nodes[parentNodeId].drilldownRef === view.id) {
      nodes[parentNodeId].drilldownRef = view.id
    }
  }

  for (const boundaryNode of boundaryNodeEntries) {
    const aliasMap = aliasToNodeIdByView.get(boundaryNode.viewId)
    if (!aliasMap) {
      continue
    }
    const childNodeIds = Array.from(
      new Set(
        boundaryNode.containsAliases
          .map((alias) => aliasMap.get(alias))
          .filter((childNodeId): childNodeId is string => !!childNodeId && childNodeId !== boundaryNode.nodeId),
      ),
    )
    const boundary = nodes[boundaryNode.nodeId]
    if (!boundary) {
      continue
    }
    boundary.children = childNodeIds
    const groupBounds = resolveGroupBounds(nodes, childNodeIds)
    if (!groupBounds) {
      continue
    }
    boundary.bounds = {
      x: groupBounds.x,
      y: groupBounds.y,
      w: Math.max(boundary.bounds.w, groupBounds.w),
      h: Math.max(boundary.bounds.h, groupBounds.h),
    }
    boundary.ports = resolveNodePorts(boundary.bounds)
  }

  for (const layoutView of ast.uiLayout ?? []) {
    const resolvedLayoutViewId = resolveViewRef(layoutView.viewId)
    if (!resolvedLayoutViewId || !views[resolvedLayoutViewId]) {
      continue
    }
    const view = views[resolvedLayoutViewId]
    const aliasMap = aliasToNodeIdByView.get(resolvedLayoutViewId)
    const edgeLookup = edgeLookupByView.get(resolvedLayoutViewId)

    for (const nodeLayout of layoutView.nodes) {
      const nodeId = aliasMap?.get(nodeLayout.alias)
      if (!nodeId || !view.nodeIds.includes(nodeId)) {
        continue
      }
      const node = nodes[nodeId]
      if (!node) {
        continue
      }
      node.bounds = {
        x: nodeLayout.x,
        y: nodeLayout.y,
        w: Math.max(MIN_NODE_SIZE, nodeLayout.w),
        h: Math.max(MIN_NODE_SIZE, nodeLayout.h),
      }
      node.ports = resolveNodePorts(node.bounds)
    }

    for (const edgeLayout of layoutView.edges) {
      const edgeId = edgeLookup?.get(`${edgeLayout.fromAlias}->${edgeLayout.toAlias}`)
      if (!edgeId || !view.edgeIds.includes(edgeId)) {
        continue
      }
      const edge = edges[edgeId]
      if (!edge) {
        continue
      }
      edge.style = {
        ...edge.style,
        labelPosition: clampEdgeLabelPosition(edgeLayout.labelPosition),
        labelSide: resolveLabelSide(edgeLayout.labelSide),
        labelFontSize:
          typeof edgeLayout.labelFontSize === 'number'
            ? Math.max(1, Math.min(64, edgeLayout.labelFontSize))
            : edge.style.labelFontSize,
      }
    }
  }

  return {
    schemaVersion: '1.0',
    workspace: { id: workspaceId, name: ast.workspaceName },
    views,
    nodes,
    edges,
    journeys,
    settings: {
      grid: false,
      snap: false,
      theme: 'light',
      journeyFocus: {
        offscopeRenderMode: 'dim',
        layoutMode: 'preserve',
        autoLayoutMode: 'manual',
      },
    },
  }
}

export const fullWorkspaceToLiteDsl = (workspace: WorkspaceModel): string => {
  const viewIds = Object.keys(workspace.views)
  if (!viewIds.length) {
    return ''
  }

  const aliasByView = buildAliasMapByView(workspace)
  const viewBlocks = viewIds
    .map((viewId) => workspace.views[viewId])
    .filter((view) => !!view)
    .map((view) => buildViewBlock(workspace, view, aliasByView))
  const uiLayoutBlock = buildUiLayoutMetadataBlock(workspace, aliasByView, { viewIds })
  const sections = uiLayoutBlock ? [...viewBlocks, uiLayoutBlock] : viewBlocks

  return [`workspace "${workspace.workspace.name}" {`, ...sections, '}'].join('\n\n')
}

export const fullViewToLiteDsl = (workspace: WorkspaceModel, viewId: string): string => {
  const view = workspace.views[viewId]
  if (!view) {
    return ''
  }
  const aliasByView = buildAliasMapByView(workspace)
  const viewBlock = buildViewBlock(workspace, view, aliasByView)
  const uiLayoutBlock = buildUiLayoutMetadataBlock(workspace, aliasByView, { viewIds: [viewId] })
  return [`workspace "${workspace.workspace.name}" {`, viewBlock, uiLayoutBlock, '}']
    .filter((line): line is string => !!line)
    .join('\n\n')
}
