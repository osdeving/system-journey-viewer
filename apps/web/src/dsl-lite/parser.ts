/**
 * Purpose: Implement SJV Script parsing, serialization, and editor integration helpers.
 */

import type {
  LiteJourney,
  LiteJourneyStep,
  LiteJourneyThread,
  LiteUiLayoutView,
  LiteViewAst,
  LiteWorkspaceAst,
} from './types'

const decodeScriptText = (value: string): string => {
  let result = ''
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character !== '\\' || index + 1 >= value.length) {
      result += character
      continue
    }
    const next = value[index + 1]
    if (next === 'n') {
      result += '\n'
      index += 1
      continue
    }
    if (next === 'r') {
      result += '\r'
      index += 1
      continue
    }
    if (next === 't') {
      result += '\t'
      index += 1
      continue
    }
    if (next === '"' || next === '\\') {
      result += next
      index += 1
      continue
    }
    result += `\\${next}`
    index += 1
  }
  return result
}

export const encodeScriptText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"')

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
  let openJourney: LiteJourney | null = null
  let openJourneyThread: LiteJourneyThread | null = null
  let openUiLayout = false
  let openUiLayoutView: LiteUiLayoutView | null = null

  const closeJourneyThread = () => {
    if (!openJourneyThread) {
      return
    }
    if (!openJourney) {
      throw new Error('SJV Script invalid: thread block found outside journey.')
    }
    const previousMainStep = openJourney.steps[openJourney.steps.length - 1]
    if (!previousMainStep) {
      throw new Error('SJV Script invalid: thread block must appear after a main journey step.')
    }
    previousMainStep.threads = [...(previousMainStep.threads ?? []), openJourneyThread]
    openJourneyThread = null
  }

  const closeJourney = () => {
    if (!openJourney || !openView) {
      return
    }
    closeJourneyThread()
    openView.journeys.push(openJourney)
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
      if (openJourneyThread) {
        closeJourneyThread()
        continue
      }
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

    const workspaceMatch = line.match(/^workspace\s+"((?:[^"\\]|\\.)+)"\s*\{$/)
    if (workspaceMatch) {
      result.workspaceName = decodeScriptText(workspaceMatch[1])
      continue
    }

    const uiLayoutMatch = line.match(/^metadata\s+ui-layout\s*\{$/)
    if (uiLayoutMatch) {
      closeJourney()
      closeView()
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
          /^node\s+([A-Za-z0-9_-]+)\s+at\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+size\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+fill\s+([#A-Za-z0-9_-]+))?(?:\s+text\s+([#A-Za-z0-9_-]+))?$/,
        )
        if (uiNodeMatch) {
          openUiLayoutView.nodes.push({
            alias: uiNodeMatch[1],
            x: Number(uiNodeMatch[2]),
            y: Number(uiNodeMatch[3]),
            w: Number(uiNodeMatch[4]),
            h: Number(uiNodeMatch[5]),
            fillColor: uiNodeMatch[6] || undefined,
            textColor: uiNodeMatch[7] || undefined,
          })
          continue
        }

        const uiEdgeMatch = line.match(
          /^edge\s+([A-Za-z0-9_-]+)\s+label\s+(-?\d+(?:\.\d+)?)(?:\s+side\s+(left|right))?(?:\s+font\s+(\d+(?:\.\d+)?))?(?:\s+angle\s+(-?\d+(?:\.\d+)?))?$/,
        )
        if (uiEdgeMatch) {
          openUiLayoutView.edges.push({
            edgeId: uiEdgeMatch[1],
            labelPosition: Number(uiEdgeMatch[2]),
            labelSide: uiEdgeMatch[3] === 'right' ? 'right' : 'left',
            labelFontSize:
              uiEdgeMatch[4] && Number.isFinite(Number(uiEdgeMatch[4]))
                ? Number(uiEdgeMatch[4])
                : undefined,
            labelAngle:
              uiEdgeMatch[5] && Number.isFinite(Number(uiEdgeMatch[5]))
                ? Number(uiEdgeMatch[5])
                : undefined,
          })
          continue
        }
      }
      continue
    }

    const viewMatch = line.match(
      /^view\s+([A-Za-z0-9_-]+)\s+([a-z-]+)(?:\s+parent\s+([A-Za-z0-9_-]+)\s+via\s+([A-Za-z0-9_-]+))?\s*\{$/,
    )
    if (viewMatch) {
      closeView()
      const parent =
        viewMatch[3] && viewMatch[4]
          ? { viewId: viewMatch[3], viaAlias: viewMatch[4] }
          : undefined
      openView = createViewAst(viewMatch[1], toViewKind(viewMatch[2]), parent)
      continue
    }

    if (!openView) {
      continue
    }

    if (openJourney) {
      const threadMatch = line.match(/^thread\s+([A-Za-z0-9_-]+)\s*\{$/)
      if (threadMatch) {
        if (openJourneyThread) {
          throw new Error('SJV Script invalid: nested thread blocks are not supported yet.')
        }
        openJourneyThread = {
          id: threadMatch[1],
          steps: [],
        }
        continue
      }

      if (openJourneyThread) {
        const nestedThreadMatch = line.match(/^thread\s+([A-Za-z0-9_-]+)\s*\{$/)
        if (nestedThreadMatch) {
          throw new Error('SJV Script invalid: nested thread blocks are not supported yet.')
        }
        const threadStepMatch = line.match(/^([A-Za-z0-9_-]+)$/)
        if (threadStepMatch) {
          openJourneyThread.steps.push({ edgeId: threadStepMatch[1] })
          continue
        }
        throw new Error('SJV Script invalid: thread blocks only allow edge ID step lines.')
      }

      const stepMatch = line.match(/^([A-Za-z0-9_-]+)$/)
      if (stepMatch) {
        openJourney.steps.push({ edgeId: stepMatch[1] })
        continue
      }
    }

    const journeyMatch = line.match(
      /^journey\s+([A-Za-z0-9_-]+)\s+"((?:[^"\\]|\\.)+)"(?:\s+color\s+([#A-Za-z0-9_-]+))?\s*\{$/,
    )
    if (journeyMatch) {
      closeJourney()
      openJourney = {
        id: journeyMatch[1],
        name: decodeScriptText(journeyMatch[2]),
        color: journeyMatch[3] ?? '#2563eb',
        steps: [],
      }
      continue
    }

    const noteMatch = line.match(
      /^note\s+([A-Za-z0-9_-]+)\s+on\s+([A-Za-z0-9_-]+)\s+"((?:[^"\\]|\\.)+)"$/,
    )
    if (noteMatch) {
      openView.nodes.push({
        kind: 'note',
        alias: noteMatch[1],
        name: decodeScriptText(noteMatch[3]),
        noteTargetAlias: noteMatch[2],
      })
      continue
    }

    const nodeMatch = line.match(
      /^([a-z-]+)\s+([A-Za-z0-9_-]+)\s+"((?:[^"\\]|\\.)+)"(?:\s+tech\s+([A-Za-z0-9_-]+))?(?:\s+drilldown\s+([A-Za-z0-9_-]+))?(?:\s+contains\s+([A-Za-z0-9_,-\s]+))?$/,
    )
    if (nodeMatch) {
      openView.nodes.push({
        kind: nodeMatch[1],
        alias: nodeMatch[2],
        name: decodeScriptText(nodeMatch[3]),
        techId: nodeMatch[4],
        drilldownToViewId: nodeMatch[5],
        containsAliases: parseAliasList(nodeMatch[6]),
      })
      continue
    }

    const edgeMatch = line.match(
      /^([A-Za-z0-9_-]+)\s*:\s*([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)(?:\s*:\s*([A-Za-z0-9_-]+)(?:\s*"((?:[^"\\]|\\.)*)")?)?$/,
    )
    if (edgeMatch) {
      openView.edges.push({
        id: edgeMatch[1],
        fromAlias: edgeMatch[2],
        toAlias: edgeMatch[3],
        protocol: edgeMatch[4] ?? 'http',
        label: edgeMatch[5] ? decodeScriptText(edgeMatch[5]) : 'request',
      })
      continue
    }
  }

  closeView()
  closeJourney()
  closeJourneyThread()
  closeUiLayoutView()

  if (!result.views.length) {
    throw new Error('SJV Script invalid: no views found.')
  }

  const totalNodeCount = result.views.reduce((sum, view) => sum + view.nodes.length, 0)
  if (totalNodeCount === 0) {
    throw new Error('SJV Script invalid: no nodes found.')
  }

  return result
}

