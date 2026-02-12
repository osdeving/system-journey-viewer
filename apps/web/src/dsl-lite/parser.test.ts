import { describe, expect, it } from 'vitest'
import { fullViewToLiteDsl, liteToFullWorkspace } from './convert'
import { parseLiteDsl } from './parser'

const sampleDsl = `
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

describe('DSL Lite parser and conversion', () => {
  it('parses DSL and converts into FULL workspace', () => {
    const ast = parseLiteDsl(sampleDsl)
    const workspace = liteToFullWorkspace(ast)

    expect(ast.workspaceName).toBe('Pedidos')
    expect(Object.keys(workspace.nodes)).toHaveLength(3)
    expect(Object.keys(workspace.edges)).toHaveLength(2)
    expect(Object.keys(workspace.journeys)).toHaveLength(1)
  })

  it('exports current view back to DSL text', () => {
    const ast = parseLiteDsl(sampleDsl)
    const workspace = liteToFullWorkspace(ast)
    const viewId = Object.keys(workspace.views)[0]
    const dsl = fullViewToLiteDsl(workspace, viewId)

    expect(dsl).toContain('workspace "Pedidos"')
    expect(dsl).toContain('journey "Fluxo A"')
    expect(dsl).toContain('api -> kafka')
  })
})
