/**
 * Purpose: Define an intermediate representation for inferred sequence-diagram scenes derived from SJV journeys.
 */

export type SequenceParticipantKind =
  | 'actor'
  | 'participant'
  | 'database'
  | 'queue'
  | 'gateway'
  | 'security'

export interface SequenceParticipant {
  id: string
  nodeId: string
  name: string
  kind: SequenceParticipantKind
  fillColor: string
  textColor: string
  borderColor: string
}

export type SequenceArrowStyle = 'sync' | 'async'

export interface SequenceMessage {
  id: string
  edgeId: string
  fromParticipantId: string
  toParticipantId: string
  label: string
  protocol?: string
  arrowStyle: SequenceArrowStyle
  isSelfMessage: boolean
  accentColor: string
  tickIndex: number
  laneKind: 'main' | 'thread'
  threadId?: string
  laneStepNumber: number
  laneLabel: string
}

export interface SequenceNoteRow {
  kind: 'note'
  id: string
  label?: string
  text: string
  targetParticipantIds: string[]
  backgroundColor: string
  borderColor: string
}

export interface SequenceSectionRow {
  kind: 'section'
  id: string
  label: string
  tone: 'neutral' | 'parallel'
}

export interface SequenceMessageRow {
  kind: 'message'
  id: string
  tickLabel: string
  message: SequenceMessage
}

export interface SequenceParallelRow {
  kind: 'parallel'
  id: string
  tickLabel: string
  label: string
  branches: SequenceMessage[]
}

export type SequenceSceneRow =
  | SequenceSectionRow
  | SequenceNoteRow
  | SequenceMessageRow
  | SequenceParallelRow

export interface SequenceDiagramScene {
  title: string
  subtitle?: string
  participants: SequenceParticipant[]
  rows: SequenceSceneRow[]
  meta: {
    workspaceName: string
    viewId: string
    journeyId: string
    journeyName: string
    hasParallel: boolean
    inferredFrom: 'sjv-journey'
  }
}

