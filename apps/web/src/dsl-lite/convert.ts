import { resolveNodePreset, resolveTechPreset } from '../presets/catalog'
import { fallbackAliasFromNodeId, toEdgeLineText, toJourneyStepText, toNodeLineText } from './parser'
import type { LiteWorkspaceAst } from './types'
import type { WorkspaceModel } from '../model/types'

const defaultPorts = [
  { id: 'north', x: 0.5, y: 0 },
  { id: 'east', x: 1, y: 0.5 },
  { id: 'south', x: 0.5, y: 1 },
  { id: 'west', x: 0, y: 0.5 },
]

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const liteToFullWorkspace = (ast: LiteWorkspaceAst): WorkspaceModel => {
  const workspaceId = slugify(ast.workspaceName) || 'workspace-lite'
  const viewId = `v_${ast.viewKind}`

  const nodes: WorkspaceModel['nodes'] = {}
  const aliasToNodeId = new Map<string, string>()
  ast.nodes.forEach((node, index) => {
    const nodeId = `n_${node.alias}`
    aliasToNodeId.set(node.alias, nodeId)
    const preset = resolveNodePreset(node.kind) ?? resolveNodePreset('container')
    const techPreset = resolveTechPreset(node.techId ?? preset?.defaultTechId ?? '')
    const col = index % 3
    const row = Math.floor(index / 3)
    nodes[nodeId] = {
      id: nodeId,
      presetId: preset?.id,
      kind: (preset?.kind ?? 'container') as WorkspaceModel['nodes'][string]['kind'],
      name: node.name,
      tags: [],
      tech: techPreset
        ? { id: techPreset.id, label: techPreset.label, iconKey: techPreset.iconKey }
        : undefined,
      bounds: {
        x: 120 + col * 280,
        y: 120 + row * 180,
        w: preset?.defaultWidth ?? 220,
        h: preset?.defaultHeight ?? 120,
      },
      ports: defaultPorts,
      children: [],
    }
  })

  const edges: WorkspaceModel['edges'] = {}
  const edgeLookup = new Map<string, string>()
  ast.edges.forEach((edge, index) => {
    const edgeId = `e_${index + 1}`
    const fromNodeId = aliasToNodeId.get(edge.fromAlias)
    const toNodeId = aliasToNodeId.get(edge.toAlias)
    if (!fromNodeId || !toNodeId) {
      return
    }
    edges[edgeId] = {
      id: edgeId,
      from: { nodeId: fromNodeId },
      to: { nodeId: toNodeId },
      protocolPresetId: edge.protocol,
      label: edge.label,
      route: { kind: 'auto', points: [] },
      style: { arrow: true, dashed: false, thickness: 2 },
    }
    edgeLookup.set(`${edge.fromAlias}->${edge.toAlias}`, edgeId)
  })

  const journeys: WorkspaceModel['journeys'] = {}
  ast.journeys.forEach((journey, index) => {
    const journeyId = `j_${index + 1}`
    const steps = journey.steps
      .map((step) => ({
        n: step.n,
        edgeId: edgeLookup.get(`${step.fromAlias}->${step.toAlias}`),
      }))
      .filter((step): step is { n: number; edgeId: string } => !!step.edgeId)
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
  })

  return {
    schemaVersion: '1.0',
    workspace: { id: workspaceId, name: ast.workspaceName },
    views: {
      [viewId]: {
        id: viewId,
        kind: ast.viewKind,
        name: `${ast.viewKind} view`,
        nodeIds: Object.keys(nodes),
        edgeIds: Object.keys(edges),
        journeyIds: Object.keys(journeys),
      },
    },
    nodes,
    edges,
    journeys,
    settings: {
      grid: false,
      snap: false,
    },
  }
}

export const fullViewToLiteDsl = (workspace: WorkspaceModel, viewId: string): string => {
  const view = workspace.views[viewId]
  if (!view) {
    return ''
  }

  const nodeAliasById = new Map<string, string>()
  const nodeLines = view.nodeIds
    .map((nodeId) => workspace.nodes[nodeId])
    .filter((node) => !!node)
    .map((node) => {
      const alias = fallbackAliasFromNodeId(node.id)
      nodeAliasById.set(node.id, alias)
      return `    ${toNodeLineText(node.kind, alias, node.name, node.tech?.id)}`
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
      return [`    journey "${journey.name}" color ${journey.colorKey} {`, ...steps, '    }'].join('\n')
    })

  return [
    `workspace "${workspace.workspace.name}" {`,
    `  view ${view.kind} {`,
    ...nodeLines,
    '',
    ...edgeLines,
    journeyBlocks.length ? '' : null,
    ...journeyBlocks,
    '  }',
    '}',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}
