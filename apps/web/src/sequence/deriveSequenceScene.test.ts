/**
 * Purpose: Verify inferred sequence-diagram scene derivation from SJV journeys and canvas entities.
 */

import { describe, expect, it } from 'vitest'
import type { WorkspaceModel } from '../model/types'
import { deriveSequenceDiagramScene } from './deriveSequenceScene'

const createWorkspace = (): WorkspaceModel => ({
  schemaVersion: '1.0',
  workspace: {
    id: 'ws_demo',
    name: 'Customer Interaction',
  },
  views: {
    v_main: {
      id: 'v_main',
      kind: 'container',
      name: 'Container view',
      nodeIds: ['n_guardian', 'n_cim', 'n_proto', 'n_bdi', 'n_note'],
      edgeIds: ['e_triage', 'e_internal', 'e_proto_request', 'e_bdi_save', 'e_poll'],
      journeyIds: ['j_call_started'],
    },
  },
  nodes: {
    n_guardian: {
      id: 'n_guardian',
      kind: 'system',
      name: 'Guardian',
      tags: [],
      bounds: { x: 0, y: 0, w: 160, h: 80 },
      ports: [],
      children: [],
    },
    n_cim: {
      id: 'n_cim',
      kind: 'container',
      name: 'CIM',
      tags: [],
      bounds: { x: 200, y: 0, w: 180, h: 100 },
      ports: [],
      children: [],
    },
    n_proto: {
      id: 'n_proto',
      kind: 'queue',
      name: 'Party Interaction',
      tags: [],
      bounds: { x: 420, y: 0, w: 200, h: 100 },
      ports: [],
      children: [],
    },
    n_bdi: {
      id: 'n_bdi',
      kind: 'db',
      name: 'BDI',
      tags: [],
      bounds: { x: 680, y: 0, w: 160, h: 100 },
      ports: [],
      children: [],
    },
    n_note: {
      id: 'n_note',
      kind: 'note',
      name: 'CIM waits for actors after triage.',
      tags: [],
      bounds: { x: 0, y: 0, w: 120, h: 80 },
      ports: [],
      children: [],
      noteTargetNodeId: 'n_cim',
    },
  },
  edges: {
    e_triage: {
      id: 'e_triage',
      from: { nodeId: 'n_guardian' },
      to: { nodeId: 'n_cim' },
      protocolPresetId: 'http',
      label: 'POST /triage',
      route: { kind: 'auto', points: [] },
      style: { dashed: false, thickness: 2, arrow: true, labelPosition: 0.5, labelSide: 'left' },
    },
    e_internal: {
      id: 'e_internal',
      from: { nodeId: 'n_cim' },
      to: { nodeId: 'n_cim' },
      protocolPresetId: 'internal',
      label: 'save triage in saga',
      route: { kind: 'auto', points: [] },
      style: { dashed: false, thickness: 2, arrow: true, labelPosition: 0.5, labelSide: 'left' },
    },
    e_proto_request: {
      id: 'e_proto_request',
      from: { nodeId: 'n_cim' },
      to: { nodeId: 'n_proto' },
      protocolPresetId: 'event',
      label: 'request protocol (async)',
      route: { kind: 'auto', points: [] },
      style: { dashed: true, thickness: 2, arrow: true, labelPosition: 0.5, labelSide: 'left' },
    },
    e_bdi_save: {
      id: 'e_bdi_save',
      from: { nodeId: 'n_cim' },
      to: { nodeId: 'n_bdi' },
      protocolPresetId: 'sql',
      label: 'save interaction',
      route: { kind: 'auto', points: [] },
      style: { dashed: false, thickness: 2, arrow: true, labelPosition: 0.5, labelSide: 'left' },
    },
    e_poll: {
      id: 'e_poll',
      from: { nodeId: 'n_guardian' },
      to: { nodeId: 'n_cim' },
      protocolPresetId: 'http',
      label: 'GET /interaction/{id}',
      route: { kind: 'auto', points: [] },
      style: { dashed: false, thickness: 2, arrow: true, labelPosition: 0.5, labelSide: 'left' },
    },
  },
  journeys: {
    j_call_started: {
      id: 'j_call_started',
      name: 'Customer Interaction — Chamada Iniciada',
      colorKey: '#2563eb',
      steps: [
        { n: 1, edgeId: 'e_triage' },
        {
          n: 2,
          edgeId: 'e_internal',
          threads: [
            {
              id: 't_proto',
              steps: [{ n: 1, edgeId: 'e_proto_request' }],
            },
          ],
        },
        { n: 3, edgeId: 'e_poll' },
        { n: 4, edgeId: 'e_bdi_save' },
      ],
      player: {
        loop: true,
        speedMs: 1200,
        pauseOnStep: false,
      },
    },
  },
  settings: {
    grid: false,
    snap: false,
    theme: 'light',
    journeyFocus: {
      offscopeRenderMode: 'hide',
      layoutMode: 'preserve',
      autoLayoutMode: 'manual',
    },
  },
})

