/**
 * Purpose: Verify parser behavior with regression-focused unit tests.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fullViewToLiteDsl, fullWorkspaceToLiteDsl, liteToFullWorkspace } from './convert'
import { parseLiteDsl } from './parser'
import { createDefaultWorkspace } from '../model/defaultWorkspace'

const baseScript = `
workspace "Customer Interaction" {
  view v_main container {
    container saga "Saga" tech spring-boot
    db core_db "Core DB" tech postgres

    e_create: saga -> core_db : sql "create interaction"
    e_update: saga -> core_db : http "save protocol"

    journey j_protocol "Protocol Flow" color #2563eb {
      e_create
      e_update
    }
  }
}
`

const hierarchyScript = `
workspace "Orders" {
  view v_container container {
    boundary core "Core Services" contains api,worker,orders
    container api "Orders API" tech spring-boot drilldown v_component_api
    container worker "Worker" tech spring-boot
    db orders "Orders DB" tech postgres

    e_api_worker: api -> worker : kafka-event "order.created"
    e_api_db: api -> orders : sql "insert order"
  }

  view v_component_api component parent v_container via api {
    component app "CreateOrderService" tech application-service
    component repo "OrderRepo" tech component
    e_app_repo: app -> repo : internal-call "save"
  }
}
`

const metadataScript = `
workspace "Layout Metadata" {
  view v_main container {
    container app "App" tech react
    container api "API" tech spring-boot
    e_app_api: app -> api : http "GET /status"
  }

  metadata ui-layout {
    view v_main {
      node app at 140 220 size 280 120 fill #2563eb text #ffffff
      node api at 560 220 size 300 130 fill #0f172a text #e2e8f0
      edge e_app_api label 0.72 side right angle -18
    }
  }
}
`

const notesScript = `
workspace "Notes" {
  view v_main container {
    container api "Orders API" tech spring-boot
    note note_api on api "Requires OAuth scope orders:write"
  }
}
`

const threadedJourneyScript = `
workspace "Parallel Thread Demo" {
  view v_main container {
    container a "A" tech spring-boot
    container b "B" tech spring-boot
    container c "C" tech spring-boot
    container d "D" tech spring-boot

    e_1: a -> b : http "step 1"
    e_2: b -> d : http "step 2"
    e_3: a -> c : http "parallel step 1"
    e_4: c -> d : http "parallel step 2"

    journey j_parallel "Parallel" color #2563eb {
      e_1
      thread t_1 {
        e_3
        e_4
      }
      e_2
    }
  }
}
`

const nestedThreadJourneyScript = `
workspace "Nested Thread Demo" {
  view v_main container {
    container a "A"
    container b "B"
    container c "C"
    e_1: a -> b
    e_2: a -> c

    journey j_parallel "Parallel" {
      e_1
      thread t_1 {
        thread t_2 {
          e_2
        }
      }
    }
  }
}
`

const escapedTextScript = `
workspace "Escaped \\"Workspace\\"" {
  view v_main container {
    container api "Orders\\nAPI" tech spring-boot
    db core "Core\\\\DB" tech postgres
    note note_api on api "Owner: Team\\\\Blue\\nSecond line"

    e_fetch_orders: api -> core : sql "load \\"orders\\" from C:\\\\tmp"

    journey j_fetch_orders "Fetch\\nOrders" color #2563eb {
      e_fetch_orders
    }
  }
}
`

describe('SJV Script parser and conversion', () => {
  it('keeps journey order from line position and resolves duplicate src->dst using edge IDs', () => {
    const ast = parseLiteDsl(baseScript)
    const workspace = liteToFullWorkspace(ast)

    expect(ast.workspaceName).toBe('Customer Interaction')
    expect(ast.views).toHaveLength(1)
    expect(Object.keys(workspace.edges)).toHaveLength(2)

    const journey = Object.values(workspace.journeys)[0]
    expect(journey).toBeDefined()
    const sortedSteps = journey.steps.slice().sort((left, right) => left.n - right.n)
    expect(sortedSteps).toHaveLength(2)

    const firstEdge = workspace.edges[sortedSteps[0].edgeId]
    const secondEdge = workspace.edges[sortedSteps[1].edgeId]
    expect(firstEdge.label).toBe('create interaction')
    expect(secondEdge.label).toBe('save protocol')
  })

  it('parses hierarchical multi-view script and resolves drilldown + boundary groups', () => {
    const ast = parseLiteDsl(hierarchyScript)
    const workspace = liteToFullWorkspace(ast)

    expect(ast.views).toHaveLength(2)
    expect(Object.keys(workspace.views)).toHaveLength(2)

    const apiNode = Object.values(workspace.nodes).find((node) => node.name === 'Orders API')
    const boundaryNode = Object.values(workspace.nodes).find((node) => node.name === 'Core Services')
    expect(apiNode?.drilldownRef).toBe('v_component_api')
    expect(boundaryNode?.kind).toBe('boundary')
    expect(boundaryNode?.children.length).toBe(3)
  })

  it('exports and re-imports a complete workspace as one script file', () => {
    const ast = parseLiteDsl(hierarchyScript)
    const workspace = liteToFullWorkspace(ast)
    const script = fullWorkspaceToLiteDsl(workspace)

    expect(script).toContain('workspace "Orders"')
    expect(script).toContain('view v_container container')
    expect(script).toContain('e_api_worker: api -> worker : kafka-event "order.created"')
    expect(script).toContain('metadata ui-layout')

    const reparsed = parseLiteDsl(script)
    const rebuilt = liteToFullWorkspace(reparsed)
    expect(Object.keys(rebuilt.views)).toHaveLength(2)
  })

  it('preserves note attachment relations across roundtrip conversion', () => {
    const ast = parseLiteDsl(notesScript)
    const workspace = liteToFullWorkspace(ast)

    const noteNode = Object.values(workspace.nodes).find((node) => node.kind === 'note')
    expect(noteNode).toBeDefined()
    expect(noteNode?.noteTargetNodeId).toBeTruthy()

    const exported = fullWorkspaceToLiteDsl(workspace)
    expect(exported).toContain('note note_api on api "Requires OAuth scope orders:write"')
  })

  it('excludes experimental basic shapes and their edges from exported SJV Script', () => {
    const workspace = createDefaultWorkspace()
    workspace.nodes.n_shape_test = {
      id: 'n_shape_test',
      presetId: 'shape-circle',
      kind: 'shape-circle',
      name: 'Loose Circle',
      tags: ['experimental-shape'],
      bounds: { x: 120, y: 120, w: 120, h: 120 },
      ports: [],
      children: [],
    }
    workspace.edges.e_shape_test = {
      id: 'e_shape_test',
      from: { nodeId: 'n_shape_test' },
      to: { nodeId: 'n_api' },
      protocolPresetId: 'http',
      label: 'shape edge',
      route: { kind: 'auto', points: [] },
      style: { dashed: false, thickness: 2, arrow: true },
    }
    workspace.views.v_container.nodeIds.push('n_shape_test')
    workspace.views.v_container.edgeIds.push('e_shape_test')
    workspace.journeys.j_c_1.steps.push({ n: 99, edgeId: 'e_shape_test' })

    const exported = fullWorkspaceToLiteDsl(workspace)

    expect(exported).not.toContain('Loose Circle')
    expect(exported).not.toContain('shape edge')
    expect(exported).not.toContain('n_shape_test')
    expect(exported).not.toContain('e_shape_test')
  })

  it('parses and exports escaped multiline text values', () => {
    const ast = parseLiteDsl(escapedTextScript)
    const workspace = liteToFullWorkspace(ast)

    expect(ast.workspaceName).toBe('Escaped "Workspace"')
    const mainView = ast.views[0]
    const api = mainView?.nodes.find((node) => node.alias === 'api')
    const note = mainView?.nodes.find((node) => node.alias === 'note_api')
    const journey = mainView?.journeys[0]
    expect(api?.name).toBe('Orders\nAPI')
    expect(note?.name).toBe('Owner: Team\\Blue\nSecond line')
    expect(journey?.name).toBe('Fetch\nOrders')

    const exported = fullWorkspaceToLiteDsl(workspace)
    expect(exported).toContain('workspace "Escaped \\"Workspace\\""')
    expect(exported).toContain('container api "Orders\\nAPI" tech spring-boot')
    expect(exported).toContain('db core "Core\\\\DB" tech postgres')
    expect(exported).toContain('note note_api on api "Owner: Team\\\\Blue\\nSecond line"')
    expect(exported).toContain('e_fetch_orders: api -> core : sql "load \\"orders\\" from C:\\\\tmp"')
    expect(exported).toContain('journey j_fetch_orders "Fetch\\nOrders" color #2563eb')
  })

  it('imports and exports ui-layout metadata using edge IDs', () => {
    const ast = parseLiteDsl(metadataScript)
    const workspace = liteToFullWorkspace(ast)
    const mainView = workspace.views.v_main
    const edgeId = mainView.edgeIds[0]

    expect(edgeId).toBeTruthy()
    const appNodeId = mainView.nodeIds.find((nodeId) => workspace.nodes[nodeId]?.name === 'App') ?? ''
    expect(workspace.nodes[appNodeId]?.style?.fillColor).toBe('#2563eb')
    expect(workspace.nodes[appNodeId]?.style?.textColor).toBe('#ffffff')
    expect(workspace.edges[edgeId].style.labelPosition).toBeCloseTo(0.72, 5)
    expect(workspace.edges[edgeId].style.labelSide).toBe('right')
    expect(workspace.edges[edgeId].style.labelAngle).toBe(-18)

    const exported = fullWorkspaceToLiteDsl(workspace)
    expect(exported).toContain('metadata ui-layout')
    expect(exported).toContain('node app at 140 220 size 280 120 fill #2563eb text #ffffff')
    expect(exported).toContain('edge e_app_api label 0.72 side right angle -18')
  })

  it('parses top-level journey thread blocks attached to the previous main step', () => {
    const ast = parseLiteDsl(threadedJourneyScript)
    const journey = ast.views[0]?.journeys[0]

    expect(journey).toBeDefined()
    expect(journey?.steps).toHaveLength(2)
    expect(journey?.steps[0]?.edgeId).toBe('e_1')
    expect(journey?.steps[0]?.threads).toHaveLength(1)
    expect(journey?.steps[0]?.threads?.[0]?.id).toBe('t_1')
    expect(journey?.steps[0]?.threads?.[0]?.steps.map((step) => step.edgeId)).toEqual(['e_3', 'e_4'])
    expect(journey?.steps[1]?.edgeId).toBe('e_2')
  })

  it('rejects nested journey thread blocks in parser v1', () => {
    expect(() => parseLiteDsl(nestedThreadJourneyScript)).toThrow(
      'SJV Script invalid: nested thread blocks are not supported yet.',
    )
  })

  it('compiles and re-exports parsed thread journeys preserving thread blocks', () => {
    const ast = parseLiteDsl(threadedJourneyScript)
    const workspace = liteToFullWorkspace(ast)
    const journey = Object.values(workspace.journeys)[0]

    expect(journey?.steps[0]?.threads).toHaveLength(1)
    expect(journey?.steps[0]?.threads?.[0]?.steps.map((step) => step.edgeId)).toHaveLength(2)

    const exported = fullWorkspaceToLiteDsl(workspace)
    expect(exported).toContain('thread t_1 {')
    expect(exported).toContain('parallel-step-1')
    expect(exported).toContain('parallel-step-2')
  })

  it('exports semantic edge and journey IDs when internal IDs are generic', () => {
    const workspace = createDefaultWorkspace()
    const exported = fullWorkspaceToLiteDsl(workspace)

    expect(exported).not.toContain('e_c_1:')
    expect(exported).not.toContain('journey j_c_1 ')
    expect(exported).toContain('validate-token: gateway -> auth')
    expect(exported).toContain('journey order-creation-sync-event "Order Creation (Sync + Event)"')
  })

  it('exports a single current view script', () => {
    const ast = parseLiteDsl(baseScript)
    const workspace = liteToFullWorkspace(ast)
    const viewId = Object.keys(workspace.views)[0]
    const script = fullViewToLiteDsl(workspace, viewId)

    expect(script).toContain('workspace "Customer Interaction"')
    expect(script).toContain('view v_main container')
    expect(script).toContain('journey j_protocol "Protocol Flow" color #2563eb')
  })

  it('imports the showcase SJV Script file', () => {
    const showcasePath = resolve(process.cwd(), '../../docs/cim.sjv')
    const showcaseText = readFileSync(showcasePath, 'utf8')

    const ast = parseLiteDsl(showcaseText)
    const workspace = liteToFullWorkspace(ast)

    expect(ast.views.length).toBeGreaterThan(3)
    expect(Object.keys(workspace.views).length).toBeGreaterThan(3)
    expect(Object.values(workspace.journeys).length).toBeGreaterThan(2)
    expect(Object.values(workspace.nodes).some((node) => node.kind === 'note')).toBe(true)
  })
})
