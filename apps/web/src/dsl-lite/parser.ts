import type {
  LiteJourney,
  LiteJourneyStep,
  LiteUiLayoutView,
  LiteViewAst,
  LiteWorkspaceAst,
} from './types'

const DEFAULT_VIEW_ID = 'v_container'
const DEFAULT_VIEW_KIND: LiteViewAst['kind'] = 'container'

const toViewKind = (raw: string): LiteViewAst['kind'] => {
  if (raw === 'system-context' || raw === 'container' || raw === 'component' || raw === 'hex') {
    return raw
  }
  return 'container'
}

const createViewAst = (
  id: string,
  kind: LiteViewAst['kind'],
  parent?: LiteViewAst['parent'],
): LiteViewAst => ({
  id,
  kind,
  parent,
  nodes: [],
  edges: [],
  journeys: [],
})

const parseAliasList = (raw?: string): string[] | undefined => {
  if (!raw) {
    return undefined
  }
  const aliases = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return aliases.length ? aliases : undefined
}

export const parseLiteDsl = (input: string): LiteWorkspaceAst => {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'))

  const result: LiteWorkspaceAst = {
    workspaceName: 'Workspace',
    views: [],
    uiLayout: [],
  }

  let openView: LiteViewAst | null = null
  let implicitView: LiteViewAst | null = null
  let openJourney: LiteJourney | null = null
  let openUiLayout = false
  let openUiLayoutView: LiteUiLayoutView | null = null
  let legacyViewIndex = 0

  const activeView = (): LiteViewAst | null => openView ?? implicitView

  const ensureImplicitView = (): LiteViewAst => {
    if (!implicitView) {
      implicitView = createViewAst(DEFAULT_VIEW_ID, DEFAULT_VIEW_KIND)
    }
    return implicitView
  }

  const closeJourney = () => {
    if (!openJourney) {
      return
    }
    const view = activeView() ?? ensureImplicitView()
    view.journeys.push(openJourney)
    openJourney = null
  }

  const closeView = () => {
    if (!openView) {
      return
    }
    closeJourney()
    result.views.push(openView)
    openView = null
  }

  const closeUiLayoutView = () => {
    if (!openUiLayoutView) {
      return
    }
    result.uiLayout.push(openUiLayoutView)
    openUiLayoutView = null
  }

  for (const line of lines) {
    if (line === '{') {
      continue
    }
    if (line === '}') {
      if (openJourney) {
        closeJourney()
        continue
      }
      if (openUiLayoutView) {
        closeUiLayoutView()
        continue
      }
      if (openUiLayout) {
        openUiLayout = false
        continue
      }
      if (openView) {
        closeView()
      }
      continue
    }

    const workspaceMatch = line.match(/^workspace\s+"([^"]+)"\s*\{$/)
    if (workspaceMatch) {
      result.workspaceName = workspaceMatch[1]
      continue
    }

    const uiLayoutMatch = line.match(/^metadata\s+ui-layout\s*\{$/)
    if (uiLayoutMatch) {
      closeView()
      closeJourney()
      closeUiLayoutView()
      openUiLayout = true
      continue
    }

    if (openUiLayout) {
      const uiLayoutViewMatch = line.match(/^view\s+([A-Za-z0-9_-]+)\s*\{$/)
      if (uiLayoutViewMatch) {
        closeUiLayoutView()
        openUiLayoutView = {
          viewId: uiLayoutViewMatch[1],
          nodes: [],
          edges: [],
        }
        continue
      }

      if (openUiLayoutView) {
        const uiNodeMatch = line.match(
          /^node\s+([A-Za-z0-9_-]+)\s+at\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+size\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/,
        )
        if (uiNodeMatch) {
          openUiLayoutView.nodes.push({
            alias: uiNodeMatch[1],
            x: Number(uiNodeMatch[2]),
            y: Number(uiNodeMatch[3]),
            w: Number(uiNodeMatch[4]),
            h: Number(uiNodeMatch[5]),
          })
          continue
        }

        const uiEdgeMatch = line.match(
          /^edge\s+([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)\s+label\s+(-?\d+(?:\.\d+)?)$/,
        )
        if (uiEdgeMatch) {
          openUiLayoutView.edges.push({
            fromAlias: uiEdgeMatch[1],
            toAlias: uiEdgeMatch[2],
            labelPosition: Number(uiEdgeMatch[3]),
          })
          continue
        }
      }
      continue
    }

    const viewWithIdMatch = line.match(
      /^view\s+([A-Za-z0-9_-]+)\s+([a-z-]+)(?:\s+parent\s+([A-Za-z0-9_-]+)\s+via\s+([A-Za-z0-9_-]+))?\s*\{$/,
    )
    if (viewWithIdMatch) {
      closeView()
      const parent =
        viewWithIdMatch[3] && viewWithIdMatch[4]
          ? { viewId: viewWithIdMatch[3], viaAlias: viewWithIdMatch[4] }
          : undefined
      openView = createViewAst(viewWithIdMatch[1], toViewKind(viewWithIdMatch[2]), parent)
      continue
    }

    const legacyViewMatch = line.match(/^view\s+([a-z-]+)\s*\{$/)
    if (legacyViewMatch) {
      closeView()
      legacyViewIndex += 1
      const kind = toViewKind(legacyViewMatch[1])
      const viewId = legacyViewIndex === 1 ? `v_${kind}` : `v_${kind}_${legacyViewIndex}`
      openView = createViewAst(viewId, kind)
      continue
    }

    const view = activeView() ?? ensureImplicitView()

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
      closeJourney()
      openJourney = {
        name: journeyMatch[1],
        color: journeyMatch[2] ?? '#2563eb',
        steps: [],
      }
      continue
    }

    const nodeMatch = line.match(
      /^([a-z-]+)\s+([A-Za-z0-9_-]+)\s+"([^"]+)"(?:\s+tech\s+([A-Za-z0-9_-]+))?(?:\s+drilldown\s+([A-Za-z0-9_-]+))?(?:\s+contains\s+([A-Za-z0-9_,-\s]+))?$/,
    )
    if (nodeMatch) {
      view.nodes.push({
        kind: nodeMatch[1],
        alias: nodeMatch[2],
        name: nodeMatch[3],
        techId: nodeMatch[4],
        drilldownToViewId: nodeMatch[5],
        containsAliases: parseAliasList(nodeMatch[6]),
      })
      continue
    }

    const edgeMatch = line.match(
      /^([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)(?:\s*:\s*([A-Za-z0-9_-]+)(?:\s*"([^"]*)")?)?$/,
    )
    if (edgeMatch) {
      view.edges.push({
        fromAlias: edgeMatch[1],
        toAlias: edgeMatch[2],
        protocol: edgeMatch[3] ?? 'http',
        label: edgeMatch[4] ?? 'request',
      })
      continue
    }
  }

  closeView()
  closeJourney()
  closeUiLayoutView()
  if (implicitView) {
    result.views.push(implicitView)
  }

  const totalNodeCount = result.views.reduce((sum, view) => sum + view.nodes.length, 0)
  if (totalNodeCount === 0) {
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

export type NodeLineTextOptions = {
  techId?: string
  drilldownToViewId?: string
  containsAliases?: string[]
}

export const toNodeLineText = (
  kind: string,
  alias: string,
  name: string,
  options?: NodeLineTextOptions,
): string => {
  const suffix = [
    options?.techId ? ` tech ${options.techId}` : '',
    options?.drilldownToViewId ? ` drilldown ${options.drilldownToViewId}` : '',
    options?.containsAliases?.length ? ` contains ${options.containsAliases.join(',')}` : '',
  ].join('')
  return `${kind} ${alias} "${name}"${suffix}`
}

export const toEdgeLineText = (
  fromAlias: string,
  toAlias: string,
  protocol: string,
  label: string,
): string => `${fromAlias} -> ${toAlias} : ${protocol} "${label}"`

export const fallbackAliasFromNodeId = aliasByNodeId
