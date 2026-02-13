# System Journey Viewer

Editor visual C4 + Journeys com Player, Drill-down, HexView, DSL LITE e export.

## Showcase

- O app inicia com um workspace de showcase completo (Container, Component e Hex com jornadas).
- Use `Showcase` na topbar para recarregar o cenário de demonstração.
- Use o toggle `Dark` na topbar para alternar tema claro/escuro.
- O player exibe bolinha em movimento no path com rastro iluminado e fade temporal.
- A numeração da jornada aparece à esquerda do nome da comunicação.

## Stack

- `React + TypeScript + Vite`
- `Zustand + Immer` para estado
- `Zod` para schema FULL
- `Vitest` para testes unitários

## Executar

```bash
npm install
npm run dev
```

Para habilitar o assistente Codex no editor DSL, rode também o gateway server-side em outro terminal:

```bash
npm run dev:gateway
```

Variáveis opcionais do gateway (`apps/codex-gateway`):

- `OPENAI_API_KEY` ou `CODEX_API_KEY`
- `OPENAI_BASE_URL`
- `CODEX_MODEL` (ex.: `gpt-5-codex`)
- `CODEX_WORKDIR` (repo alvo para contexto do agente)
- `CODEX_SANDBOX_MODE` (`read-only`, `workspace-write`, `danger-full-access`)
- `CODEX_APPROVAL_POLICY` (`never`, `on-request`, `on-failure`, `untrusted`)

No painel `DSL`, use:

- campo de instrução para orientar a transformação;
- botão `Refinar com Codex` para gerar uma nova versão da DSL;
- botão `Limpar contexto Codex` para reiniciar o thread.

## Validar

```bash
npm run lint
npm run test:run
npm run test:run:gateway
npm run build
```

## Branches do roadmap

- `roadmap/m0-bootstrap`
- `roadmap/m1-nodes-edges`
- `roadmap/m2-snap-grid-ports`
- `roadmap/m3-presets`
- `roadmap/m4-journeys`
- `roadmap/m5-player`
- `roadmap/m6-drilldown`
- `roadmap/m7-hexview`
- `roadmap/m8-dsl-lite`
- `roadmap/m9-export`
