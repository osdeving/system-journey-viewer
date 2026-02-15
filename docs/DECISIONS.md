# DECISIONS

## 2026-02-12 — Engine SVG Adapter (Opção A)

- **Contexto**: roadmap exige editor estilo draw.io com controle total de render/animação e sem lock-in pago.
- **Decisão**: implementar engine próprio em SVG com `DiagramCanvas` + store de domínio (adapter interno).
- **Consequência**: maior controle para player/journey/drill-down e export, com custo maior de manutenção de interação.

## 2026-02-12 — FULL como fonte da verdade + DSL LITE derivada

- **Contexto**: necessidade de persistência de geometria e também edição humana textual.
- **Decisão**: manter `WorkspaceModel` FULL como estado canônico e converter DSL LITE em runtime.
- **Consequência**: migração/versionamento mais simples e import/export textual sem acoplamento do engine.

## 2026-02-12 — Player integrado ao estado global

- **Contexto**: highlight de edge/node e sincronização com filtros de jornada e drill-down.
- **Decisão**: player state no `useEditorStore` (journey, step, loop, speed).
- **Consequência**: render reativo único em canvas e controles desacoplados da camada visual.

## 2026-02-13 — Integração Codex via gateway server-side

- **Contexto**: o editor DSL precisava de assistência do Codex SDK sem expor credenciais/API key no browser.
- **Decisão**: introduzir `apps/codex-gateway` (Node.js) como adapter server-side com endpoint HTTP `/api/codex/dsl-assist`, mantendo o frontend apenas como cliente.
- **Consequência**: integração segura e stateful por `threadId` (continuidade de contexto) com leve aumento de complexidade operacional (dois processos em dev: web + gateway).

## 2026-02-15 — DSL LITE unificada com hierarquia multi-view

- **Contexto**: a DSL anterior representava uma view por vez, sem vínculo explícito pai/filho e sem agrupamento declarativo de fronteira.
- **Decisão**: evoluir a DSL para arquivo único multi-view com:
  - `view <id> <kind>`,
  - `parent <viewId> via <alias>`,
  - `drilldown <viewId>` em node,
  - `contains a,b,c` para boundary de grupo.
- **Consequência**: import/export textual passa a preservar hierarquia de drilldown e agrupamento de fronteiras, reduzindo perda semântica entre edição visual e edição textual.
