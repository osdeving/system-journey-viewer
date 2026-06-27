/**
 * Purpose: Implement editor state management, persistence, and store utilities.
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nearestPortId, nodeCenter } from '../engine/geometry'
import { journeyColorByIndex } from '../journeys/colors'
import {
  resolveJourneyPlaybackLength,
  resolveJourneyPlaybackTick,
  resolveJourneyPrimaryTickStep,
} from '../journeys/playbackPlan'
import { autoArrangeView } from '../layout/autoArrange'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import {
  createShowcaseWorkspace,
  type ShowcaseLocale,
  type ShowcaseMode,
} from '../model/showcaseWorkspace'
import {
  isExperimentalShapeNode,
  isExperimentalShapeKind,
  resolveBasicShapeDefinition,
} from '../model/experimentalShapes'
import { normalizeWorkspaceNodePorts, resolveNodePorts } from '../model/nodePorts'
import { resolveNodePreset, resolveTechPreset } from '../presets/catalog'
import { resolveViewHistoryForView } from '../viewHierarchy'
import type {
  EdgeEndpoint,
  EditorSnapshot,
  EditorActiveTool,
  JourneyFilterAutoLayoutMode,
  JourneyFilterLayoutMode,
  JourneyFilterOffscopeRenderMode,
  JourneyStep,
  BasicShapeKind,
  NodeBounds,
  NodeModel,
  ViewportState,
  WorkspaceModel,
} from '../model/types'
import { loadLatestSnapshot, saveSnapshot } from './persistence'

const DEFAULT_VIEW_ID = 'v_container'
const DEFAULT_VIEWPORT: ViewportState = { x: 100, y: 80, zoom: 1 }
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.8
const DEFAULT_PLAYER_JOURNEY_ID = 'j_c_1'
const DEFAULT_PLAYER_LOOP = true
const DEFAULT_PLAYER_SPEED_MS = 1800
const DEFAULT_PLAYER_HIGHLIGHT_NODES = true
const DEFAULT_PLAYER_TRAIL_ENABLED = false

export type ActiveTool = EditorActiveTool
type SelectOptions = { additive?: boolean }
type EdgeEndpointKey = 'from' | 'to'

interface EditorState {
  workspace: WorkspaceModel
  currentViewId: string
  viewHistory: string[]
  viewport: ViewportState
  selectedNodeId: string | null
  selectedNodeIds: string[]
  selectedEdgeId: string | null
  activeTool: ActiveTool
  pendingConnectionFrom: string | null
  pendingConnectionPortId: string | null
  activeJourneyId: string | null
  journeyFilterId: string | null
  playerJourneyId: string | null
  playerIsRunning: boolean
  playerStepIndex: number
  playerLoop: boolean
  playerSpeedMs: number
  playerHighlightNodes: boolean
  playerTrailEnabled: boolean
  playerConfettiNonce: number
  playerConfettiNodeId: string | null
  hydrate: () => void
  persist: () => void
  resetWorkspace: () => void
  replaceWorkspace: (workspace: WorkspaceModel, viewId?: string) => void
  selectNode: (nodeId: string | null, options?: SelectOptions) => void
  selectNodes: (nodeIds: string[], options?: SelectOptions) => void
  selectEdge: (edgeId: string | null) => void
  openDrilldown: (nodeId: string) => void
  createDrilldownForNode: (nodeId: string) => string | null
  navigateBack: () => void
  goToView: (viewId: string) => void
  setActiveTool: (tool: ActiveTool) => void
  setViewport: (viewport: ViewportState) => void
  zoomByFactor: (factor: number) => void
  addNode: (presetId: string, x: number, y: number) => string
  addBasicShape: (shapeKind: BasicShapeKind, bounds: NodeBounds) => string
  removeNode: (nodeId: string) => void
  removeEdge: (edgeId: string) => void
  setNodeBounds: (nodeId: string, bounds: NodeBounds) => void
  setNodesBounds: (updates: Array<{ nodeId: string; bounds: NodeBounds }>) => void
  addAttachedNote: (targetNodeId: string) => string | null
  attachNoteToNode: (noteNodeId: string, targetNodeId: string, autoPlace?: boolean) => void
  moveNode: (nodeId: string, dx: number, dy: number) => void
  setNodeName: (nodeId: string, name: string) => void
  setNodeTech: (nodeId: string, techLabel: string) => void
  setNodeColor: (nodeId: string, fillColor: string) => void
  setNodeTextColor: (nodeId: string, textColor: string) => void
  beginConnection: (nodeId: string, portId?: string) => void
  connectPendingTo: (targetNodeId: string, portId?: string) => void
  cancelPendingConnection: () => void
  reconnectEdgeEndpoint: (
    edgeId: string,
    endpoint: EdgeEndpointKey,
    targetNodeId: string,
    targetPortId?: string,
  ) => void
  setEdgeProtocol: (edgeId: string, protocolPresetId: string) => void
  setEdgeLabel: (edgeId: string, label: string) => void
  setEdgeLabelFontSize: (edgeId: string, fontSize: number) => void
  setEdgeLabelPosition: (edgeId: string, position: number) => void
  setEdgeLabelSide: (edgeId: string, side: 'left' | 'right') => void
  setEdgeLabelAngle: (edgeId: string, angleDeg: number) => void
  duplicateSelection: (offset?: { dx: number; dy: number }) => {
    nodeIds: string[]
    edgeId: string | null
  }
  autoArrangeCurrentView: (scope?: { nodeIds?: string[]; edgeIds?: string[] }) => void
  setGridEnabled: (enabled: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  setTheme: (theme: WorkspaceModel['settings']['theme']) => void
  setJourneyFocusSettings: (settings: Partial<{
    offscopeRenderMode: JourneyFilterOffscopeRenderMode
    layoutMode: JourneyFilterLayoutMode
    autoLayoutMode: JourneyFilterAutoLayoutMode
  }>) => void
  loadShowcaseWorkspace: (options?: {
    locale?: ShowcaseLocale
    mode?: ShowcaseMode
  }) => void
  createJourney: (name?: string) => string
  setActiveJourney: (journeyId: string | null) => void
  setJourneyFilter: (journeyId: string | null) => void
  reorderJourneyInCurrentView: (journeyId: string, targetJourneyId: string) => void
  addEdgeToJourney: (journeyId: string, edgeId: string) => void
  removeEdgeFromJourney: (journeyId: string, edgeId: string) => void
  reorderJourneyStep: (journeyId: string, edgeId: string, targetEdgeId: string) => void
  setPlayerJourney: (journeyId: string | null) => void
  setPlayerRunning: (running: boolean) => void
  setPlayerLoop: (loop: boolean) => void
  setPlayerSpeedMs: (speedMs: number) => void
  setPlayerHighlightNodes: (enabled: boolean) => void
  setPlayerTrailEnabled: (enabled: boolean) => void
  prevPlayerStep: () => void
  stepPlayer: () => void
  resetPlayer: () => void
}

const getDefaultState = (): Pick<
  EditorState,
  | 'workspace'
  | 'currentViewId'
  | 'viewHistory'
  | 'viewport'
  | 'selectedNodeId'
  | 'selectedNodeIds'
  | 'selectedEdgeId'
  | 'activeTool'
  | 'pendingConnectionFrom'
  | 'pendingConnectionPortId'
  | 'activeJourneyId'
  | 'journeyFilterId'
  | 'playerJourneyId'
  | 'playerIsRunning'
  | 'playerStepIndex'
  | 'playerLoop'
  | 'playerSpeedMs'
  | 'playerHighlightNodes'
  | 'playerTrailEnabled'
  | 'playerConfettiNonce'
  | 'playerConfettiNodeId'
> => {
  const fallbackWorkspace = createDefaultWorkspace()
  const snapshot = loadLatestSnapshot()
  if (!snapshot) {
    return {
      workspace: fallbackWorkspace,
      currentViewId: DEFAULT_VIEW_ID,
      viewHistory: [],
      viewport: DEFAULT_VIEWPORT,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      activeTool: 'select',
      pendingConnectionFrom: null,
      pendingConnectionPortId: null,
      activeJourneyId: null,
      journeyFilterId: null,
      playerJourneyId: DEFAULT_PLAYER_JOURNEY_ID,
      playerIsRunning: false,
      playerStepIndex: 0,
      playerLoop: DEFAULT_PLAYER_LOOP,
      playerSpeedMs: DEFAULT_PLAYER_SPEED_MS,
      playerHighlightNodes: DEFAULT_PLAYER_HIGHLIGHT_NODES,
      playerTrailEnabled: DEFAULT_PLAYER_TRAIL_ENABLED,
      playerConfettiNonce: 0,
      playerConfettiNodeId: null,
    }
  }
  const normalizedWorkspace = normalizeWorkspaceNodePorts(snapshot.workspace)
  const fallbackViewId = Object.keys(normalizedWorkspace.views)[0] ?? DEFAULT_VIEW_ID
  const resolvedViewId = normalizedWorkspace.views[snapshot.currentViewId]
    ? snapshot.currentViewId
    : fallbackViewId
  const currentView = normalizedWorkspace.views[resolvedViewId]
  const currentViewNodeIds = new Set(currentView?.nodeIds ?? [])
  const currentViewEdgeIds = new Set(currentView?.edgeIds ?? [])
  const currentViewJourneyIds = new Set(currentView?.journeyIds ?? [])
  const resolveNullableJourneyId = (candidate: string | null | undefined): string | null =>
    candidate && currentViewJourneyIds.has(candidate) ? candidate : null
  const selectedNodeIds = (snapshot.selectedNodeIds ?? []).filter((nodeId) => currentViewNodeIds.has(nodeId))
  const selectedNodeId =
    snapshot.selectedNodeId && currentViewNodeIds.has(snapshot.selectedNodeId)
      ? snapshot.selectedNodeId
      : selectedNodeIds[selectedNodeIds.length - 1] ?? null
  const viewHistory = (snapshot.viewHistory ?? []).filter(
    (viewId, index, values) =>
      typeof viewId === 'string' &&
      normalizedWorkspace.views[viewId] &&
      viewId !== resolvedViewId &&
      values.indexOf(viewId) === index,
  )
  const pendingConnectionFrom =
    snapshot.pendingConnectionFrom && currentViewNodeIds.has(snapshot.pendingConnectionFrom)
      ? snapshot.pendingConnectionFrom
      : null
  const playerJourneyId =
    resolveNullableJourneyId(snapshot.playerJourneyId) ??
    currentView?.journeyIds[0] ??
    DEFAULT_PLAYER_JOURNEY_ID
  const activeJourneyId =
    resolveNullableJourneyId(snapshot.activeJourneyId) ??
    playerJourneyId
  const journeyFilterId = resolveNullableJourneyId(snapshot.journeyFilterId)
  const resolvedPlayerStepIndex = Math.max(
    0,
    Math.min(
      Number.isInteger(snapshot.playerStepIndex ?? 0) ? (snapshot.playerStepIndex as number) : 0,
      Math.max(0, (playerJourneyId && normalizedWorkspace.journeys[playerJourneyId]?.steps.length
        ? normalizedWorkspace.journeys[playerJourneyId].steps.length - 1
        : 0)),
    ),
  )
  return {
    workspace: normalizedWorkspace,
    currentViewId: resolvedViewId,
    viewHistory,
    viewport: snapshot.viewport,
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeId:
      snapshot.selectedEdgeId && currentViewEdgeIds.has(snapshot.selectedEdgeId) ? snapshot.selectedEdgeId : null,
    activeTool: resolveSnapshotActiveTool(snapshot.activeTool),
    pendingConnectionFrom,
    pendingConnectionPortId: pendingConnectionFrom ? snapshot.pendingConnectionPortId ?? null : null,
    activeJourneyId,
    journeyFilterId,
    playerJourneyId,
    playerIsRunning: snapshot.playerIsRunning ?? false,
    playerStepIndex: resolvedPlayerStepIndex,
    playerLoop: snapshot.playerLoop ?? DEFAULT_PLAYER_LOOP,
    playerSpeedMs:
      Number.isInteger(snapshot.playerSpeedMs) && (snapshot.playerSpeedMs ?? 0) > 0
        ? (snapshot.playerSpeedMs as number)
        : DEFAULT_PLAYER_SPEED_MS,
    playerHighlightNodes: snapshot.playerHighlightNodes ?? DEFAULT_PLAYER_HIGHLIGHT_NODES,
    playerTrailEnabled: snapshot.playerTrailEnabled ?? DEFAULT_PLAYER_TRAIL_ENABLED,
    playerConfettiNonce: 0,
    playerConfettiNodeId: null,
  }
}

const toSnapshot = (state: EditorState): EditorSnapshot => ({
  workspace: state.workspace,
  currentViewId: state.currentViewId,
  viewport: state.viewport,
  viewHistory: state.viewHistory,
  selectedNodeId: state.selectedNodeId,
  selectedNodeIds: state.selectedNodeIds,
  selectedEdgeId: state.selectedEdgeId,
  activeTool: state.activeTool,
  pendingConnectionFrom: state.pendingConnectionFrom,
  pendingConnectionPortId: state.pendingConnectionPortId,
  activeJourneyId: state.activeJourneyId,
  journeyFilterId: state.journeyFilterId,
  playerJourneyId: state.playerJourneyId,
  playerIsRunning: state.playerIsRunning,
  playerStepIndex: state.playerStepIndex,
  playerLoop: state.playerLoop,
  playerSpeedMs: state.playerSpeedMs,
  playerHighlightNodes: state.playerHighlightNodes,
  playerTrailEnabled: state.playerTrailEnabled,
})

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

const resolveSnapshotActiveTool = (activeTool: EditorSnapshot['activeTool']): ActiveTool => {
  if (activeTool === 'connector' || activeTool === 'select') {
    return activeTool
  }
  return activeTool && isExperimentalShapeKind(activeTool) ? activeTool : 'select'
}

const nextNumericId = (
  collection: Record<string, unknown>,
  prefix: string,
): string => {
  const regex = new RegExp(`^${prefix}_(\\d+)$`)
  const max = Object.keys(collection).reduce((accumulator, id) => {
    const match = id.match(regex)
    if (!match) {
      return accumulator
    }
    return Math.max(accumulator, Number(match[1]))
  }, 0)
  return `${prefix}_${max + 1}`
}

const createNode = (id: string, presetId: string, x: number, y: number): NodeModel => {
  const preset = resolveNodePreset(presetId) ?? resolveNodePreset('container')
  const techPreset =
    preset && preset.kind !== 'note' ? resolveTechPreset(preset.defaultTechId) : undefined
  const bounds = {
    x,
    y,
    w: preset?.defaultWidth ?? 220,
    h: preset?.defaultHeight ?? 120,
  }
  return {
    id,
    presetId: preset?.id,
    kind: (preset?.kind ?? 'container') as NodeModel['kind'],
    name: `${preset?.label ?? 'Container'} ${id.replace('n_', '')}`,
    tags: [],
    tech: techPreset
      ? { id: techPreset.id, label: techPreset.label, iconKey: techPreset.iconKey }
      : undefined,
    bounds,
    ports: resolveNodePorts(bounds, (preset?.kind ?? 'container') as NodeModel['kind']),
    children: [],
  }
}

const createBasicShapeNode = (
  id: string,
  shapeKind: BasicShapeKind,
  bounds: NodeBounds,
): NodeModel => {
  const definition = resolveBasicShapeDefinition(shapeKind)
  return {
    id,
    presetId: definition.kind,
    kind: definition.kind,
    name: definition.label,
    description: 'Experimental canvas shape. Excluded from SJV Script and journey playback.',
    tags: ['experimental-shape'],
    style: {
      fillColor: definition.fillColor,
      textColor: definition.textColor,
    },
    bounds,
    ports: resolveNodePorts(bounds, definition.kind),
    children: [],
  }
}

const applyNodeBounds = (node: NodeModel, bounds: NodeBounds): void => {
  const sizeChanged = node.bounds.w !== bounds.w || node.bounds.h !== bounds.h
  node.bounds = bounds
  if (sizeChanged) {
    node.ports = resolveNodePorts(bounds, node.kind)
  }
}

const resolveEndpointPortId = (
  endpoint: EdgeEndpoint,
  oppositeNode: NodeModel,
  targetNode: NodeModel,
  explicitPortId?: string,
): string | undefined =>
  explicitPortId ?? endpoint.portId ?? nearestPortId(targetNode, nodeCenter(oppositeNode))

const nextJourneyStepNumber = (used: number[]): number => {
  let candidate = 1
  const usedSet = new Set(used)
  while (usedSet.has(candidate)) {
    candidate += 1
  }
  return candidate
}

const firstJourneyForView = (workspace: WorkspaceModel, viewId: string): string | null =>
  workspace.views[viewId]?.journeyIds[0] ?? null

const MIN_EDGE_LABEL_POSITION = 0.08
const MAX_EDGE_LABEL_POSITION = 0.92
const MIN_EDGE_LABEL_FONT_SIZE = 9
const MAX_EDGE_LABEL_FONT_SIZE = 28
const MIN_EDGE_LABEL_ANGLE_DEG = -180
const MAX_EDGE_LABEL_ANGLE_DEG = 180

const clampEdgeLabelPosition = (position: number): number =>
  Math.min(MAX_EDGE_LABEL_POSITION, Math.max(MIN_EDGE_LABEL_POSITION, position))

const clampEdgeLabelFontSize = (fontSize: number): number =>
  Math.min(MAX_EDGE_LABEL_FONT_SIZE, Math.max(MIN_EDGE_LABEL_FONT_SIZE, fontSize))

const clampEdgeLabelAngle = (angleDeg: number): number =>
  Math.min(MAX_EDGE_LABEL_ANGLE_DEG, Math.max(MIN_EDGE_LABEL_ANGLE_DEG, angleDeg))

const resolveEdgeLabelSide = (side?: string): 'left' | 'right' =>
  side === 'right' ? 'right' : 'left'

const normalizeJourneySteps = <T extends { n: number }>(steps: T[]): T[] =>
  steps.map((step, index) => ({ ...step, n: index + 1 }))

const nextViewKindForDrilldown = (viewKind: WorkspaceModel['views'][string]['kind']) => {
  if (viewKind === 'system-context') {
    return 'container'
  }
  if (viewKind === 'container') {
    return 'component'
  }
  return 'hex'
}

const sanitizeIdPart = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const resolveUniqueId = (
  collection: Record<string, unknown>,
  preferredBase: string,
  fallbackPrefix: string,
): string => {
  const base = sanitizeIdPart(preferredBase) || fallbackPrefix
  let candidate = base
  let suffix = 2
  while (collection[candidate]) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  return candidate
}

const NOTE_ATTACH_GAP = 36
const NOTE_COLLISION_PADDING = 18

const resolveOverlapArea = (left: NodeBounds, right: NodeBounds): number => {
  const overlapX = Math.max(
    0,
    Math.min(left.x + left.w, right.x + right.w) - Math.max(left.x, right.x),
  )
  const overlapY = Math.max(
    0,
    Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y),
  )
  return overlapX * overlapY
}

const resolveAttachedNoteBounds = (
  workspace: WorkspaceModel,
  viewId: string,
  targetNodeId: string,
  noteSize: Pick<NodeBounds, 'w' | 'h'>,
  options?: { ignoreNodeId?: string },
): NodeBounds | null => {
  const view = workspace.views[viewId]
  const targetNode = workspace.nodes[targetNodeId]
  if (!view || !targetNode) {
    return null
  }

  const target = targetNode.bounds
  const candidates: NodeBounds[] = [
    {
      x: target.x + target.w + NOTE_ATTACH_GAP,
      y: target.y + (target.h - noteSize.h) / 2,
      w: noteSize.w,
      h: noteSize.h,
    },
    {
      x: target.x - noteSize.w - NOTE_ATTACH_GAP,
      y: target.y + (target.h - noteSize.h) / 2,
      w: noteSize.w,
      h: noteSize.h,
    },
    {
      x: target.x + (target.w - noteSize.w) / 2,
      y: target.y + target.h + NOTE_ATTACH_GAP,
      w: noteSize.w,
      h: noteSize.h,
    },
    {
      x: target.x + (target.w - noteSize.w) / 2,
      y: target.y - noteSize.h - NOTE_ATTACH_GAP,
      w: noteSize.w,
      h: noteSize.h,
    },
  ]

  const otherNodes = view.nodeIds
    .map((nodeId) => workspace.nodes[nodeId])
    .filter(
      (node): node is NodeModel =>
        !!node &&
        node.id !== targetNodeId &&
        node.id !== options?.ignoreNodeId,
    )

  let best: NodeBounds | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const collisionScore = otherNodes.reduce((score, node) => {
      const expanded = {
        x: node.bounds.x - NOTE_COLLISION_PADDING,
        y: node.bounds.y - NOTE_COLLISION_PADDING,
        w: node.bounds.w + NOTE_COLLISION_PADDING * 2,
        h: node.bounds.h + NOTE_COLLISION_PADDING * 2,
      }
      return score + resolveOverlapArea(candidate, expanded)
    }, 0)
    const targetCenterX = target.x + target.w / 2
    const targetCenterY = target.y + target.h / 2
    const noteCenterX = candidate.x + candidate.w / 2
    const noteCenterY = candidate.y + candidate.h / 2
    const distanceScore = Math.hypot(noteCenterX - targetCenterX, noteCenterY - targetCenterY)
    const score = collisionScore * 1000 + distanceScore

    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

const syncPlayerForJourneySteps = (
  state: Pick<
    EditorState,
    'workspace' | 'playerJourneyId' | 'playerStepIndex' | 'playerIsRunning' | 'playerConfettiNodeId'
  >,
) => {
  if (!state.playerJourneyId) {
    state.playerIsRunning = false
    state.playerStepIndex = 0
    state.playerConfettiNodeId = null
    return
  }
  const activePlayerJourney = state.workspace.journeys[state.playerJourneyId]
  const playbackLength = resolveJourneyPlaybackLength(activePlayerJourney)
  if (!playbackLength) {
    state.playerIsRunning = false
    state.playerStepIndex = 0
    state.playerConfettiNodeId = null
    return
  }
  if (state.playerStepIndex >= playbackLength) {
    state.playerStepIndex = playbackLength - 1
    state.playerIsRunning = false
  }
}

const removeEdgeFromWorkspaceState = (
  state: Pick<
    EditorState,
    | 'workspace'
    | 'selectedEdgeId'
    | 'playerJourneyId'
    | 'playerStepIndex'
    | 'playerIsRunning'
    | 'playerConfettiNodeId'
  >,
  edgeId: string,
): boolean => {
  if (!state.workspace.edges[edgeId]) {
    return false
  }
  delete state.workspace.edges[edgeId]

  for (const view of Object.values(state.workspace.views)) {
    view.edgeIds = view.edgeIds.filter((candidate) => candidate !== edgeId)
  }

  for (const journey of Object.values(state.workspace.journeys)) {
    const removeFromThreadSteps = (threadSteps: JourneyStep[]): JourneyStep[] =>
      normalizeJourneySteps(
        threadSteps
          .slice()
          .sort((left, right) => left.n - right.n)
          .filter((step) => step.edgeId !== edgeId),
      )

    const hasEdgeInJourney =
      journey.steps.some((step) => step.edgeId === edgeId) ||
      journey.steps.some((step) => (step.threads ?? []).some((thread) => thread.steps.some((threadStep) => threadStep.edgeId === edgeId)))
    if (!hasEdgeInJourney) {
      continue
    }
    const ordered = journey.steps
      .slice()
      .sort((left, right) => left.n - right.n)
      .filter((step) => step.edgeId !== edgeId)
      .map((step) => {
        const filteredThreads = (step.threads ?? [])
          .map((thread) => ({
            ...thread,
            steps: removeFromThreadSteps(thread.steps),
          }))
          .filter((thread) => thread.steps.length > 0)
        if (filteredThreads.length) {
          return { ...step, threads: filteredThreads }
        }
        const stepWithoutThreads = { ...step }
        delete stepWithoutThreads.threads
        return stepWithoutThreads
      })
    journey.steps = normalizeJourneySteps(ordered)
  }

  if (state.selectedEdgeId === edgeId) {
    state.selectedEdgeId = null
  }
  syncPlayerForJourneySteps(state)
  return true
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    ...getDefaultState(),
    hydrate: () => {
      const defaults = getDefaultState()
      set({
        workspace: defaults.workspace,
        currentViewId: defaults.currentViewId,
        viewHistory: defaults.viewHistory,
        viewport: defaults.viewport,
        selectedNodeId: defaults.selectedNodeId,
        selectedNodeIds: defaults.selectedNodeIds,
        selectedEdgeId: defaults.selectedEdgeId,
        activeTool: defaults.activeTool,
        pendingConnectionFrom: defaults.pendingConnectionFrom,
        pendingConnectionPortId: defaults.pendingConnectionPortId,
        activeJourneyId: defaults.activeJourneyId,
        journeyFilterId: defaults.journeyFilterId,
        playerJourneyId: defaults.playerJourneyId,
        playerIsRunning: defaults.playerIsRunning,
        playerStepIndex: defaults.playerStepIndex,
        playerLoop: defaults.playerLoop,
        playerSpeedMs: defaults.playerSpeedMs,
        playerHighlightNodes: defaults.playerHighlightNodes,
        playerTrailEnabled: defaults.playerTrailEnabled,
        playerConfettiNonce: 0,
        playerConfettiNodeId: null,
      })
    },
    persist: () => {
      saveSnapshot(toSnapshot(get()))
    },
    resetWorkspace: () => {
      set({
        workspace: createDefaultWorkspace(),
        currentViewId: DEFAULT_VIEW_ID,
        viewHistory: [],
        viewport: DEFAULT_VIEWPORT,
        selectedNodeId: null,
        selectedNodeIds: [],
        selectedEdgeId: null,
        activeTool: 'select',
        pendingConnectionFrom: null,
        pendingConnectionPortId: null,
        activeJourneyId: DEFAULT_PLAYER_JOURNEY_ID,
        journeyFilterId: null,
        playerJourneyId: DEFAULT_PLAYER_JOURNEY_ID,
        playerIsRunning: false,
        playerStepIndex: 0,
        playerLoop: DEFAULT_PLAYER_LOOP,
        playerSpeedMs: DEFAULT_PLAYER_SPEED_MS,
        playerHighlightNodes: DEFAULT_PLAYER_HIGHLIGHT_NODES,
        playerTrailEnabled: DEFAULT_PLAYER_TRAIL_ENABLED,
        playerConfettiNonce: 0,
        playerConfettiNodeId: null,
      })
      saveSnapshot(toSnapshot(get()))
    },
    replaceWorkspace: (workspace, viewId) => {
      const normalizedWorkspace = normalizeWorkspaceNodePorts(workspace)
      const fallbackViewId = Object.keys(normalizedWorkspace.views)[0] ?? DEFAULT_VIEW_ID
      const firstViewId =
        (viewId && normalizedWorkspace.views[viewId] ? viewId : undefined) ?? fallbackViewId
      const firstJourneyId = firstJourneyForView(normalizedWorkspace, firstViewId)
      const viewHistory = resolveViewHistoryForView(normalizedWorkspace, firstViewId)
      set((state) => {
        state.workspace = normalizedWorkspace
        state.currentViewId = firstViewId
        state.viewHistory = viewHistory
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.selectedEdgeId = null
        state.pendingConnectionFrom = null
        state.pendingConnectionPortId = null
        state.activeJourneyId = firstJourneyId
        state.journeyFilterId = null
        state.playerJourneyId = firstJourneyId
        state.playerIsRunning = false
        state.playerStepIndex = 0
        state.playerConfettiNodeId = null
      })
    },
    selectNode: (nodeId, options) => {
      set((state) => {
        if (!nodeId) {
          state.selectedNodeId = null
          state.selectedNodeIds = []
          state.selectedEdgeId = null
          return
        }
        const additive = options?.additive ?? false
        if (!additive) {
          state.selectedNodeId = nodeId
          state.selectedNodeIds = [nodeId]
          state.selectedEdgeId = null
          return
        }

        const alreadySelected = state.selectedNodeIds.includes(nodeId)
        if (alreadySelected) {
          state.selectedNodeIds = state.selectedNodeIds.filter((candidate) => candidate !== nodeId)
          state.selectedNodeId = state.selectedNodeIds[state.selectedNodeIds.length - 1] ?? null
        } else {
          state.selectedNodeIds.push(nodeId)
          state.selectedNodeId = nodeId
        }
        state.selectedEdgeId = null
      })
    },
    selectNodes: (nodeIds, options) => {
      set((state) => {
        const currentView = state.workspace.views[state.currentViewId]
        const currentViewNodeIds = new Set(currentView?.nodeIds ?? [])
        const nextNodeIds = Array.from(
          new Set(
            nodeIds.filter(
              (nodeId) =>
                typeof nodeId === 'string' &&
                currentViewNodeIds.has(nodeId) &&
                Boolean(state.workspace.nodes[nodeId]),
            ),
          ),
        )
        const additive = options?.additive ?? false

        if (!additive) {
          state.selectedNodeIds = nextNodeIds
          state.selectedNodeId = nextNodeIds[nextNodeIds.length - 1] ?? null
          state.selectedEdgeId = null
          return
        }

        const mergedNodeIds = Array.from(new Set([...state.selectedNodeIds, ...nextNodeIds]))
        state.selectedNodeIds = mergedNodeIds
        state.selectedNodeId =
          nextNodeIds[nextNodeIds.length - 1] ??
          mergedNodeIds[mergedNodeIds.length - 1] ??
          null
        state.selectedEdgeId = null
      })
    },
    selectEdge: (edgeId) => {
      set((state) => {
        state.selectedEdgeId = edgeId
        state.selectedNodeId = null
        state.selectedNodeIds = []
      })
    },
    openDrilldown: (nodeId) => {
      set((state) => {
        const node = state.workspace.nodes[nodeId]
        const targetViewId = node?.drilldownRef
        if (!targetViewId || !state.workspace.views[targetViewId]) {
          return
        }
        const firstJourneyId = firstJourneyForView(state.workspace, targetViewId)
        state.viewHistory.push(state.currentViewId)
        state.currentViewId = targetViewId
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.selectedEdgeId = null
        state.pendingConnectionFrom = null
        state.pendingConnectionPortId = null
        state.activeJourneyId = firstJourneyId
        state.journeyFilterId = null
        state.playerJourneyId = firstJourneyId
        state.playerIsRunning = false
        state.playerStepIndex = 0
        state.playerConfettiNodeId = null
      })
    },
    createDrilldownForNode: (nodeId) => {
      let createdViewId: string | null = null
      set((state) => {
        const sourceNode = state.workspace.nodes[nodeId]
        const currentView = state.workspace.views[state.currentViewId]
        if (!sourceNode || !currentView) {
          return
        }

        let targetViewId =
          sourceNode.drilldownRef && state.workspace.views[sourceNode.drilldownRef]
            ? sourceNode.drilldownRef
            : undefined

        if (!targetViewId) {
          const nextKind = nextViewKindForDrilldown(currentView.kind)
          const baseViewId = resolveUniqueId(
            state.workspace.views,
            `v-${nextKind}-${sourceNode.name}`,
            `v-${nextKind}`,
          )
          targetViewId = baseViewId

          const boundaryNodeId = resolveUniqueId(
            state.workspace.nodes,
            `n-${targetViewId}-boundary`,
            `n-${targetViewId}`,
          )
          const boundaryBounds = {
            x: 80,
            y: 80,
            w: 980,
            h: 620,
          }

          state.workspace.nodes[boundaryNodeId] = {
            id: boundaryNodeId,
            presetId: 'boundary',
            kind: 'boundary',
            name: `${sourceNode.name} Boundary`,
              tags: ['drilldown-root'],
              bounds: boundaryBounds,
              ports: resolveNodePorts(boundaryBounds, 'boundary'),
              children: [],
            }
          state.workspace.views[targetViewId] = {
            id: targetViewId,
            kind: nextKind,
            name: `${sourceNode.name} Detail`,
            nodeIds: [boundaryNodeId],
            edgeIds: [],
            journeyIds: [],
          }
        }

        sourceNode.drilldownRef = targetViewId
        sourceNode.kind = 'boundary'
        sourceNode.presetId = 'boundary'

        const firstJourneyId = firstJourneyForView(state.workspace, targetViewId)
        state.viewHistory.push(state.currentViewId)
        state.currentViewId = targetViewId
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.selectedEdgeId = null
        state.pendingConnectionFrom = null
        state.pendingConnectionPortId = null
        state.activeJourneyId = firstJourneyId
        state.journeyFilterId = null
        state.playerJourneyId = firstJourneyId
        state.playerIsRunning = false
        state.playerStepIndex = 0
        state.playerConfettiNodeId = null
        createdViewId = targetViewId
      })
      return createdViewId
    },
    navigateBack: () => {
      set((state) => {
        const previousViewId = state.viewHistory.pop()
        if (!previousViewId || !state.workspace.views[previousViewId]) {
          return
        }
        const firstJourneyId = firstJourneyForView(state.workspace, previousViewId)
        state.currentViewId = previousViewId
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.selectedEdgeId = null
        state.pendingConnectionFrom = null
        state.pendingConnectionPortId = null
        state.activeJourneyId = firstJourneyId
        state.journeyFilterId = null
        state.playerJourneyId = firstJourneyId
        state.playerIsRunning = false
        state.playerStepIndex = 0
        state.playerConfettiNodeId = null
      })
    },
    goToView: (viewId) => {
      set((state) => {
        const view = state.workspace.views[viewId]
        if (!view) {
          return
        }
        const firstJourneyId = view.journeyIds[0] ?? null
        const viewHistory = resolveViewHistoryForView(state.workspace, viewId)
        state.currentViewId = viewId
        state.viewHistory = viewHistory
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.selectedEdgeId = null
        state.pendingConnectionFrom = null
        state.pendingConnectionPortId = null
        state.activeJourneyId = firstJourneyId
        state.journeyFilterId = null
        state.playerJourneyId = firstJourneyId
        state.playerIsRunning = false
        state.playerStepIndex = 0
      })
    },
    setActiveTool: (tool) => {
      set((state) => {
        state.activeTool = tool
        if (tool !== 'connector') {
          state.pendingConnectionFrom = null
          state.pendingConnectionPortId = null
        }
      })
    },
    setViewport: (viewport) => {
      set((state) => {
        state.viewport = { ...viewport, zoom: clampZoom(viewport.zoom) }
      })
    },
    zoomByFactor: (factor) => {
      set((state) => {
        state.viewport.zoom = clampZoom(state.viewport.zoom * factor)
      })
    },
    addNode: (presetId, x, y) => {
      const nodeId = nextNumericId(get().workspace.nodes, 'n')
      set((state) => {
        const view = state.workspace.views[state.currentViewId]
        if (!view) {
          return
        }
        state.workspace.nodes[nodeId] = createNode(nodeId, presetId, x, y)
        view.nodeIds.push(nodeId)
        state.selectedNodeId = nodeId
        state.selectedNodeIds = [nodeId]
        state.selectedEdgeId = null
      })
      return nodeId
    },
    addBasicShape: (shapeKind, bounds) => {
      const nodeId = nextNumericId(get().workspace.nodes, 'n')
      set((state) => {
        const view = state.workspace.views[state.currentViewId]
        if (!view) {
          return
        }
        state.workspace.nodes[nodeId] = createBasicShapeNode(nodeId, shapeKind, bounds)
        view.nodeIds.push(nodeId)
        state.selectedNodeId = nodeId
        state.selectedNodeIds = [nodeId]
        state.selectedEdgeId = null
      })
      return nodeId
    },
    removeNode: (nodeId) => {
      set((state) => {
        if (!state.workspace.nodes[nodeId]) {
          return
        }

        const attachedNotes = Object.values(state.workspace.nodes)
          .filter((node) => node.kind === 'note' && node.noteTargetNodeId === nodeId)
          .map((node) => node.id)

        const nodesToRemove = new Set([nodeId, ...attachedNotes])
        const connectedEdgeIds = new Set<string>()
        for (const [edgeId, edge] of Object.entries(state.workspace.edges)) {
          if (nodesToRemove.has(edge.from.nodeId) || nodesToRemove.has(edge.to.nodeId)) {
            connectedEdgeIds.add(edgeId)
          }
        }

        for (const view of Object.values(state.workspace.views)) {
          view.nodeIds = view.nodeIds.filter((candidate) => !nodesToRemove.has(candidate))
        }

        for (const edgeId of connectedEdgeIds) {
          removeEdgeFromWorkspaceState(state, edgeId)
        }

        for (const candidateId of nodesToRemove) {
          delete state.workspace.nodes[candidateId]
        }

        for (const node of Object.values(state.workspace.nodes)) {
          if (node.noteTargetNodeId && nodesToRemove.has(node.noteTargetNodeId)) {
            node.noteTargetNodeId = undefined
          }
        }

        if (state.pendingConnectionFrom && nodesToRemove.has(state.pendingConnectionFrom)) {
          state.pendingConnectionFrom = null
        }
        if (state.selectedNodeId && nodesToRemove.has(state.selectedNodeId)) {
          state.selectedNodeId = null
        }
        if (state.selectedNodeIds.some((candidate) => nodesToRemove.has(candidate))) {
          state.selectedNodeIds = state.selectedNodeIds.filter((candidate) => !nodesToRemove.has(candidate))
          if (!state.selectedNodeId) {
            state.selectedNodeId = state.selectedNodeIds[state.selectedNodeIds.length - 1] ?? null
          }
        }
        syncPlayerForJourneySteps(state)
      })
    },
    removeEdge: (edgeId) => {
      set((state) => {
        removeEdgeFromWorkspaceState(state, edgeId)
      })
    },
    setNodeBounds: (nodeId, bounds) => {
      set((state) => {
        const node = state.workspace.nodes[nodeId]
        if (!node) {
          return
        }
        applyNodeBounds(node, bounds)
      })
    },
    setNodesBounds: (updates) => {
      set((state) => {
        for (const update of updates) {
          const node = state.workspace.nodes[update.nodeId]
          if (!node) {
            continue
          }
          applyNodeBounds(node, update.bounds)
        }
      })
    },
    addAttachedNote: (targetNodeId) => {
      let createdNoteId: string | null = null
      set((state) => {
        const view = state.workspace.views[state.currentViewId]
        const targetNode = state.workspace.nodes[targetNodeId]
        if (!view || !targetNode || !view.nodeIds.includes(targetNodeId) || targetNode.kind === 'note') {
          return
        }

        const noteNodeId = nextNumericId(state.workspace.nodes, 'n')
        const baseX = targetNode.bounds.x + targetNode.bounds.w + NOTE_ATTACH_GAP
        const baseY = targetNode.bounds.y
        const noteNode = createNode(noteNodeId, 'note', baseX, baseY)
        noteNode.noteTargetNodeId = targetNodeId

        const autoBounds = resolveAttachedNoteBounds(
          state.workspace,
          state.currentViewId,
          targetNodeId,
          { w: noteNode.bounds.w, h: noteNode.bounds.h },
        )
        if (autoBounds) {
          noteNode.bounds = autoBounds
          noteNode.ports = resolveNodePorts(autoBounds, noteNode.kind)
        }

        state.workspace.nodes[noteNodeId] = noteNode
        view.nodeIds.push(noteNodeId)
        state.selectedNodeId = noteNodeId
        state.selectedNodeIds = [noteNodeId]
        state.selectedEdgeId = null
        createdNoteId = noteNodeId
      })
      return createdNoteId
    },
    attachNoteToNode: (noteNodeId, targetNodeId, autoPlace = true) => {
      set((state) => {
        const view = state.workspace.views[state.currentViewId]
        const noteNode = state.workspace.nodes[noteNodeId]
        const targetNode = state.workspace.nodes[targetNodeId]
        if (
          !view ||
          !noteNode ||
          !targetNode ||
          noteNode.kind !== 'note' ||
          targetNode.kind === 'note' ||
          !view.nodeIds.includes(noteNodeId) ||
          !view.nodeIds.includes(targetNodeId)
        ) {
          return
        }

        noteNode.noteTargetNodeId = targetNodeId
        if (!autoPlace) {
          return
        }
        const nextBounds = resolveAttachedNoteBounds(
          state.workspace,
          state.currentViewId,
          targetNodeId,
          { w: noteNode.bounds.w, h: noteNode.bounds.h },
          { ignoreNodeId: noteNode.id },
        )
        if (!nextBounds) {
          return
        }
        noteNode.bounds = nextBounds
        noteNode.ports = resolveNodePorts(nextBounds, noteNode.kind)
      })
    },
    moveNode: (nodeId, dx, dy) => {
      set((state) => {
        const node = state.workspace.nodes[nodeId]
        if (!node) {
          return
        }
        node.bounds.x += dx
        node.bounds.y += dy
      })
    },
    setNodeName: (nodeId, name) => {
      set((state) => {
        const node = state.workspace.nodes[nodeId]
        if (!node) {
          return
        }
        node.name = name
      })
    },
    setNodeTech: (nodeId, techLabel) => {
      set((state) => {
        const node = state.workspace.nodes[nodeId]
        if (!node || node.kind === 'note') {
          return
        }
        node.tech = {
          id: techLabel.toLowerCase().replace(/\s+/g, '-'),
          label: techLabel,
        }
      })
    },
    setNodeColor: (nodeId, fillColor) => {
      set((state) => {
        const node = state.workspace.nodes[nodeId]
        if (!node) {
          return
        }
        const normalizedColor = fillColor.trim()
        if (!normalizedColor) {
          return
        }
        node.style = {
          ...node.style,
          fillColor: normalizedColor,
        }
      })
    },
    setNodeTextColor: (nodeId, textColor) => {
      set((state) => {
        const node = state.workspace.nodes[nodeId]
        if (!node) {
          return
        }
        const normalizedColor = textColor.trim()
        if (!normalizedColor) {
          return
        }
        node.style = {
          ...node.style,
          textColor: normalizedColor,
        }
      })
    },
    beginConnection: (nodeId, portId) => {
      set((state) => {
        state.pendingConnectionFrom = nodeId
        state.pendingConnectionPortId = portId ?? null
      })
    },
    connectPendingTo: (targetNodeId, targetPortId) => {
      set((state) => {
        const fromNodeId = state.pendingConnectionFrom
        const fromPortId = state.pendingConnectionPortId
        const view = state.workspace.views[state.currentViewId]
        if (!fromNodeId || !view || fromNodeId === targetNodeId) {
          state.pendingConnectionFrom = null
          state.pendingConnectionPortId = null
          return
        }
        const fromNode = state.workspace.nodes[fromNodeId]
        const targetNode = state.workspace.nodes[targetNodeId]
        if (!fromNode || !targetNode) {
          state.pendingConnectionFrom = null
          state.pendingConnectionPortId = null
          return
        }
        if (fromNode.kind === 'note' || targetNode.kind === 'note') {
          state.pendingConnectionFrom = null
          state.pendingConnectionPortId = null
          return
        }
        const resolvedFromPortId = fromPortId ?? nearestPortId(fromNode, nodeCenter(targetNode))
        const toPortId = targetPortId ?? nearestPortId(targetNode, nodeCenter(fromNode))
        const edgeId = nextNumericId(state.workspace.edges, 'e')
        state.workspace.edges[edgeId] = {
          id: edgeId,
          from: { nodeId: fromNodeId, portId: resolvedFromPortId },
          to: { nodeId: targetNodeId, portId: toPortId },
          protocolPresetId: 'http',
          label: 'request',
          route: { kind: 'auto', points: [] },
          style: { arrow: true, dashed: false, thickness: 2, labelPosition: 0.5, labelSide: 'left' },
        }
        view.edgeIds.push(edgeId)
        state.selectedEdgeId = edgeId
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.pendingConnectionFrom = null
        state.pendingConnectionPortId = null
      })
    },
    cancelPendingConnection: () => {
      set((state) => {
        state.pendingConnectionFrom = null
        state.pendingConnectionPortId = null
      })
    },
    reconnectEdgeEndpoint: (edgeId, endpointKey, targetNodeId, targetPortId) => {
      set((state) => {
        const edge = state.workspace.edges[edgeId]
        const targetNode = state.workspace.nodes[targetNodeId]
        if (!edge || !targetNode || targetNode.kind === 'note') {
          return
        }

        const oppositeEndpointKey: EdgeEndpointKey = endpointKey === 'from' ? 'to' : 'from'
        const oppositeEndpoint = edge[oppositeEndpointKey]
        if (oppositeEndpoint.nodeId === targetNodeId) {
          return
        }

        const oppositeNode = state.workspace.nodes[oppositeEndpoint.nodeId]
        if (!oppositeNode) {
          return
        }

        const nextPortId = resolveEndpointPortId(
          edge[endpointKey],
          oppositeNode,
          targetNode,
          targetPortId,
        )

        edge[endpointKey] = {
          nodeId: targetNodeId,
          portId: nextPortId,
        }
        state.selectedEdgeId = edgeId
        state.selectedNodeId = null
        state.selectedNodeIds = []
      })
    },
    setEdgeProtocol: (edgeId, protocolPresetId) => {
      set((state) => {
        const edge = state.workspace.edges[edgeId]
        if (!edge) {
          return
        }
        edge.protocolPresetId = protocolPresetId
      })
    },
    setEdgeLabel: (edgeId, label) => {
      set((state) => {
        const edge = state.workspace.edges[edgeId]
        if (!edge) {
          return
        }
        edge.label = label
      })
    },
    setEdgeLabelFontSize: (edgeId, fontSize) => {
      set((state) => {
        const edge = state.workspace.edges[edgeId]
        if (!edge) {
          return
        }
        edge.style = {
          ...edge.style,
          labelFontSize: clampEdgeLabelFontSize(fontSize),
        }
      })
    },
    setEdgeLabelPosition: (edgeId, position) => {
      set((state) => {
        const edge = state.workspace.edges[edgeId]
        if (!edge) {
          return
        }
        edge.style = {
          ...edge.style,
          labelPosition: clampEdgeLabelPosition(position),
        }
      })
    },
    setEdgeLabelSide: (edgeId, side) => {
      set((state) => {
        const edge = state.workspace.edges[edgeId]
        if (!edge) {
          return
        }
        edge.style = {
          ...edge.style,
          labelSide: resolveEdgeLabelSide(side),
        }
      })
    },
    setEdgeLabelAngle: (edgeId, angleDeg) => {
      set((state) => {
        const edge = state.workspace.edges[edgeId]
        if (!edge) {
          return
        }
        edge.style = {
          ...edge.style,
          labelAngle: clampEdgeLabelAngle(angleDeg),
        }
      })
    },
    duplicateSelection: (offset) => {
      const resolvedOffset = {
        dx: offset?.dx ?? 36,
        dy: offset?.dy ?? 24,
      }
      const result: { nodeIds: string[]; edgeId: string | null } = {
        nodeIds: [],
        edgeId: null,
      }

      set((state) => {
        const view = state.workspace.views[state.currentViewId]
        if (!view) {
          return
        }

        const selectedNodeIds = state.selectedNodeIds.filter(
          (nodeId) => view.nodeIds.includes(nodeId) && Boolean(state.workspace.nodes[nodeId]),
        )
        if (selectedNodeIds.length > 0) {
          const selectedNodeSet = new Set(selectedNodeIds)
          const sourceToCloneNodeId = new Map<string, string>()
          const duplicatedNodeIds: string[] = []

          for (const nodeId of selectedNodeIds) {
            const sourceNode = state.workspace.nodes[nodeId]
            if (!sourceNode) {
              continue
            }
            const clonedNodeId = nextNumericId(state.workspace.nodes, 'n')
            const clonedBounds = {
              ...sourceNode.bounds,
              x: sourceNode.bounds.x + resolvedOffset.dx,
              y: sourceNode.bounds.y + resolvedOffset.dy,
            }
            state.workspace.nodes[clonedNodeId] = {
              ...sourceNode,
              id: clonedNodeId,
              name: `${sourceNode.name} Copy`,
              bounds: clonedBounds,
              ports: resolveNodePorts(clonedBounds, sourceNode.kind),
              children: [],
              drilldownRef: undefined,
            }
            view.nodeIds.push(clonedNodeId)
            sourceToCloneNodeId.set(nodeId, clonedNodeId)
            duplicatedNodeIds.push(clonedNodeId)
          }

          for (const sourceNodeId of selectedNodeIds) {
            const sourceNode = state.workspace.nodes[sourceNodeId]
            const clonedNodeId = sourceToCloneNodeId.get(sourceNodeId)
            if (!sourceNode || !clonedNodeId) {
              continue
            }
            const clonedNode = state.workspace.nodes[clonedNodeId]
            if (!clonedNode || clonedNode.kind !== 'note') {
              continue
            }
            const mappedTargetId = sourceNode.noteTargetNodeId
              ? sourceToCloneNodeId.get(sourceNode.noteTargetNodeId) ?? sourceNode.noteTargetNodeId
              : undefined
            clonedNode.noteTargetNodeId = mappedTargetId
          }

          for (const edgeId of view.edgeIds.slice()) {
            const edge = state.workspace.edges[edgeId]
            if (!edge) {
              continue
            }
            if (!selectedNodeSet.has(edge.from.nodeId) || !selectedNodeSet.has(edge.to.nodeId)) {
              continue
            }
            const fromNodeId = sourceToCloneNodeId.get(edge.from.nodeId)
            const toNodeId = sourceToCloneNodeId.get(edge.to.nodeId)
            if (!fromNodeId || !toNodeId) {
              continue
            }
            const clonedEdgeId = nextNumericId(state.workspace.edges, 'e')
            state.workspace.edges[clonedEdgeId] = {
              ...edge,
              id: clonedEdgeId,
              from: {
                nodeId: fromNodeId,
                portId: edge.from.portId,
              },
              to: {
                nodeId: toNodeId,
                portId: edge.to.portId,
              },
              route: {
                kind: edge.route.kind,
                points: edge.route.points.map((point) => ({
                  x: point.x + resolvedOffset.dx,
                  y: point.y + resolvedOffset.dy,
                })),
              },
              style: {
                ...edge.style,
                labelPosition: clampEdgeLabelPosition(edge.style.labelPosition ?? 0.5),
                labelSide: resolveEdgeLabelSide(edge.style.labelSide),
              },
            }
            view.edgeIds.push(clonedEdgeId)
          }

          state.selectedNodeId = duplicatedNodeIds[duplicatedNodeIds.length - 1] ?? null
          state.selectedNodeIds = duplicatedNodeIds
          state.selectedEdgeId = null
          result.nodeIds = duplicatedNodeIds
          return
        }

        if (!state.selectedEdgeId) {
          return
        }
        const sourceEdge = state.workspace.edges[state.selectedEdgeId]
        if (!sourceEdge || !view.edgeIds.includes(sourceEdge.id)) {
          return
        }

        const clonedEdgeId = nextNumericId(state.workspace.edges, 'e')
        const routeOffset = 18
        state.workspace.edges[clonedEdgeId] = {
          ...sourceEdge,
          id: clonedEdgeId,
          route: {
            kind: sourceEdge.route.kind,
            points: sourceEdge.route.points.map((point) => ({
              x: point.x + routeOffset,
              y: point.y + routeOffset,
            })),
          },
          style: {
            ...sourceEdge.style,
            labelPosition: clampEdgeLabelPosition((sourceEdge.style.labelPosition ?? 0.5) + 0.04),
            labelSide: resolveEdgeLabelSide(sourceEdge.style.labelSide),
          },
        }
        view.edgeIds.push(clonedEdgeId)
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.selectedEdgeId = clonedEdgeId
        result.edgeId = clonedEdgeId
      })

      return result
    },
    autoArrangeCurrentView: (scope) => {
      set((state) => {
        const result = autoArrangeView(state.workspace, state.currentViewId, scope)
        if (!result) {
          return
        }

        for (const [nodeId, bounds] of Object.entries(result.nodeBoundsById)) {
          const node = state.workspace.nodes[nodeId]
          if (!node) {
            continue
          }
          node.bounds = bounds
          node.ports = resolveNodePorts(bounds, node.kind)
        }

        for (const [edgeId, labelPosition] of Object.entries(result.edgeLabelPositionById)) {
          const edge = state.workspace.edges[edgeId]
          if (!edge) {
            continue
          }
          edge.style = {
            ...edge.style,
            labelPosition,
          }
        }

        for (const [edgeId, labelSide] of Object.entries(result.edgeLabelSideById)) {
          const edge = state.workspace.edges[edgeId]
          if (!edge) {
            continue
          }
          edge.style = {
            ...edge.style,
            labelSide: resolveEdgeLabelSide(labelSide),
          }
        }
      })
    },
    setGridEnabled: (enabled) => {
      set((state) => {
        state.workspace.settings.grid = enabled
      })
    },
    setSnapEnabled: (enabled) => {
      set((state) => {
        state.workspace.settings.snap = enabled
      })
    },
    setTheme: (theme) => {
      set((state) => {
        state.workspace.settings.theme = theme
      })
    },
    setJourneyFocusSettings: (settings) => {
      set((state) => {
        state.workspace.settings.journeyFocus = {
          ...state.workspace.settings.journeyFocus,
          ...settings,
        }
      })
    },
    loadShowcaseWorkspace: (options) => {
      const currentTheme = get().workspace.settings.theme
      const locale = options?.locale ?? 'en'
      const mode = options?.mode ?? 'showcase'
      const workspace = createShowcaseWorkspace(locale, mode)
      workspace.settings.theme = currentTheme
      set({
        workspace,
        currentViewId: DEFAULT_VIEW_ID,
        viewHistory: [],
        viewport: DEFAULT_VIEWPORT,
        selectedNodeId: null,
        selectedNodeIds: [],
        selectedEdgeId: null,
        activeTool: 'select',
        pendingConnectionFrom: null,
        pendingConnectionPortId: null,
        activeJourneyId: DEFAULT_PLAYER_JOURNEY_ID,
        journeyFilterId: null,
        playerJourneyId: DEFAULT_PLAYER_JOURNEY_ID,
        playerIsRunning: false,
        playerStepIndex: 0,
        playerLoop: DEFAULT_PLAYER_LOOP,
        playerSpeedMs: DEFAULT_PLAYER_SPEED_MS,
        playerHighlightNodes: DEFAULT_PLAYER_HIGHLIGHT_NODES,
        playerTrailEnabled: DEFAULT_PLAYER_TRAIL_ENABLED,
        playerConfettiNonce: 0,
        playerConfettiNodeId: null,
      })
      saveSnapshot(toSnapshot(get()))
    },
    createJourney: (name) => {
      const journeyId = nextNumericId(get().workspace.journeys, 'j')
      set((state) => {
        const view = state.workspace.views[state.currentViewId]
        if (!view) {
          return
        }
        const colorIndex = Object.keys(state.workspace.journeys).length
        state.workspace.journeys[journeyId] = {
          id: journeyId,
          name: name?.trim() || `Journey ${colorIndex + 1}`,
          colorKey: journeyColorByIndex(colorIndex),
          steps: [],
          player: {
            loop: DEFAULT_PLAYER_LOOP,
            speedMs: DEFAULT_PLAYER_SPEED_MS,
            pauseOnStep: false,
          },
        }
        view.journeyIds.push(journeyId)
        state.activeJourneyId = journeyId
        if (!state.playerJourneyId) {
          state.playerJourneyId = journeyId
        }
      })
      return journeyId
    },
    setActiveJourney: (journeyId) => {
      set((state) => {
        state.activeJourneyId = journeyId
      })
    },
    setJourneyFilter: (journeyId) => {
      set((state) => {
        state.journeyFilterId = journeyId
      })
    },
    reorderJourneyInCurrentView: (journeyId, targetJourneyId) => {
      set((state) => {
        if (journeyId === targetJourneyId) {
          return
        }
        const view = state.workspace.views[state.currentViewId]
        if (!view) {
          return
        }
        const fromIndex = view.journeyIds.indexOf(journeyId)
        const targetIndex = view.journeyIds.indexOf(targetJourneyId)
        if (fromIndex < 0 || targetIndex < 0) {
          return
        }
        const [moved] = view.journeyIds.splice(fromIndex, 1)
        const insertAt = targetIndex
        view.journeyIds.splice(insertAt, 0, moved)
      })
    },
    addEdgeToJourney: (journeyId, edgeId) => {
      set((state) => {
        const journey = state.workspace.journeys[journeyId]
        const edge = state.workspace.edges[edgeId]
        const fromNode = edge ? state.workspace.nodes[edge.from.nodeId] : undefined
        const toNode = edge ? state.workspace.nodes[edge.to.nodeId] : undefined
        if (!journey || !edge || isExperimentalShapeNode(fromNode) || isExperimentalShapeNode(toNode)) {
          return
        }
        const exists = journey.steps.some((step) => step.edgeId === edgeId)
        if (exists) {
          return
        }
        const ordered = journey.steps
          .slice()
          .sort((left, right) => left.n - right.n)
        ordered.push({ n: nextJourneyStepNumber(ordered.map((step) => step.n)), edgeId })
        journey.steps = normalizeJourneySteps(ordered)
      })
    },
    removeEdgeFromJourney: (journeyId, edgeId) => {
      set((state) => {
        const journey = state.workspace.journeys[journeyId]
        if (!journey) {
          return
        }
        const ordered = journey.steps
          .slice()
          .sort((left, right) => left.n - right.n)
          .filter((step) => step.edgeId !== edgeId)
        journey.steps = normalizeJourneySteps(ordered)
        if (state.playerJourneyId === journeyId && state.playerStepIndex >= ordered.length) {
          state.playerStepIndex = Math.max(0, ordered.length - 1)
          state.playerIsRunning = false
        }
      })
    },
    reorderJourneyStep: (journeyId, edgeId, targetEdgeId) => {
      set((state) => {
        if (edgeId === targetEdgeId) {
          return
        }
        const journey = state.workspace.journeys[journeyId]
        if (!journey) {
          return
        }
        const ordered = journey.steps
          .slice()
          .sort((left, right) => left.n - right.n)
        const sourceIndex = ordered.findIndex((step) => step.edgeId === edgeId)
        const targetIndex = ordered.findIndex((step) => step.edgeId === targetEdgeId)
        if (sourceIndex < 0 || targetIndex < 0) {
          return
        }
        const [moved] = ordered.splice(sourceIndex, 1)
        ordered.splice(targetIndex, 0, moved)
        journey.steps = normalizeJourneySteps(ordered)
      })
    },
    setPlayerJourney: (journeyId) => {
      set((state) => {
        state.playerJourneyId = journeyId
        state.playerStepIndex = 0
        state.playerConfettiNodeId = null
      })
    },
    setPlayerRunning: (running) => {
      set((state) => {
        state.playerIsRunning = running
      })
    },
    setPlayerLoop: (loop) => {
      set((state) => {
        state.playerLoop = loop
      })
    },
    setPlayerSpeedMs: (speedMs) => {
      set((state) => {
        state.playerSpeedMs = Math.max(120, speedMs)
      })
    },
    setPlayerHighlightNodes: (enabled) => {
      set((state) => {
        state.playerHighlightNodes = enabled
      })
    },
    setPlayerTrailEnabled: (enabled) => {
      set((state) => {
        state.playerTrailEnabled = enabled
      })
    },
    prevPlayerStep: () => {
      set((state) => {
        const journeyId = state.playerJourneyId
        if (!journeyId) {
          return
        }
        const journey = state.workspace.journeys[journeyId]
        if (!journey) {
          return
        }
        const playbackLength = resolveJourneyPlaybackLength(journey)
        if (!playbackLength) {
          return
        }
        if (state.playerStepIndex <= 0) {
          state.playerStepIndex = state.playerLoop ? playbackLength - 1 : 0
          state.playerIsRunning = false
          return
        }
        state.playerStepIndex -= 1
      })
    },
    stepPlayer: () => {
      set((state) => {
        const journeyId = state.playerJourneyId
        if (!journeyId) {
          return
        }
        const journey = state.workspace.journeys[journeyId]
        if (!journey) {
          state.playerIsRunning = false
          return
        }
        const playbackLength = resolveJourneyPlaybackLength(journey)
        if (!playbackLength) {
          state.playerIsRunning = false
          return
        }
        const isLastStep = state.playerStepIndex >= playbackLength - 1
        if (isLastStep) {
          const finalTick = resolveJourneyPlaybackTick(journey, Math.max(0, playbackLength - 1))
          const finalPrimaryStep = resolveJourneyPrimaryTickStep(finalTick)
          const finalEdge = finalPrimaryStep ? state.workspace.edges[finalPrimaryStep.edgeId] : undefined
          state.playerConfettiNodeId = finalEdge?.to.nodeId ?? null
          state.playerConfettiNonce += 1
          if (state.playerLoop) {
            state.playerStepIndex = 0
            return
          }
          state.playerIsRunning = false
          return
        }
        state.playerStepIndex += 1
      })
    },
    resetPlayer: () => {
      set((state) => {
        state.playerIsRunning = false
        state.playerStepIndex = 0
        state.playerConfettiNodeId = null
      })
    },
  })),
)
