import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nearestPortId, nodeCenter } from '../engine/geometry'
import { journeyColorByIndex } from '../journeys/colors'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import { normalizeWorkspaceNodePorts, resolveNodePorts } from '../model/nodePorts'
import { resolveNodePreset, resolveTechPreset } from '../presets/catalog'
import type {
  EdgeEndpoint,
  EditorSnapshot,
  NodeBounds,
  NodeModel,
  ViewportState,
  WorkspaceModel,
} from '../model/types'
import { loadSnapshot, saveSnapshot } from './persistence'

const DEFAULT_VIEW_ID = 'v_container'
const DEFAULT_VIEWPORT: ViewportState = { x: 100, y: 80, zoom: 1 }
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.8
const DEFAULT_PLAYER_JOURNEY_ID = 'j_c_1'

export type ActiveTool = 'select' | 'connector'
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
  selectEdge: (edgeId: string | null) => void
  openDrilldown: (nodeId: string) => void
  createDrilldownForNode: (nodeId: string) => string | null
  navigateBack: () => void
  goToView: (viewId: string) => void
  setActiveTool: (tool: ActiveTool) => void
  setViewport: (viewport: ViewportState) => void
  zoomByFactor: (factor: number) => void
  addNode: (presetId: string, x: number, y: number) => string
  removeNode: (nodeId: string) => void
  setNodeBounds: (nodeId: string, bounds: NodeBounds) => void
  setNodesBounds: (updates: Array<{ nodeId: string; bounds: NodeBounds }>) => void
  moveNode: (nodeId: string, dx: number, dy: number) => void
  setNodeName: (nodeId: string, name: string) => void
  setNodeTech: (nodeId: string, techLabel: string) => void
  setNodeColor: (nodeId: string, fillColor: string) => void
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
  setGridEnabled: (enabled: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  setTheme: (theme: WorkspaceModel['settings']['theme']) => void
  loadShowcaseWorkspace: () => void
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
  const snapshot = loadSnapshot(fallbackWorkspace.workspace.id, DEFAULT_VIEW_ID)
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
      playerLoop: false,
      playerSpeedMs: 900,
      playerHighlightNodes: true,
      playerTrailEnabled: true,
      playerConfettiNonce: 0,
      playerConfettiNodeId: null,
    }
  }
  const resolvedViewId = snapshot.workspace.views[snapshot.currentViewId]
    ? snapshot.currentViewId
    : DEFAULT_VIEW_ID
  return {
    workspace: normalizeWorkspaceNodePorts(snapshot.workspace),
    currentViewId: resolvedViewId,
    viewHistory: [],
    viewport: snapshot.viewport,
    selectedNodeId: null,
    selectedNodeIds: [],
    selectedEdgeId: null,
    activeTool: 'select',
    pendingConnectionFrom: null,
    pendingConnectionPortId: null,
    activeJourneyId: null,
    journeyFilterId: null,
    playerJourneyId:
      snapshot.workspace.views[resolvedViewId]?.journeyIds[0] ?? DEFAULT_PLAYER_JOURNEY_ID,
    playerIsRunning: false,
    playerStepIndex: 0,
    playerLoop: false,
    playerSpeedMs: 900,
    playerHighlightNodes: true,
    playerTrailEnabled: true,
    playerConfettiNonce: 0,
    playerConfettiNodeId: null,
  }
}

const toSnapshot = (state: EditorState): EditorSnapshot => ({
  workspace: state.workspace,
  currentViewId: state.currentViewId,
  viewport: state.viewport,
})

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

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
  const techPreset = preset ? resolveTechPreset(preset.defaultTechId) : undefined
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
    ports: resolveNodePorts(bounds),
    children: [],
  }
}

