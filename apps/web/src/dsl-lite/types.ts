export interface LiteNode {
  kind: string
  alias: string
  name: string
  techId?: string
}

export interface LiteEdge {
  fromAlias: string
  toAlias: string
  protocol: string
  label: string
}

export interface LiteJourneyStep {
  n: number
  fromAlias: string
  toAlias: string
}

export interface LiteJourney {
  name: string
  color: string
  steps: LiteJourneyStep[]
}

export interface LiteWorkspaceAst {
  workspaceName: string
  viewKind: 'system-context' | 'container' | 'component' | 'hex'
  nodes: LiteNode[]
  edges: LiteEdge[]
  journeys: LiteJourney[]
}