describe('deriveSequenceDiagramScene', () => {
  it('builds ordered participants and parallel rows from threaded journey ticks', () => {
    const scene = deriveSequenceDiagramScene({
      workspace: createWorkspace(),
      viewId: 'v_main',
      journeyId: 'j_call_started',
      theme: 'light',
    })

    expect(scene).not.toBeNull()
    expect(scene?.participants.map((participant) => ({ name: participant.name, kind: participant.kind }))).toEqual([
      { name: 'Guardian', kind: 'actor' },
      { name: 'CIM', kind: 'participant' },
      { name: 'Party Interaction', kind: 'queue' },
      { name: 'BDI', kind: 'database' },
    ])

    const parallelRow = scene?.rows.find((row) => row.kind === 'parallel')
    expect(parallelRow).toBeDefined()
    expect(parallelRow && parallelRow.kind === 'parallel' ? parallelRow.branches.map((branch) => branch.edgeId) : []).toEqual([
      'e_poll',
      'e_proto_request',
    ])
    expect(parallelRow && parallelRow.kind === 'parallel' ? parallelRow.branches[1]?.laneLabel : null).toBe('Thread t_proto')
  })

  it('infers attached note rows and async arrows', () => {
    const scene = deriveSequenceDiagramScene({
      workspace: createWorkspace(),
      viewId: 'v_main',
      journeyId: 'j_call_started',
      theme: 'light',
    })

    const noteRow = scene?.rows.find((row) => row.kind === 'note')
    expect(noteRow).toBeDefined()
    expect(noteRow && noteRow.kind === 'note' ? noteRow.text : '').toContain('CIM waits')
    expect(noteRow && noteRow.kind === 'note' ? noteRow.targetParticipantIds.length : 0).toBe(1)

    const asyncMessageRows =
      scene?.rows
        .filter((row): row is Extract<(typeof scene.rows)[number], { kind: 'message' }> => row.kind === 'message')
        .filter((row) => row.message.arrowStyle === 'async') ?? []
    const asyncParallelBranches =
      scene?.rows
        .filter((row) => row.kind === 'parallel')
        .flatMap((row) => row.branches.filter((branch) => branch.arrowStyle === 'async')) ?? []

    expect(asyncMessageRows.map((row) => row.message.edgeId)).toEqual([])
    expect(asyncParallelBranches.map((branch) => branch.edgeId)).toContain('e_proto_request')
  })

  it('returns null when the journey is not present in the specified view', () => {
    const workspace = createWorkspace()
    workspace.views.v_main.journeyIds = []

    const scene = deriveSequenceDiagramScene({
      workspace,
      viewId: 'v_main',
      journeyId: 'j_call_started',
      theme: 'light',
    })

    expect(scene).toBeNull()
  })
})
