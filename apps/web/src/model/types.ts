/**
 * Purpose: Define core workspace types and built-in workspace/example data used by the editor.
 */

export type ViewKind = 'system-context' | 'container' | 'component' | 'hex'

export type JourneyFilterOffscopeRenderMode = 'show' | 'hide' | 'dim'
export type JourneyFilterLayoutMode = 'preserve' | 'reflow'
export type JourneyFilterAutoLayoutMode = 'manual' | 'always'

export type NodeKind =
  | 'system'
  | 'container'
  | 'component'
  | 'boundary'
  | 'domain'
  | 'application-service'
  | 'port-in'
  | 'port-out'
  | 'adapter-in'
  | 'adapter-out'
  | 'db'
  | 'queue'
  | 'load-balancer'
  | 'gateway'
  | 'security'
  | 'note'
  | 'shape-rectangle'
  | 'shape-circle'
  | 'shape-triangle'
  | 'shape-diamond'

export type BasicShapeKind = Extract<NodeKind, `shape-${string}`>
export type EditorActiveTool = 'select' | 'connector' | BasicShapeKind

export interface NodeBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface NodeTech {
  id: string
  label: string
  iconKey?: string
}

export interface NodeStyle {
  fillColor?: string
  textColor?: string
}

export interface NodeUiIcon {
  iconId: string
  x: number
  y: number
  size: number
}

export interface PortModel {
  id: string
  x: number
  y: number
}

export interface NodeModel {
  id: string
  presetId?: string
  kind: NodeKind
  name: string
  description?: string
  tags: string[]
  tech?: NodeTech
  style?: NodeStyle
  uiIcon?: NodeUiIcon
  bounds: NodeBounds
  ports: PortModel[]
  children: string[]
  drilldownRef?: string
  noteTargetNodeId?: string
}

export interface EdgeEndpoint {
  nodeId: string
  portId?: string
}

export interface EdgeRoute {
  kind: 'auto' | 'manual'
  points: Array<{ x: number; y: number }>
}

export interface EdgeModel {
  id: string
  from: EdgeEndpoint
  to: EdgeEndpoint
  protocolPresetId: string
  label: string
  description?: string
  route: EdgeRoute
  style: {
    dashed: boolean
    thickness: number
    arrow: boolean
    labelFontSize?: number
    labelPosition?: number
    labelSide?: 'left' | 'right'
    labelAngle?: number
  }
}

export interface JourneyStep {
  n: number
  edgeId: string
  highlightNodes?: string[]
  threads?: JourneyThread[]
}

export interface JourneyThread {
  id: string
  steps: Array<{
    n: number
    edgeId: string
    highlightNodes?: string[]
  }>
}

export interface JourneyModel {
  id: string
  name: string
  colorKey: string
  steps: JourneyStep[]
  player: {
    loop: boolean
    speedMs: number
    pauseOnStep: boolean
  }
}

export interface ViewModel {
  id: string
  kind: ViewKind
  name: string
  nodeIds: string[]
  edgeIds: string[]
  journeyIds: string[]
}

export interface WorkspaceModel {
  schemaVersion: string
  workspace: {
    id: string
    name: string
  }
  views: Record<string, ViewModel>
  nodes: Record<string, NodeModel>
  edges: Record<string, EdgeModel>
  journeys: Record<string, JourneyModel>
  settings: {
    grid: boolean
    snap: boolean
    theme: 'light' | 'dark'
    journeyFocus: {
      offscopeRenderMode: JourneyFilterOffscopeRenderMode
      layoutMode: JourneyFilterLayoutMode
      autoLayoutMode: JourneyFilterAutoLayoutMode
    }
  }
}

export interface ViewportState {
  x: number
  y: number
  zoom: number
}

export interface EditorSnapshot {
  workspace: WorkspaceModel
  currentViewId: string
  viewport: ViewportState
  viewHistory?: string[]
  selectedNodeId?: string | null
  selectedNodeIds?: string[]
  selectedEdgeId?: string | null
  activeTool?: EditorActiveTool
  pendingConnectionFrom?: string | null
  pendingConnectionPortId?: string | null
  activeJourneyId?: string | null
  journeyFilterId?: string | null
  playerJourneyId?: string | null
  playerIsRunning?: boolean
  playerStepIndex?: number
  playerLoop?: boolean
  playerSpeedMs?: number
  playerHighlightNodes?: boolean
  playerTrailEnabled?: boolean
}
