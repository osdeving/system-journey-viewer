import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fullViewToLiteDsl, fullWorkspaceToLiteDsl, liteToFullWorkspace } from './convert'
import { parseLiteDsl } from './parser'

const singleViewDsl = `
workspace "Pedidos" {
  view container {
    container api "ms-pedidos" tech spring-boot
    queue kafka "Kafka" tech kafka
    db orders "orders-db" tech postgres

    api -> kafka : kafka-event "pedido.criado"
    api -> orders : sql "insert order"

    journey "Fluxo A" color #2563eb {
      1: api -> kafka
      2: api -> orders
    }
  }
}
`

const hierarchicalDsl = `
workspace "Pedidos" {
  view v_container container {
    boundary core "Core Services" contains api,worker,orders
    container api "ms-pedidos" tech spring-boot
    container worker "ms-fulfillment" tech spring-boot
    db orders "orders-db" tech postgres

    api -> worker : kafka-event "order.created"
    api -> orders : sql "insert order"
  }

  view v_component_api component parent v_container via api {
    component app "CreateOrderService" tech application-service
    component repo "OrderRepo" tech component
    app -> repo : internal-call "save"
  }

  view v_hex_api hex parent v_component_api via app {
    domain core_domain "OrderDomain" tech domain
  }
}
`

const cimDslPath =
  [
    resolve(process.cwd(), 'docs/cim.sjv'),
    resolve(process.cwd(), '../../docs/cim.sjv'),
  ].find((candidate) => existsSync(candidate)) ?? null

if (!cimDslPath) {
  throw new Error('Unable to locate docs/cim.sjv for hierarchy import test.')
}

const cimDsl = readFileSync(cimDslPath, 'utf8')

describe('DSL Lite parser and conversion', () => {
  it('keeps compatibility with single-view legacy syntax', () => {
    const ast = parseLiteDsl(singleViewDsl)
    const workspace = liteToFullWorkspace(ast)

    expect(ast.workspaceName).toBe('Pedidos')
    expect(ast.views).toHaveLength(1)
    expect(Object.keys(workspace.nodes)).toHaveLength(3)
    expect(Object.keys(workspace.edges)).toHaveLength(2)
    expect(Object.keys(workspace.journeys)).toHaveLength(1)
  })

  it('parses hierarchical multi-view DSL and resolves drilldown + boundary groups', () => {
    const ast = parseLiteDsl(hierarchicalDsl)
    const workspace = liteToFullWorkspace(ast)

    expect(ast.views).toHaveLength(3)
    expect(Object.keys(workspace.views)).toHaveLength(3)

    const apiNode = Object.values(workspace.nodes).find((node) => node.name === 'ms-pedidos')
    const appNode = Object.values(workspace.nodes).find((node) => node.name === 'CreateOrderService')
    const boundaryNode = Object.values(workspace.nodes).find((node) => node.name === 'Core Services')
    expect(apiNode?.drilldownRef).toBe('v_component_api')
    expect(appNode?.drilldownRef).toBe('v_hex_api')
    expect(boundaryNode?.kind).toBe('boundary')
    expect(boundaryNode?.children.length).toBe(3)

    const boundaryChildren =
      boundaryNode?.children
        .map((nodeId) => workspace.nodes[nodeId])
        .filter((node) => !!node) ?? []
    const minX = Math.min(...boundaryChildren.map((node) => node.bounds.x))
    const minY = Math.min(...boundaryChildren.map((node) => node.bounds.y))
    const maxX = Math.max(...boundaryChildren.map((node) => node.bounds.x + node.bounds.w))
    const maxY = Math.max(...boundaryChildren.map((node) => node.bounds.y + node.bounds.h))

    expect(boundaryNode?.bounds.x ?? 0).toBeLessThanOrEqual(minX)
    expect(boundaryNode?.bounds.y ?? 0).toBeLessThanOrEqual(minY)
    expect((boundaryNode?.bounds.x ?? 0) + (boundaryNode?.bounds.w ?? 0)).toBeGreaterThanOrEqual(maxX)
    expect((boundaryNode?.bounds.y ?? 0) + (boundaryNode?.bounds.h ?? 0)).toBeGreaterThanOrEqual(maxY)
  })

  it('exports and re-imports a complete workspace as a single DSL file', () => {
    const ast = parseLiteDsl(hierarchicalDsl)
    const workspace = liteToFullWorkspace(ast)
    const dsl = fullWorkspaceToLiteDsl(workspace)

    expect(dsl).toContain('workspace "Pedidos"')
    expect(dsl).toContain('view v_container container')
    expect(dsl).toContain('view v_component_api component parent v_container via api')
    expect(dsl).toContain('view v_hex_api hex parent v_component_api via app')
    expect(dsl).toContain('boundary core "Core Services" tech boundary contains api,worker,orders')

    const reparsed = parseLiteDsl(dsl)
    const rebuilt = liteToFullWorkspace(reparsed)
    expect(Object.keys(rebuilt.views)).toHaveLength(3)
    expect(
      Object.values(rebuilt.nodes).some(
        (node) => node.name === 'ms-pedidos' && node.drilldownRef === 'v_component_api',
      ),
    ).toBe(true)
  })

  it('still exports a single current view for backward compatibility', () => {
    const ast = parseLiteDsl(singleViewDsl)
    const workspace = liteToFullWorkspace(ast)
    const viewId = Object.keys(workspace.views)[0]
    const dsl = fullViewToLiteDsl(workspace, viewId)

    expect(dsl).toContain('workspace "Pedidos"')
    expect(dsl).toContain('view v_container container')
    expect(dsl).toContain('journey "Fluxo A" color #2563eb')
    expect(dsl).toContain('api -> kafka : kafka-event "pedido.criado"')
  })

  it('imports cim workspace preserving drilldown hierarchy across views', () => {
    const ast = parseLiteDsl(cimDsl)
    const workspace = liteToFullWorkspace(ast)

    const mainView = workspace.views.v_main
    expect(mainView).toBeDefined()
    expect(mainView.kind).toBe('container')

    const cimContainer = Object.values(workspace.nodes).find(
      (node) => node.name === 'CIM - Customer Interaction Management',
    )
    const sagaContainer = Object.values(workspace.nodes).find(
      (node) => node.name === 'CIM-SAGA - Stateful Orchestrator',
    )
    const finishContainer = Object.values(workspace.nodes).find(
      (node) => node.name === 'MS Finish Interaction',
    )
    expect(cimContainer?.drilldownRef).toBe('v_component_cim')
    expect(sagaContainer?.drilldownRef).toBe('v_component_saga')
    expect(finishContainer?.drilldownRef).toBe('v_component_finish')

    const cimComponentView = workspace.views.v_component_cim
    const sagaComponentView = workspace.views.v_component_saga
    const finishComponentView = workspace.views.v_component_finish
    expect(cimComponentView).toBeDefined()
    expect(sagaComponentView).toBeDefined()
    expect(finishComponentView).toBeDefined()

    const mainNodeSet = new Set(mainView.nodeIds)
    expect(
      cimComponentView.nodeIds.some((nodeId) => mainNodeSet.has(nodeId)),
    ).toBe(false)
    expect(
      sagaComponentView.nodeIds.some((nodeId) => mainNodeSet.has(nodeId)),
    ).toBe(false)
    expect(
      finishComponentView.nodeIds.some((nodeId) => mainNodeSet.has(nodeId)),
    ).toBe(false)
  })
})
