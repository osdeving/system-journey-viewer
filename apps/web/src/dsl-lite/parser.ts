import type { LiteJourney, LiteJourneyStep, LiteWorkspaceAst } from './types'

const toViewKind = (raw: string): LiteWorkspaceAst['viewKind'] => {
  if (raw === 'system-context' || raw === 'container' || raw === 'component' || raw === 'hex') {
    return raw
  }
  return 'container'
}

export const parseLiteDsl = (input: string): LiteWorkspaceAst => {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'))

  const result: LiteWorkspaceAst = {
    workspaceName: 'Workspace',
    viewKind: 'container',
    nodes: [],
    edges: [],
    journeys: [],
  }

  let openJourney: LiteJourney | null = null

  for (const line of lines) {
    if (line === '}' || line === '{') {
      if (line === '}' && openJourney) {
        result.journeys.push(openJourney)
        openJourney = null
      }
      continue
    }

    const workspaceMatch = line.match(/^workspace\s+"([^"]+)"\s*\{$/)
    if (workspaceMatch) {
      result.workspaceName = workspaceMatch[1]
      continue
    }

    const viewMatch = line.match(/^view\s+([a-z-]+)\s*\{$/)
    if (viewMatch) {
      result.viewKind = toViewKind(viewMatch[1])
      continue
    }

    if (openJourney) {
      const stepMatch = line.match(/^(\d+)\s*:\s*([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)$/)
      if (stepMatch) {
        openJourney.steps.push({
          n: Number(stepMatch[1]),
          fromAlias: stepMatch[2],
          toAlias: stepMatch[3],
        })
        continue
      }
    }

    const journeyMatch = line.match(/^journey\s+"([^"]+)"(?:\s+color\s+([#A-Za-z0-9_-]+))?\s*\{$/)
    if (journeyMatch) {
      openJourney = {
        name: journeyMatch[1],
        color: journeyMatch[2] ?? '#2563eb',
        steps: [],
      }
      continue
    }

    const nodeMatch = line.match(
      /^([a-z-]+)\s+([A-Za-z0-9_-]+)\s+"([^"]+)"(?:\s+tech\s+([A-Za-z0-9_-]+))?$/,
    )
    if (nodeMatch) {
      result.nodes.push({
        kind: nodeMatch[1],
        alias: nodeMatch[2],
        name: nodeMatch[3],
        techId: nodeMatch[4],
      })
      continue
    }

    const edgeMatch = line.match(
      /^([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)(?:\s*:\s*([A-Za-z0-9_-]+)(?:\s*"([^"]*)")?)?$/,
    )
    if (edgeMatch) {
      result.edges.push({
        fromAlias: edgeMatch[1],
        toAlias: edgeMatch[2],
        protocol: edgeMatch[3] ?? 'http',
        label: edgeMatch[4] ?? 'request',
      })
      continue
    }
  }

  if (openJourney) {
    result.journeys.push(openJourney)
  }

  if (result.nodes.length === 0) {
    throw new Error('DSL LITE inválida: nenhum node encontrado.')
  }

  return result
}

const aliasByNodeId = (nodeId: string): string => {
  const value = nodeId.replace(/^n_/, '')
  return value.length ? value : nodeId
}

export const toJourneyStepText = (step: LiteJourneyStep): string =>
  `${step.n}: ${step.fromAlias} -> ${step.toAlias}`

export const toNodeLineText = (
  kind: string,
  alias: string,
  name: string,
  techId?: string,
): string => `${kind} ${alias} "${name}"${techId ? ` tech ${techId}` : ''}`

export const toEdgeLineText = (
  fromAlias: string,
  toAlias: string,
  protocol: string,
  label: string,
): string => `${fromAlias} -> ${toAlias} : ${protocol} "${label}"`

export const fallbackAliasFromNodeId = aliasByNodeId
