import { normalizeWorkspaceNodePorts } from './nodePorts'
import type { WorkspaceModel } from './types'

export const BLANK_WORKSPACE_VIEW_ID = 'v_main'

export const createBlankWorkspace = (): WorkspaceModel =>
  normalizeWorkspaceNodePorts({
    schemaVersion: '1.0',
    workspace: {
      id: `workspace-${Date.now()}`,
      name: 'Untitled Workspace',
    },
    views: {
      [BLANK_WORKSPACE_VIEW_ID]: {
        id: BLANK_WORKSPACE_VIEW_ID,
        kind: 'container',
        name: 'Container View',
        nodeIds: [],
        edgeIds: [],
        journeyIds: [],
      },
    },
    nodes: {},
    edges: {},
    journeys: {},
    settings: {
      grid: true,
      snap: true,
      theme: 'dark',
      journeyFocus: {
        offscopeRenderMode: 'hide',
        layoutMode: 'preserve',
        autoLayoutMode: 'manual',
      },
    },
  })
