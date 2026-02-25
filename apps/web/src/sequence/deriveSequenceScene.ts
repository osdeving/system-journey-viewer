/**
 * Purpose: Infer a static sequence-diagram scene IR from the current SJV view and selected journey.
 */

import type { EdgeModel, NodeModel, WorkspaceModel } from '../model/types'
import { deriveThreadTimelineColor } from '../journeys/timelineRows'
import { resolveJourneyPlaybackTicks } from '../journeys/playbackPlan'
import type {
  SequenceDiagramScene,
  SequenceMessage,
  SequenceParticipant,
  SequenceParticipantKind,
  SequenceSceneRow,
} from './types'

type SequenceThemeMode = 'light' | 'dark'

type DeriveSequenceSceneOptions = {
  workspace: WorkspaceModel
  viewId: string
  journeyId: string
  theme: SequenceThemeMode
}

const ASYNC_PROTOCOL_HINTS = new Set([
  'event',
  'async',
  'queue',
  'kafka',
  'sqs',
  'sns',
  'pubsub',
  'webhook',
])

const isHexColor = (value: string | undefined | null): value is string =>
  typeof value === 'string' && /^#([0-9a-f]{6})$/i.test(value.trim())

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)))

const parseHexColor = (value: string): { r: number; g: number; b: number } | null => {
  const match = value.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) {
    return null
  }
  const hex = match[1]
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

const toHexColor = ({ r, g, b }: { r: number; g: number; b: number }): string =>
  `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b)
    .toString(16)
    .padStart(2, '0')}`

const mixHexColors = (left: string, right: string, ratio: number): string => {
  const l = parseHexColor(left)
  const r = parseHexColor(right)
  if (!l || !r) {
    return left
  }
  const t = Math.max(0, Math.min(1, ratio))
  return toHexColor({
    r: l.r * (1 - t) + r.r * t,
    g: l.g * (1 - t) + r.g * t,
    b: l.b * (1 - t) + r.b * t,
  })
}

const normalizeProtocol = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const normalizeLabel = (edge: EdgeModel): string => {
  const label = edge.label?.trim()
  if (label) {
    return label
  }
  return 'request'
}

const resolveArrowStyle = (edge: EdgeModel): SequenceMessage['arrowStyle'] => {
  if (edge.style.dashed) {
    return 'async'
  }
  const protocol = normalizeProtocol(edge.protocolPresetId)?.toLowerCase()
  if (protocol && ASYNC_PROTOCOL_HINTS.has(protocol)) {
    return 'async'
  }
  const label = edge.label?.toLowerCase() ?? ''
  if (label.includes('event') || label.includes('async')) {
    return 'async'
  }
  return 'sync'
}

const resolveParticipantKind = (node: NodeModel): SequenceParticipantKind => {
  if (node.kind === 'system') {
    return 'actor'
  }
  if (node.kind === 'db') {
    return 'database'
  }
  if (node.kind === 'queue') {
    return 'queue'
  }
  if (node.kind === 'gateway' || node.kind === 'load-balancer') {
    return 'gateway'
  }
  if (node.kind === 'security') {
    return 'security'
  }
  return 'participant'
}

const resolveParticipantPalette = (
  node: NodeModel,
  theme: SequenceThemeMode,
): Pick<SequenceParticipant, 'fillColor' | 'textColor' | 'borderColor'> => {
  const baseFill =
    isHexColor(node.style?.fillColor) ? node.style?.fillColor.trim() : theme === 'dark' ? '#1e293b' : '#ffffff'
  const baseText =
    isHexColor(node.style?.textColor) ? node.style?.textColor.trim() : theme === 'dark' ? '#e2e8f0' : '#0f172a'

  const toneByKind: Record<SequenceParticipantKind, string> = {
    actor: theme === 'dark' ? '#0b4b63' : '#e0f2fe',
    participant: theme === 'dark' ? '#1f2937' : '#f8fafc',
    database: theme === 'dark' ? '#3b1f52' : '#f3e8ff',
    queue: theme === 'dark' ? '#3a2b09' : '#fef3c7',
    gateway: theme === 'dark' ? '#0f3a2d' : '#dcfce7',
    security: theme === 'dark' ? '#431407' : '#ffedd5',
  }

  const kind = resolveParticipantKind(node)
  const fillColor = isHexColor(node.style?.fillColor)
    ? baseFill
    : mixHexColors(baseFill, toneByKind[kind], theme === 'dark' ? 0.38 : 0.72)
  const borderColor = mixHexColors(fillColor, theme === 'dark' ? '#e2e8f0' : '#0f172a', theme === 'dark' ? 0.28 : 0.14)

  return {
    fillColor,
    textColor: baseText,
    borderColor,
  }
}