const applyNodeBounds = (node: NodeModel, bounds: NodeBounds): void => {
  const sizeChanged = node.bounds.w !== bounds.w || node.bounds.h !== bounds.h
  node.bounds = bounds
  if (sizeChanged) {
    node.ports = resolveNodePorts(bounds)
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

const normalizeJourneySteps = (
  steps: Array<{ n: number; edgeId: string }>,
): Array<{ n: number; edgeId: string }> =>
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

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    ...getDefaultState(),
    hydrate: () => {
      const defaults = getDefaultState()
      set({
        workspace: defaults.workspace,
        currentViewId: defaults.currentViewId,
        viewHistory: [],
        viewport: defaults.viewport,
        selectedNodeId: null,
        selectedNodeIds: [],
        selectedEdgeId: null,
        activeTool: 'select',
        pendingConnectionFrom: null,
        pendingConnectionPortId: null,
        activeJourneyId: DEFAULT_PLAYER_JOURNEY_ID,
        journeyFilterId: null,
        playerJourneyId:
          defaults.workspace.views[defaults.currentViewId]?.journeyIds[0] ?? DEFAULT_PLAYER_JOURNEY_ID,
        playerIsRunning: false,
        playerStepIndex: 0,
        playerLoop: false,
        playerSpeedMs: 900,
        playerHighlightNodes: true,
        playerTrailEnabled: true,
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
        playerLoop: false,
        playerSpeedMs: 900,
        playerHighlightNodes: true,
        playerTrailEnabled: true,
        playerConfettiNonce: 0,
        playerConfettiNodeId: null,
      })
      saveSnapshot(toSnapshot(get()))
    },
    replaceWorkspace: (workspace, viewId) => {
      const firstViewId = viewId ?? Object.keys(workspace.views)[0] ?? DEFAULT_VIEW_ID
      const normalizedWorkspace = normalizeWorkspaceNodePorts(workspace)
      const firstJourneyId = firstJourneyForView(normalizedWorkspace, firstViewId)
      set((state) => {
        state.workspace = normalizedWorkspace
        state.currentViewId = firstViewId
        state.viewHistory = []
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
            ports: resolveNodePorts(boundaryBounds),
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
        state.currentViewId = viewId
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
    removeNode: (nodeId) => {
      set((state) => {
        if (!state.workspace.nodes[nodeId]) {
          return
        }

        const removedEdgeIds = new Set<string>()
        for (const [edgeId, edge] of Object.entries(state.workspace.edges)) {
          if (edge.from.nodeId === nodeId || edge.to.nodeId === nodeId) {
            removedEdgeIds.add(edgeId)
          }
        }

        for (const view of Object.values(state.workspace.views)) {
          view.nodeIds = view.nodeIds.filter((candidate) => candidate !== nodeId)
          if (removedEdgeIds.size > 0) {
            view.edgeIds = view.edgeIds.filter((edgeId) => !removedEdgeIds.has(edgeId))
          }
        }

        for (const edgeId of removedEdgeIds) {
          delete state.workspace.edges[edgeId]
        }

        for (const journey of Object.values(state.workspace.journeys)) {
          journey.steps = journey.steps.filter((step) => !removedEdgeIds.has(step.edgeId))
        }

        delete state.workspace.nodes[nodeId]

        if (state.pendingConnectionFrom === nodeId) {
          state.pendingConnectionFrom = null
        }
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null
        }
        if (state.selectedNodeIds.includes(nodeId)) {
          state.selectedNodeIds = state.selectedNodeIds.filter((candidate) => candidate !== nodeId)
          if (!state.selectedNodeId) {
            state.selectedNodeId = state.selectedNodeIds[state.selectedNodeIds.length - 1] ?? null
          }
        }
        if (state.selectedEdgeId && removedEdgeIds.has(state.selectedEdgeId)) {
          state.selectedEdgeId = null
        }

        if (!state.playerJourneyId) {
          state.playerIsRunning = false
          state.playerStepIndex = 0
          return
        }

        const activePlayerJourney = state.workspace.journeys[state.playerJourneyId]
        const sortedSteps =
          activePlayerJourney?.steps.slice().sort((left, right) => left.n - right.n) ?? []
        if (!sortedSteps.length) {
          state.playerIsRunning = false
          state.playerStepIndex = 0
          return
        }
        if (state.playerStepIndex >= sortedSteps.length) {
          state.playerStepIndex = sortedSteps.length - 1
          state.playerIsRunning = false
        }
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
        if (!node) {
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
          style: { arrow: true, dashed: false, thickness: 2 },
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
        if (!edge || !targetNode) {
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
    loadShowcaseWorkspace: () => {
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
        playerLoop: false,
        playerSpeedMs: 900,
        playerHighlightNodes: true,
        playerTrailEnabled: true,
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
            loop: false,
            speedMs: 900,
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
        if (!journey) {
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
        const sortedSteps = journey.steps.slice().sort((left, right) => left.n - right.n)
        if (!sortedSteps.length) {
          return
        }
        if (state.playerStepIndex <= 0) {
          state.playerStepIndex = state.playerLoop ? sortedSteps.length - 1 : 0
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
        const sortedSteps = journey.steps.slice().sort((left, right) => left.n - right.n)
        if (!sortedSteps.length) {
          state.playerIsRunning = false
          return
        }
        const isLastStep = state.playerStepIndex >= sortedSteps.length - 1
        if (isLastStep) {
          const finalStep = sortedSteps[sortedSteps.length - 1]
          const finalEdge = state.workspace.edges[finalStep.edgeId]
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
