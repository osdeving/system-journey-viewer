/**
 * Purpose: Implement SJV Script parsing, serialization, and editor integration helpers.
 */

export interface LiteNode {
  kind: string
  alias: string
  name: string
  techId?: string
  drilldownToViewId?: string
  containsAliases?: string[]
  noteTargetAlias?: string
}

export interface LiteEdge {
  id: string
  fromAlias: string
  toAlias: string
  protocol: string
  label: string
}

export interface LiteJourneyStep {
  edgeId: string
}

export interface LiteJourney {
  id: string
  name: string
  color: string
  steps: LiteJourneyStep[]
}

export interface LiteViewParent {
  viewId: string
  viaAlias: string
}

export interface LiteViewAst {
  id: string
  kind: 'system-context' | 'container' | 'component' | 'hex'
  nodes: LiteNode[]
  edges: LiteEdge[]
  journeys: LiteJourney[]
  parent?: LiteViewParent
}

export interface LiteUiLayoutNode {
  alias: string
  x: number
  y: number
  w: number
  h: number
}

export interface LiteUiLayoutEdge {
  edgeId: string
  labelPosition: number
  labelSide?: 'left' | 'right'
  labelFontSize?: number
  labelAngle?: number
}

export interface LiteUiLayoutView {
  viewId: string
  nodes: LiteUiLayoutNode[]
  edges: LiteUiLayoutEdge[]
}

export interface LiteWorkspaceAst {
  workspaceName: string
  views: LiteViewAst[]
  uiLayout: LiteUiLayoutView[]
}