const toLaneLabel = (message: Pick<SequenceMessage, 'laneKind' | 'threadId'>): string =>
  message.laneKind === 'main' ? 'Main' : `Thread ${message.threadId ?? ''}`.trim()

const buildThreadOrderMap = (ticks: ReturnType<typeof resolveJourneyPlaybackTicks>): Map<string, number> => {
  const order = new Map<string, number>()
  let next = 0
  for (const tick of ticks) {
    for (const step of tick.steps) {
      if (step.laneKind !== 'thread' || !step.threadId) {
        continue
      }
      if (!order.has(step.threadId)) {
        order.set(step.threadId, next)
        next += 1
      }
    }
  }
  return order
}

const resolveAccentColor = (
  journeyColor: string,
  laneKind: 'main' | 'thread',
  threadId: string | undefined,
  threadOrderById: Map<string, number>,
): string => {
  if (laneKind !== 'thread' || !threadId) {
    return journeyColor
  }
  const order = threadOrderById.get(threadId) ?? 0
  return deriveThreadTimelineColor(journeyColor, order)
}

const buildMessage = (
  edge: EdgeModel,
  tickIndex: number,
  laneKind: 'main' | 'thread',
  laneStepNumber: number,
  journeyColor: string,
  threadId: string | undefined,
  threadOrderById: Map<string, number>,
  participantIdByNodeId: Map<string, string>,
): SequenceMessage | null => {
  const fromParticipantId = participantIdByNodeId.get(edge.from.nodeId)
  const toParticipantId = participantIdByNodeId.get(edge.to.nodeId)
  if (!fromParticipantId || !toParticipantId) {
    return null
  }

  const message: SequenceMessage = {
    id: `msg:${tickIndex}:${laneKind}:${threadId ?? 'main'}:${edge.id}`,
    edgeId: edge.id,
    fromParticipantId,
    toParticipantId,
    label: normalizeLabel(edge),
    protocol: normalizeProtocol(edge.protocolPresetId),
    arrowStyle: resolveArrowStyle(edge),
    isSelfMessage: edge.from.nodeId === edge.to.nodeId,
    accentColor: resolveAccentColor(journeyColor, laneKind, threadId, threadOrderById),
    tickIndex,
    laneKind,
    threadId,
    laneStepNumber,
    laneLabel: toLaneLabel({ laneKind, threadId }),
  }
  return message
}

const resolveOrderedParticipantNodeIds = (
  workspace: WorkspaceModel,
  viewNodeIdSet: Set<string>,
  ticks: ReturnType<typeof resolveJourneyPlaybackTicks>,
): string[] => {
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const tick of ticks) {
    for (const step of tick.steps) {
      const edge = workspace.edges[step.edgeId]
      if (!edge) {
        continue
      }
      for (const nodeId of [edge.from.nodeId, edge.to.nodeId]) {
        const node = workspace.nodes[nodeId]
        if (!node || node.kind === 'note' || !viewNodeIdSet.has(nodeId) || seen.has(nodeId)) {
          continue
        }
        seen.add(nodeId)
        ordered.push(nodeId)
      }
    }
  }
  return ordered
}

