import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nearestPortId, nodeCenter } from '../engine/geometry'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import type {
  EditorSnapshot,
  NodeBounds,
  NodeKind,
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
  hydrate: () => void
  persist: () => void
  resetWorkspace: () => void
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  setActiveTool: (tool: ActiveTool) => void
  setViewport: (viewport: ViewportState) => void
  zoomByFactor: (factor: number) => void
  addNode: (kind: NodeKind, x: number, y: number) => string
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

const techLabelByKind: Record<NodeKind, string> = {
  system: 'System',
  container: 'Service',
  component: 'Component',
  boundary: 'Boundary',
  domain: 'Domain',
  'application-service': 'Application Service',
  'port-in': 'Port In',
  'port-out': 'Port Out',
  'adapter-in': 'Adapter In',
  'adapter-out': 'Adapter Out',
  db: 'Database',
  queue: 'Queue',
  gateway: 'API Gateway',
  security: 'Security',
}

const defaultPorts = [
  { id: 'north', x: 0.5, y: 0 },
  { id: 'east', x: 1, y: 0.5 },
  { id: 'south', x: 0.5, y: 1 },
  { id: 'west', x: 0, y: 0.5 },
]

const createNode = (id: string, kind: NodeKind, x: number, y: number): NodeModel => ({
  id,
  kind,
  name: `${kind}-${id.replace('n_', '')}`,
  tags: [],
  tech: {
    id: kind,
    label: techLabelByKind[kind],
  },
  bounds: { x, y, w: 220, h: 120 },
  ports: defaultPorts,
  children: [],
})

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
    addNode: (kind, x, y) => {
      const nodeId = nextNumericId(get().workspace.nodes, 'n')
      set((state) => {
        const view = state.workspace.views[state.currentViewId]
        if (!view) {
          return
        }
        state.workspace.nodes[nodeId] = createNode(nodeId, kind, x, y)
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
  })),
)
