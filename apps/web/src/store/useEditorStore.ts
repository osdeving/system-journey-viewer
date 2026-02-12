import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nearestPortId, nodeCenter } from '../engine/geometry'
import { journeyColorByIndex } from '../journeys/colors'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import { resolveNodePreset, resolveTechPreset } from '../presets/catalog'
import type {
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

export type ActiveTool = 'select' | 'connector'

interface EditorState {
  workspace: WorkspaceModel
  currentViewId: string
  viewport: ViewportState
  selectedNodeId: string | null
  selectedEdgeId: string | null
  activeTool: ActiveTool
  pendingConnectionFrom: string | null
  activeJourneyId: string | null
  journeyFilterId: string | null
  hydrate: () => void
  persist: () => void
  resetWorkspace: () => void
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  setActiveTool: (tool: ActiveTool) => void
  setViewport: (viewport: ViewportState) => void
  zoomByFactor: (factor: number) => void
  addNode: (presetId: string, x: number, y: number) => string
  setNodeBounds: (nodeId: string, bounds: NodeBounds) => void
  moveNode: (nodeId: string, dx: number, dy: number) => void
  setNodeName: (nodeId: string, name: string) => void
  setNodeTech: (nodeId: string, techLabel: string) => void
  beginConnection: (nodeId: string) => void
  connectPendingTo: (targetNodeId: string) => void
  setEdgeProtocol: (edgeId: string, protocolPresetId: string) => void
  setEdgeLabel: (edgeId: string, label: string) => void
  setGridEnabled: (enabled: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  createJourney: (name?: string) => string
  setActiveJourney: (journeyId: string | null) => void
  setJourneyFilter: (journeyId: string | null) => void
  addEdgeToJourney: (journeyId: string, edgeId: string) => void
  removeEdgeFromJourney: (journeyId: string, edgeId: string) => void
}

const getDefaultState = (): Pick<
  EditorState,
  | 'workspace'
  | 'currentViewId'
  | 'viewport'
  | 'selectedNodeId'
  | 'selectedEdgeId'
  | 'activeTool'
  | 'pendingConnectionFrom'
  | 'activeJourneyId'
  | 'journeyFilterId'
> => {
  const fallbackWorkspace = createDefaultWorkspace()
  const snapshot = loadSnapshot(fallbackWorkspace.workspace.id, DEFAULT_VIEW_ID)
  if (!snapshot) {
    return {
      workspace: fallbackWorkspace,
      currentViewId: DEFAULT_VIEW_ID,
      viewport: DEFAULT_VIEWPORT,
      selectedNodeId: null,
      selectedEdgeId: null,
      activeTool: 'select',
      pendingConnectionFrom: null,
      activeJourneyId: null,
      journeyFilterId: null,
    }
  }
  return {
    workspace: snapshot.workspace,
    currentViewId: snapshot.currentViewId,
    viewport: snapshot.viewport,
    selectedNodeId: null,
    selectedEdgeId: null,
    activeTool: 'select',
    pendingConnectionFrom: null,
    activeJourneyId: null,
    journeyFilterId: null,
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

const defaultPorts = [
  { id: 'north', x: 0.5, y: 0 },
  { id: 'east', x: 1, y: 0.5 },
  { id: 'south', x: 0.5, y: 1 },
  { id: 'west', x: 0, y: 0.5 },
]

const createNode = (id: string, presetId: string, x: number, y: number): NodeModel => {
  const preset = resolveNodePreset(presetId) ?? resolveNodePreset('container')
  const techPreset = preset ? resolveTechPreset(preset.defaultTechId) : undefined
  return {
    id,
    presetId: preset?.id,
    kind: (preset?.kind ?? 'container') as NodeModel['kind'],
    name: `${preset?.label ?? 'Container'} ${id.replace('n_', '')}`,
    tags: [],
    tech: techPreset
      ? { id: techPreset.id, label: techPreset.label, iconKey: techPreset.iconKey }
      : undefined,
    bounds: {
      x,
      y,
      w: preset?.defaultWidth ?? 220,
      h: preset?.defaultHeight ?? 120,
    },
    ports: defaultPorts,
    children: [],
  }
}

const nextJourneyStepNumber = (used: number[]): number => {
  let candidate = 1
  const usedSet = new Set(used)
  while (usedSet.has(candidate)) {
    candidate += 1
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
        viewport: defaults.viewport,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeTool: 'select',
        pendingConnectionFrom: null,
        activeJourneyId: null,
        journeyFilterId: null,
      })
    },
    persist: () => {
      saveSnapshot(toSnapshot(get()))
    },
    resetWorkspace: () => {
      set({
        workspace: createDefaultWorkspace(),
        currentViewId: DEFAULT_VIEW_ID,
        viewport: DEFAULT_VIEWPORT,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeTool: 'select',
        pendingConnectionFrom: null,
        activeJourneyId: null,
        journeyFilterId: null,
      })
      saveSnapshot(toSnapshot(get()))
    },
    selectNode: (nodeId) => {
      set((state) => {
        state.selectedNodeId = nodeId
        state.selectedEdgeId = null
      })
    },
    selectEdge: (edgeId) => {
      set((state) => {
        state.selectedEdgeId = edgeId
        state.selectedNodeId = null
      })
    },
    setActiveTool: (tool) => {
      set((state) => {
        state.activeTool = tool
        if (tool !== 'connector') {
          state.pendingConnectionFrom = null
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
        state.selectedEdgeId = null
      })
      return nodeId
    },
    setNodeBounds: (nodeId, bounds) => {
      set((state) => {
        if (!state.workspace.nodes[nodeId]) {
          return
        }
        state.workspace.nodes[nodeId].bounds = bounds
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
    beginConnection: (nodeId) => {
      set((state) => {
        state.pendingConnectionFrom = nodeId
        state.activeTool = 'connector'
      })
    },
    connectPendingTo: (targetNodeId) => {
      set((state) => {
        const fromNodeId = state.pendingConnectionFrom
        const view = state.workspace.views[state.currentViewId]
        if (!fromNodeId || !view || fromNodeId === targetNodeId) {
          state.pendingConnectionFrom = null
          return
        }
        const fromNode = state.workspace.nodes[fromNodeId]
        const targetNode = state.workspace.nodes[targetNodeId]
        if (!fromNode || !targetNode) {
          state.pendingConnectionFrom = null
          return
        }
        const fromPortId = nearestPortId(fromNode, nodeCenter(targetNode))
        const toPortId = nearestPortId(targetNode, nodeCenter(fromNode))
        const edgeId = nextNumericId(state.workspace.edges, 'e')
        state.workspace.edges[edgeId] = {
          id: edgeId,
          from: { nodeId: fromNodeId, portId: fromPortId },
          to: { nodeId: targetNodeId, portId: toPortId },
          protocolPresetId: 'http',
          label: 'request',
          route: { kind: 'auto', points: [] },
          style: { arrow: true, dashed: false, thickness: 2 },
        }
        view.edgeIds.push(edgeId)
        state.selectedEdgeId = edgeId
        state.selectedNodeId = null
        state.pendingConnectionFrom = null
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
        const n = nextJourneyStepNumber(journey.steps.map((step) => step.n))
        journey.steps.push({ n, edgeId })
      })
    },
    removeEdgeFromJourney: (journeyId, edgeId) => {
      set((state) => {
        const journey = state.workspace.journeys[journeyId]
        if (!journey) {
          return
        }
        journey.steps = journey.steps.filter((step) => step.edgeId !== edgeId)
      })
    },
  })),
)
