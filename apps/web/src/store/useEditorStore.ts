import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import type { EditorSnapshot, NodeBounds, ViewportState, WorkspaceModel } from '../model/types'
import { loadSnapshot, saveSnapshot } from './persistence'

const DEFAULT_VIEW_ID = 'v_container'
const DEFAULT_VIEWPORT: ViewportState = { x: 100, y: 80, zoom: 1 }
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.8

interface EditorState {
  workspace: WorkspaceModel
  currentViewId: string
  viewport: ViewportState
  selectedNodeId: string | null
  hydrate: () => void
  persist: () => void
  resetWorkspace: () => void
  selectNode: (nodeId: string | null) => void
  setViewport: (viewport: ViewportState) => void
  zoomByFactor: (factor: number) => void
  setNodeBounds: (nodeId: string, bounds: NodeBounds) => void
}

const getDefaultState = (): Pick<
  EditorState,
  'workspace' | 'currentViewId' | 'viewport' | 'selectedNodeId'
> => {
  const fallbackWorkspace = createDefaultWorkspace()
  const snapshot = loadSnapshot(fallbackWorkspace.workspace.id, DEFAULT_VIEW_ID)
  if (!snapshot) {
    return {
      workspace: fallbackWorkspace,
      currentViewId: DEFAULT_VIEW_ID,
      viewport: DEFAULT_VIEWPORT,
      selectedNodeId: null,
    }
  }
  return {
    workspace: snapshot.workspace,
    currentViewId: snapshot.currentViewId,
    viewport: snapshot.viewport,
    selectedNodeId: null,
  }
}

const toSnapshot = (state: EditorState): EditorSnapshot => ({
  workspace: state.workspace,
  currentViewId: state.currentViewId,
  viewport: state.viewport,
})

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

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
      })
      saveSnapshot(toSnapshot(get()))
    },
    selectNode: (nodeId) => {
      set((state) => {
        state.selectedNodeId = nodeId
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
    setNodeBounds: (nodeId, bounds) => {
      set((state) => {
        if (!state.workspace.nodes[nodeId]) {
          return
        }
        state.workspace.nodes[nodeId].bounds = bounds
      })
    },
  })),
)