export const deriveSequenceDiagramScene = (
  options: DeriveSequenceSceneOptions,
): SequenceDiagramScene | null => {
  const view = options.workspace.views[options.viewId]
  const journey = options.workspace.journeys[options.journeyId]
  if (!view || !journey || !view.journeyIds.includes(journey.id)) {
    return null
  }

  const ticks = resolveJourneyPlaybackTicks(journey)
  if (!ticks.length) {
    return null
  }

  const viewNodeIdSet = new Set(view.nodeIds)
  const participantNodeIds = resolveOrderedParticipantNodeIds(options.workspace, viewNodeIdSet, ticks)
  if (!participantNodeIds.length) {
    return null
  }

  const participants: SequenceParticipant[] = []
  const participantIdByNodeId = new Map<string, string>()
  for (const nodeId of participantNodeIds) {
    const node = options.workspace.nodes[nodeId]
    if (!node || node.kind === 'note') {
      continue
    }
    const palette = resolveParticipantPalette(node, options.theme)
    const participant: SequenceParticipant = {
      id: `participant:${node.id}`,
      nodeId: node.id,
      name: node.name,
      kind: resolveParticipantKind(node),
      ...palette,
    }
    participants.push(participant)
    participantIdByNodeId.set(node.id, participant.id)
  }

  if (!participants.length) {
    return null
  }

  const rows: SequenceSceneRow[] = []
  const noteNodes = view.nodeIds
    .map((nodeId) => options.workspace.nodes[nodeId])
    .filter((node): node is NodeModel => !!node && node.kind === 'note')

  if (noteNodes.length) {
    rows.push({
      kind: 'section',
      id: 'section:context-notes',
      label: 'Context Notes (inferred from canvas notes)',
      tone: 'neutral',
    })
    noteNodes.forEach((noteNode, index) => {
      const targetParticipantId = noteNode.noteTargetNodeId
        ? participantIdByNodeId.get(noteNode.noteTargetNodeId)
        : undefined
      rows.push({
        kind: 'note',
        id: `note:${noteNode.id}:${index}`,
        label: targetParticipantId ? 'Attached note' : 'Canvas note',
        text: noteNode.name,
        targetParticipantIds: targetParticipantId ? [targetParticipantId] : [],
        backgroundColor:
          (isHexColor(noteNode.style?.fillColor) ? noteNode.style?.fillColor.trim() : undefined) ??
          (options.theme === 'dark' ? '#6b4f12' : '#fff7cc'),
        borderColor:
          (isHexColor(noteNode.style?.textColor) ? noteNode.style?.textColor.trim() : undefined) ??
          (options.theme === 'dark' ? '#facc15' : '#d6a700'),
      })
    })
  }

  rows.push({
    kind: 'section',
    id: 'section:journey-flow',
    label: 'Inferred Journey Flow',
    tone: ticks.some((tick) => tick.steps.length > 1) ? 'parallel' : 'neutral',
  })

  const threadOrderById = buildThreadOrderMap(ticks)
  for (const tick of ticks) {
    const tickLabel = `Tick ${tick.index + 1}`
    const tickMessages = tick.steps
      .map((step) => {
        const edge = options.workspace.edges[step.edgeId]
        if (!edge) {
          return null
        }
        return buildMessage(
          edge,
          tick.index,
          step.laneKind,
          step.n,
          journey.colorKey,
          step.threadId,
          threadOrderById,
          participantIdByNodeId,
        )
      })
      .filter((message): message is SequenceMessage => !!message)

    if (!tickMessages.length) {
      continue
    }

    if (tickMessages.length === 1) {
      rows.push({
        kind: 'message',
        id: `row:${tick.index}`,
        tickLabel,
        message: tickMessages[0],
      })
      continue
    }

    rows.push({
      kind: 'parallel',
      id: `row:${tick.index}:parallel`,
      tickLabel,
      label: `Parallel x${tickMessages.length}`,
      branches: tickMessages,
    })
  }

  if (!rows.length) {
    return null
  }

  return {
    title: `${journey.name}`,
    subtitle: `${options.workspace.workspace.name} · ${view.name} · Inferred from SJV journey`,
    participants,
    rows,
    meta: {
      workspaceName: options.workspace.workspace.name,
      viewId: view.id,
      journeyId: journey.id,
      journeyName: journey.name,
      hasParallel: ticks.some((tick) => tick.steps.length > 1),
      inferredFrom: 'sjv-journey',
    },
  }
}