const aliasByNodeId = (nodeId: string): string => {
  const value = nodeId.replace(/^n_/, '')
  return value.length ? value : nodeId
}

export const toJourneyStepText = (step: LiteJourneyStep): string => step.edgeId

export type NodeLineTextOptions = {
  techId?: string
  drilldownToViewId?: string
  containsAliases?: string[]
  noteTargetAlias?: string
}

export const toNodeLineText = (
  kind: string,
  alias: string,
  name: string,
  options?: NodeLineTextOptions,
): string => {
  if (kind === 'note') {
    return `note ${alias} on ${options?.noteTargetAlias ?? 'unknown'} "${encodeScriptText(name)}"`
  }
  const suffix = [
    options?.techId ? ` tech ${options.techId}` : '',
    options?.drilldownToViewId ? ` drilldown ${options.drilldownToViewId}` : '',
    options?.containsAliases?.length ? ` contains ${options.containsAliases.join(',')}` : '',
  ].join('')
  return `${kind} ${alias} "${encodeScriptText(name)}"${suffix}`
}

export const toEdgeLineText = (
  edgeId: string,
  fromAlias: string,
  toAlias: string,
  protocol: string,
  label: string,
): string => `${edgeId}: ${fromAlias} -> ${toAlias} : ${protocol} "${encodeScriptText(label)}"`

export const fallbackAliasFromNodeId = aliasByNodeId
