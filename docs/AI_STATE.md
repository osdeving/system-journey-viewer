# AI_STATE

## Estado atual

- Roadmap M0→M9 implementado.
- Branch por etapa criada (`roadmap/m0-*` até `roadmap/m9-*`), com promoção por cherry-pick sem merge commit.
- Arquitetura adotada: editor SVG custom com adapter interno (sem lock-in), modelo FULL versionado (`schemaVersion: 1.0`) e DSL LITE para import/export textual.
- Integração Codex adicionada via gateway server-side (`apps/codex-gateway`) para apoiar refinamento da DSL no editor.

## Fluxos implementados

- Canvas com pan/zoom, grid/snap, nodes/edges, ports/docking.
- Presets C4/Infra/Hex e catálogo de protocolos.
- Tema `light/dark` persistido no modelo FULL (`workspace.settings.theme`).
- Journeys com passos e filtros.
- Player com controles e animação de fluxo.
- Drill-down Container → Component → Hex com breadcrumb.
- DSL LITE ↔ FULL com auto-layout.
- Export SVG/PNG/PDF.
- Showcase pronto para demo completa via ação `Showcase` (topbar).
- Player com bolinha em movimento no path e rastro temporal via canvas overlay (trail com fade/remoção).
- Labels de comunicação com badge circular colorido por jornada (número dentro da bolinha) no início da seta quando há contexto de passo.
- Render de seta refatorado em componente dedicado (`JourneyEdge`), com badge posicionado por distância fixa da origem e label com tecnologia no formato `Nome (protocolo)`.
- Confete do player associado ao nó final da jornada (centro do componente + raio proporcional ao tamanho), incluindo disparo em ciclos de loop.
- Player refinado com chegada visual ao final da seta antes do highlight do destino, impacto com “tremida” no componente alvo e fluxo tracejado animado na aresta ativa.
- Inspector permite definir cor de preenchimento para componentes/containers (persistido no modelo).
- Nós `db` e `queue` renderizados com formas específicas (cilindro vertical/horizontal por paths SVG), mantendo conectores/ports compatíveis e preenchimento alinhado ao contorno.
- Inspector mostra paleta com últimas 10 cores para seleção rápida de componentes/containers.
- Showcase inicial colorizado com paleta visual para facilitar demonstração.
- Nodes Hex exibem ícones de conector: porta fêmea para `port-in/port-out` e plug macho para `adapter-in/adapter-out`.
- Remoção de componente por teclado (`Delete`/`Backspace`) com confirmação e aviso de impacto em jornadas conectadas.
- Remoção de node limpa edges conectadas e passos de jornada associados.
- Preset `boundary` com borda pontilhada e fundo transparente (incluindo tema escuro).
- Boundary com hit-area restrita à borda (`pointer-events: stroke`) para permitir clique em componentes atrás da área interna.
- Rastro do player com amostragem interpolada entre frames para aparência contínua (sem “gaps” entre bolinhas em velocidades maiores).
- Modo Connector com suporte a conexão por alça→alça (port-to-port) via arraste, incluindo preview visual da seta durante o gesto.
- Conexão por clique em node removida no modo Connector (somente alça→alça).
- Seleção/filtro de jornada na lista aciona automaticamente o player (autoplay) para a jornada clicada.
- Troca de view (drilldown/back/goToView) interrompe player ativo e reposiciona jornada do player para a camada atual.
- Layout com splitters para redimensionar painel de jornadas (vertical) e toolbox (largura).
- Indicadores visuais de modo exibindo ferramenta ativa, camada atual e estado do player (Animação/Render).
- Drawer inferior com tabs (`Journeys` / `DSL`) para reduzir ruído visual durante edição.
- DSL com ação de maximizar/restaurar painel para edição focada.
- DSL com assistência do Codex: instrução customizada, execução via endpoint `/api/codex/dsl-assist`, reaproveitamento de `threadId` e ação para limpar contexto do thread.
- Vite com proxy `/api/codex` para gateway local (`http://localhost:8787`) durante desenvolvimento.
- Guia de operação da UI disponível em `docs/UI_JOURNEYS_CAPABILITIES.md` (jornadas de uso, capacidades e limitações atuais).
- README raiz reestruturado para leitura humana (onboarding rápido, fluxo de uso, limites atuais e mapa de documentação).
- Spec oficial da DSL LITE disponível em `docs/DSL_LITE_SPEC.md` (EBNF, semântica, catálogo e limites de hierarquia/drilldown).

## Próximos incrementos sugeridos

- Refinar roteamento ortogonal avançado.
- Introduzir Monaco para DSL (atualmente textarea).
- Otimizar bundle do export PDF (chunk grande por `jspdf`).
