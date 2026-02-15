# System Journey Viewer

Editor visual para modelar arquitetura e fluxos de jornada em múltiplas camadas (`Container`, `Component`, `Hex`), com player de execução, DSL LITE e export.

## O que este projeto resolve

Se você precisa explicar fluxo de negócio e arquitetura no mesmo artefato, o System Journey Viewer permite:

- desenhar os componentes e suas comunicações;
- montar jornadas de usuário (passos sobre edges);
- executar essas jornadas com animação;
- detalhar por drill-down entre visões;
- exportar para `SVG`, `PNG` e `PDF`;
- editar/importar via DSL LITE quando preferir modo textual.

## Demo rápida (5 minutos)

1. Suba a aplicação (`npm run dev`).
2. Abra a UI e clique em `Showcase` para carregar o cenário de demonstração.
3. Na aba `Journeys`, selecione uma jornada e clique em `Play`.
4. Faça drill-down com double-click em nodes com referência.
5. Exporte em `SVG` pela topbar.

## Como rodar localmente

Pré-requisitos:

- `Node.js`
- `npm`

Instalação e execução do frontend:

```bash
npm install
npm run dev
```

## Assistência Codex no painel DSL (opcional)

Para habilitar o botão `Refinar com Codex`, rode também o gateway:

```bash
npm run dev:gateway
```

Variáveis suportadas pelo gateway (`apps/codex-gateway`):

- `OPENAI_API_KEY` ou `CODEX_API_KEY`
- `OPENAI_BASE_URL`
- `CODEX_MODEL` (exemplo: `gpt-5-codex`)
- `CODEX_WORKDIR`
- `CODEX_SANDBOX_MODE` (`read-only`, `workspace-write`, `danger-full-access`)
- `CODEX_APPROVAL_POLICY` (`never`, `on-request`, `on-failure`, `untrusted`)
- `CODEX_SKIP_GIT_REPO_CHECK` (`true`/`false`)
- `CODEX_NETWORK_ACCESS_ENABLED` (`true`/`false`)
- `CODEX_GATEWAY_PORT` (default: `8787`)

## Fluxo de uso da UI

1. Arraste nodes da `Palette` para o canvas.
2. Use `Connector` para criar comunicação (porta -> porta).
3. Ajuste nome/tecnologia/cor do node no `Inspector`.
4. Ajuste label e protocolo da edge no `Inspector`.
5. Crie uma jornada na aba `Journeys`.
6. Adicione edges na jornada ativa com `Add to Active Journey`.
7. Execute no player com `Play/Step/Loop`.

Guia completo de operação:

- `docs/UI_JOURNEYS_CAPABILITIES.md`

## DSL: como funciona a sincronização

A sincronização entre canvas e DSL é manual:

- `Exportar workspace completo`: gera um único DSL com todas as views.
- `Importar DSL`: aplica o texto DSL no workspace (incluindo hierarquia entre views).

Editar a textarea sozinha não atualiza o canvas em tempo real até clicar em `Importar DSL`.

Spec oficial da DSL LITE:

- `docs/DSL_LITE_SPEC.md`

## Scripts principais

Na raiz do monorepo:

- `npm run dev`: sobe a UI web
- `npm run dev:gateway`: sobe o gateway Codex
- `npm run lint`: lint da UI
- `npm run test:run`: testes da UI
- `npm run test:run:gateway`: testes do gateway
- `npm run build`: build da UI

## Estrutura do repositório

- `apps/web`: aplicação React/Vite (editor visual)
- `apps/codex-gateway`: gateway HTTP para integração com Codex SDK
- `docs`: documentação técnica e operacional

## Estado atual e limites conhecidos

Estado funcional atual:

- roadmap M0 -> M9 concluído;
- showcase pronto para demo ponta-a-ponta;
- player e drill-down funcionando.

Limites atuais da UI:

- sem remoção isolada de edge pela interface;
- sem undo/redo;
- sem multi-seleção/cópia/cola;
- gestão de jornadas ainda básica (sem excluir/renomear por UI).

Detalhamento dos limites:

- `docs/UI_JOURNEYS_CAPABILITIES.md`

## Documentação complementar

- `docs/UI_JOURNEYS_CAPABILITIES.md`: guia direto para uso da interface
- `docs/DSL_LITE_SPEC.md`: spec da DSL LITE (EBNF + semantica + limites)
- `docs/AI_STATE.md`: estado consolidado do produto
- `docs/WORKLOG.md`: histórico de mudanças por sessão
- `docs/DECISIONS.md`: decisões arquiteturais

## Histórico de branches do roadmap

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
