import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fullViewToLiteDsl, fullWorkspaceToLiteDsl, liteToFullWorkspace } from './convert'
import { parseLiteDsl } from './parser'

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
      node app at 140 220 size 280 120
      node api at 560 220 size 300 130
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

  it('imports and exports ui-layout metadata using edge IDs', () => {
    const ast = parseLiteDsl(metadataScript)
    const workspace = liteToFullWorkspace(ast)
    const mainView = workspace.views.v_main
    const edgeId = mainView.edgeIds[0]

    expect(edgeId).toBeTruthy()
    expect(workspace.edges[edgeId].style.labelPosition).toBeCloseTo(0.72, 5)
    expect(workspace.edges[edgeId].style.labelSide).toBe('right')
    expect(workspace.edges[edgeId].style.labelAngle).toBe(-18)

    const exported = fullWorkspaceToLiteDsl(workspace)
    expect(exported).toContain('metadata ui-layout')
    expect(exported).toContain('edge e_app_api label 0.72 side right angle -18')
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
