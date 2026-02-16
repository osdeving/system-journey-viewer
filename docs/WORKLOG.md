# WORKLOG

## 2026-02-12

- Sessão iniciou sem `docs/AI_STATE.md` e `docs/WORKLOG.md`; documentação base criada.
- M0 (`roadmap/m0-bootstrap`): bootstrap Vite+TS, modelo FULL, persistência local, canvas base com pan/zoom e seleção.
- M1 (`roadmap/m1-nodes-edges`): drag de toolbox para criar node, move/resize, criação de edges, inspector editável.
- M2 (`roadmap/m2-snap-grid-ports`): grid overlay, snap grid/shape, render de portas e docking por porta.
- M3 (`roadmap/m3-presets`): catálogo C4/Infra, presets em JSON, pipeline de ícones.
- M4 (`roadmap/m4-journeys`): painel de jornadas, auto-numeração, edge em múltiplas jornadas, filtro por jornada.
- M5 (`roadmap/m5-player`): player com play/pause/step/loop/velocidade, energia em edge, highlight e confetti.
- M6 (`roadmap/m6-drilldown`): drill-down por double-click, breadcrumb textual e back navigation.
- M7 (`roadmap/m7-hexview`): HexView com presets hexagonais e fluxo interno seedado.
- M8 (`roadmap/m8-dsl-lite`): parser DSL LITE, conversão LITE→FULL (auto-layout), export/import de DSL no editor.
- M9 (`roadmap/m9-export`): export SVG/PNG/PDF a partir do canvas.
- Pós-roadmap (`tmp/ai/20260212-0805-dark-theme-showcase`):
  - Tema escuro com toggle persistente no workspace (`settings.theme`).
  - Showcase completo no `createDefaultWorkspace` com:
    - visão Container com múltiplas jornadas (sync, async e query),
    - visão Component com jornada interna,
    - visão Hex com fluxo ponta-a-ponta,
    - drill-down encadeado Container → Component → Hex.
  - Ação rápida `Showcase` na topbar para recarregar o cenário de demonstração.
  - Ajustes de testes para lidar com workspace inicial já populado.
- Pós-roadmap (`tmp/ai/20260212-0805-dark-theme-showcase`, continuação):
  - Rastro iluminado no player implementado com **bolinha** percorrendo o path em canvas overlay.
  - Trail agora é particulado e temporal (não ilumina a seta inteira), com fade por frame e remoção ao zerar alpha.
  - Curvas de edge resolvidas por porta de saída/entrada mesmo quando `portId` está ausente no edge seedado (evita animação partir do centro do componente).
  - Numeração da jornada incluída no texto da comunicação (prefixo à esquerda do label: `N. label`).
  - Compatibilidade retro com snapshots antigos: `theme` default em schema quando ausente.
- Pós-roadmap (`tmp/ai/20260212-0848-delete-boundary-style`):
  - Atalho `Delete`/`Backspace` para remover node selecionado no stage.
  - Confirmação de remoção com aviso explícito quando há jornadas afetadas por edges conectadas ao node.
  - Remoção de node agora também remove edges conectadas e passos de jornada associados (desconecta fluxos impactados).
  - Preset `boundary` atualizado para borda pontilhada com fundo transparente, mantendo legibilidade no tema escuro.
  - Teste unitário adicionado para garantir limpeza de edges/journeys ao remover node.
- Ajuste incremental (`tmp/ai/20260212-0922-boundary-border-hitarea`):
  - Boundary agora responde a interação apenas na borda (`pointer-events: stroke`), deixando a área interna transparente para clique em componentes ao fundo.
  - Teste de estilo adicionado para garantir `fill: none` e hit-area na borda para boundary.
- Ajuste incremental (`tmp/ai/20260212-0930-trail-continuity`):
  - Rastro do player refinado para ficar mais contínuo: geração de partículas interpoladas ao longo do deslocamento da bolinha em cada frame.
  - Redução do espaçamento base do trail para suavizar o visual em qualquer zoom/velocidade.
  - Teste unitário adicionado para a função de interpolação de pontos do trail.
- Ajuste incremental (`tmp/ai/20260212-0930-trail-continuity`, continuação):
  - Conector agora suporta criação de edge por arraste de alça para alça (porta de origem → porta de destino).
  - Preview visual da conexão enquanto arrasta no canvas.
  - Compatibilidade mantida com fluxo antigo de clique em node origem/destino no modo Connector.
  - Estado de conexão pendente evoluído para guardar também `portId` quando a origem vem de uma alça.
  - Testes unitários adicionados para conexão explícita por portas e cancelamento de conexão pendente.
- Ajuste incremental (`tmp/ai/20260212-1000-ui-modes-splitters`):
  - Removida criação de edge por clique em node no modo Connector (agora apenas alça→alça).
  - Lista de jornadas passa a acionar autoplay ao clicar na jornada (seleção) ou botão de filtro.
  - Troca de view (drilldown/back/goToView) agora para o player em execução e realinha a jornada do player para a camada atual.
  - Adicionados indicadores visuais de modo: ferramenta ativa, camada (`Container/Component/Hex`) e estado do player (`Animação/Render`).
  - Adicionados splitters para redimensionar toolbox (largura) e painel de jornadas (altura), diminuindo/aumentando o canvas conforme ajuste.
  - Testes unitários atualizados para validar novo comportamento de troca de view e estado do player.
- Ajuste incremental (`tmp/ai/20260212-1320-dsl-tabs-maximize`):
  - Drawer inferior ganhou tabs (`Journeys` e `DSL`) para navegação por contexto.
  - Modo DSL com botão de `Maximizar DSL` / `Restaurar DSL`, reaproveitando splitter vertical existente.
  - Modo maximizado do DSL expande área de edição e textarea passa a ocupar 100% do espaço disponível do painel.
  - Estilos dark/light adicionados para tabs e controle de maximize.
  - Teste de estilo atualizado para cobrir classes de tabs e maximize.
- Ajuste incremental (`tmp/ai/20260212-1410-colored-step-badge`):
  - Numeração de jornada removida do prefixo textual e movida para badge circular ao lado do label da comunicação.
  - Cor do badge agora segue a `colorKey` da jornada ativa no contexto (filtro > jornada ativa > player > fallback por menor passo).
  - Helper dedicado (`resolveEdgeJourneyBadge`) criado para centralizar prioridade e facilitar reuso/teste.
  - Testes unitários adicionados para validar resolução de badge por prioridade de jornada.
- Ajuste incremental (`tmp/ai/20260212-1618-badge-start-position`):
  - Badge de numeração movido do meio da aresta para o início do path (lado de saída da comunicação).
  - Label de comunicação voltou ao `startOffset` central (`50%`) para evitar deslocamento desnecessário.
  - Regra de posicionamento do badge isolada em helper (`resolveEdgeStepBadgeProgress`) com clamp para manter posição próxima ao começo.
  - Testes unitários adicionados para cobrir comportamento padrão e limites do posicionamento do badge.
- Ajuste incremental (`tmp/ai/20260212-1637-stable-edge-badge-position`):
  - Render das arestas refatorado para componente dedicado `JourneyEdge`, concentrando path + direção + badge + label.
  - Badge de numeração passou a usar cálculo estável por distância fixa em pixels a partir da origem da seta (evita sensação de posição “aleatória” entre arestas de tamanhos diferentes).
  - Nome da comunicação agora inclui tecnologia/protocolo no próprio label: `Nome (protocolo)`, ex.: `Auth request (http/jwt)`.
  - Novo helper `edgePresentation` adiciona funções de composição de label e cálculo de progress do badge por comprimento estimado da curva.
  - Testes unitários adicionados para validar posição do badge em curvas curtas/longas e composição do label com protocolo.
- Ajuste incremental (`tmp/ai/20260212-1652-confetti-loop-anchor`):
  - Player agora dispara confete em toda conclusão de ciclo, inclusive quando `Loop` está ativo (não apenas na primeira execução).
  - Evento de confete passou a carregar o nó final da jornada (`playerConfettiNodeId`) para ancorar visualmente no alvo correto.
  - Disparo de confete no App agora calcula centro do componente final com base no viewport/canvas e gera bursts em raio proporcional ao tamanho do node.
  - Novo helper `playerConfetti` centraliza cálculo de âncora e composição dos bursts.
  - Testes unitários adicionados para: confete em loop no store e geometria/bursts do helper de confete.
- Ajuste incremental (`tmp/ai/20260212-1652-confetti-loop-anchor`, continuação):
  - Timeline da bolinha do player ajustada para concluir o trajeto antes do tick seguinte (`STEP_TRAVEL_COMPLETE_RATIO`), reduzindo o efeito de “parar antes do fim do path”.
  - Highlight do nó destino sincronizado para acontecer no fim do trajeto (`NODE_HIT_PROGRESS_THRESHOLD`), evitando acender cedo demais.
  - Adicionado impacto visual no destino com tremida curta (`node-impact-shake`) quando o fluxo “bate” no componente/container.
  - Aresta ativa do player ganhou tracejado animado (`edge-flow-dash`) para reforçar percepção de direção/fluxo.
  - Inspector agora permite editar a cor de preenchimento do node via `input[type=color]`, persistindo em `node.style.fillColor`.
  - Modelo/schemas atualizados para suportar estilo de cor no node e manter compatibilidade de persistência.
  - Testes adicionados/atualizados para cobertura de estilo de node no schema/store e classes de animação CSS.
- Ajuste incremental (`tmp/ai/20260212-1718-node-shapes-color-palette`):
  - Nodes de banco (`kind: db`) agora usam shape de cilindro e nodes de broker/fila (`kind: queue`) usam shape de tubo/cápsula, sem quebrar portas e conectores.
  - Detalhes visuais de shape adicionados com classe dedicada (`node-shape-detail`) e suporte para tema dark.
  - Inspector de node ganhou paleta de “últimas 10 cores” para seleção rápida, além do color picker.
  - Modelo/showcase atualizado com cores default em vários nodes para entregar demo visual já colorida.
  - Testes de estilo atualizados para cobrir classes da nova paleta e detalhes de shape.
- Ajuste incremental (`tmp/ai/20260212-1727-hex-plug-icons-shapes`):
  - Fluxo Hex ganhou ícones semânticos de conector no canto do node: tomada fêmea para `port-in/port-out` e plug macho para `adapter-in/adapter-out`.
  - Refino visual do shape de broker/fila para aparência mais tubular (cápsula com detalhe de cap), alinhado ao estilo de diagrama de referência.
  - Lógica de mapeamento de papel de conector isolada em helper (`resolveHexConnectorRole`) com teste unitário dedicado.
  - Testes de estilo ampliados para cobrir classes dos novos ícones de conector.

### Validação executada

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-13

- Integração do Codex SDK no fluxo do editor DSL via gateway server-side:
  - Novo app `apps/codex-gateway` com endpoint `POST /api/codex/dsl-assist`.
  - Gateway usa `@openai/codex-sdk` com suporte a `startThread`/`resumeThread` por `threadId`.
  - Prompt builder dedicado para forçar retorno de DSL completa em bloco fenced `dsl`.
- DSL editor (`apps/web/src/App.tsx`) atualizado com:
  - campo de instrução para Codex,
  - botão `Refinar com Codex`,
  - reuso de `threadId` entre chamadas para continuidade de contexto,
  - botão `Limpar contexto Codex`,
  - feedback de status/erro no painel.
- Cliente frontend novo (`apps/web/src/dsl-lite/codexAssist.ts`) para chamada HTTP e extração robusta da DSL a partir da resposta textual.
- Proxy de dev adicionado no Vite (`/api/codex` -> `http://localhost:8787`).
- Testes adicionados:
  - `apps/codex-gateway/src/dslAssist.test.js`
  - `apps/web/src/dsl-lite/codexAssist.test.ts`
- README atualizado com instruções de execução do gateway e variáveis de configuração.

### Validação executada

- `npm run lint`
- `npm run test:run`
- `npm run test:run:gateway`
- `npm run build`

## 2026-02-15

- Ajuste incremental (`tmp/ai/20260215-0724-cylinder-shapes`):
  - Shapes de `db` e `queue` foram redesenhados com geometria de cilindro via paths SVG dedicados (shell + rims), para o preenchimento acompanhar corretamente o contorno.
  - Render de node no `DiagramCanvas` passou a usar helper de geometria (`nodeShapePaths`) em vez da composição anterior.
  - Novo teste unitário para geometria dos shapes (`nodeShapePaths.test.ts`) cobrindo clamp e estrutura dos paths gerados.
- Ajuste incremental (`tmp/ai/20260215-0739-ui-journey-doc`):
  - Criado documento de referência da UI com jornadas do usuário e capacidades/limitações atuais.
  - Novo arquivo: `docs/UI_JOURNEYS_CAPABILITIES.md`.
  - Documento cobre: mapa da tela, happy path por fluxo, o que já permite, o que ainda não permite e checklist de uso rápido.
  - Mudança documental; sem validações adicionais de build/test nesta etapa.
- Ajuste incremental (`tmp/ai/20260215-0755-human-readme`):
  - README raiz reestruturado para onboarding humano (visão do produto, quickstart, fluxo de uso e limites).
  - Seções práticas adicionadas: demo rápida, sincronização manual da DSL, scripts principais e mapa de docs.
  - Links explícitos para `docs/UI_JOURNEYS_CAPABILITIES.md`, `docs/AI_STATE.md`, `docs/WORKLOG.md` e `docs/DECISIONS.md`.
  - Mudança documental; sem validações adicionais de build/test nesta etapa.
- Ajuste incremental (`tmp/ai/20260215-0945-dsl-spec`):
  - Criada spec oficial da DSL LITE em `docs/DSL_LITE_SPEC.md` com duas visões:
    - EBNF (gramática formal),
    - human readable (regras práticas para humanos e IAs).
  - Seção específica adicionada para hierarquia/drilldown, esclarecendo limite atual:
    - DSL LITE representa uma view por vez,
    - não serializa `drilldownRef`/links entre views.
  - README atualizado para referenciar a nova spec.
  - Mudança documental; sem validações adicionais de build/test nesta etapa.
- Ajuste incremental (`tmp/ai/20260215-1000-dsl-hierarchy-boundary`):
  - DSL LITE evoluída para suportar arquivo único multi-view:
    - `view <viewId> <viewKind>`
    - `parent <viewId> via <alias>`
    - `drilldown <viewId>` em node.
  - Conceito de fronteira por grupo adicionado na DSL:
    - `boundary ... contains alias1,alias2,...`
    - import aplica `children` e ajusta bounds da boundary para envolver o grupo.
  - Conversão DSL->FULL agora resolve hierarquia pai/filho e mantém compatibilidade com sintaxe legada de view única.
  - Export DSL atualizado para workspace completo (`fullWorkspaceToLiteDsl`) e botão da UI alterado para `Exportar workspace completo`.
  - Testes de DSL expandidos para cobrir multi-view, drilldown por `parent/via`, boundary group e roundtrip.
  - Spec da DSL (`docs/DSL_LITE_SPEC.md`) atualizada para refletir a nova gramática/semântica.
  - Guia de capacidades da UI e README atualizados com o novo comportamento.
  - `docs/DECISIONS.md` atualizado com decisão arquitetural da DSL unificada multi-view.

### Validação executada

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`
- `npm --workspace @sjv/codex-gateway run test:run`

- Ajuste incremental (`tmp/ai/20260215-1007-canvas-interactions`):
  - Canvas ganhou seleção múltipla de componentes por modificador (`Shift/Ctrl/Cmd`) com arraste em grupo preservando alinhamento por grid.
  - Resize de node foi migrado para hit-area de borda inteira, com cursor contextual (`ew/ns/diagonal`) e suporte a ajuste por qualquer aresta/canto.
  - Ports passaram a ser dinâmicos por tamanho do node (`resolveNodePorts`), com normalização em workspace default/snapshot/import DSL e recomputação em resize.
  - Manipulação de arestas no modo `Select`: arraste de endpoint a partir de encaixe, preview ao vivo e reconexão para outro encaixe ou body do node (resolução para porta mais próxima).
  - Estratégia para múltiplas arestas no mesmo encaixe implementada com desempate por proximidade da curva e ciclo por cliques sucessivos no mesmo anchor.
  - Topbar recebeu menu desktop (`File/Edit/View/Insert`) mantendo os botões rápidos existentes.
  - Cobertura adicionada para: portas dinâmicas, multi-select/reconexão no store e estilos novos de menu/interação.

### Validação executada (ajuste canvas-interactions)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

- Ajuste incremental (`tmp/ai/20260215-1035-import-temp-visual`):
  - Pasta `temp/` analisada para capturar direção visual da UI embrionária (paleta, setas e rastro).
  - `App.css` atualizado com tokens visuais do canvas (`--sjv-*`) e nova direção dark:
    - gradientes radiais no fundo,
    - grid de baixa opacidade,
    - contraste azul/verde para destaque de seleção/fluxo.
  - Setas receberam arrowhead estilizado por classe CSS (`.edge-arrow-head`) para acompanhar a nova paleta.
  - Canvas de trail/player recebeu refinamento visual no `DiagramCanvas`:
    - rastro mais intenso/contínuo,
    - glow de trilha e partícula,
    - track base + track de progresso sobre a aresta ativa,
    - halo externo da bolinha para percepção de movimento.
  - Teste de estilos ampliado para cobrir tokens/pontos de estilo da nova identidade visual.

### Validação executada (ajuste import-temp-visual)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

- Ajuste incremental (`tmp/ai/20260215-1047-showcase-dark-default`):
  - Showcase base (`createDefaultWorkspace`) migrado para `theme: dark` por padrão.
  - Cores fixas por node (`style.fillColor`) removidas do seed do showcase para deixar a identidade visual definida pela paleta global da UI.
  - Tracejado animado da aresta ativa do player passou a ficar visível também fora do estado `playerIsRunning` (modo render/pausado), já que o rastro cobriu melhor o feedback de animação.

### Validação executada (ajuste showcase-dark-default)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

- Ajuste incremental (`tmp/ai/20260215-1058-smooth-dashed-arrows`):
  - Todas as setas renderizadas pelo `JourneyEdge` agora mantêm classe de fluxo tracejado animado sempre ativa (não há mais seta sólida no canvas).
  - Preview de conexão também passou a usar o mesmo tracejado animado para manter consistência visual.
  - Animação de dash foi suavizada para evitar “engasgo” no loop:
    - padrão reduzido (`stroke-dasharray: 6 6`),
    - deslocamento final alinhado ao período do dash (`stroke-dashoffset: -12`),
    - velocidade ajustada para `0.9s linear infinite`.
  - Estilo base de aresta recebeu `stroke-linecap`/`stroke-linejoin` arredondados para leitura mais suave do traço.
  - Novo helper testável para classes da aresta (`journeyEdgeClassName.ts`) e testes adicionados/atualizados:
    - `apps/web/src/components/JourneyEdge.test.ts`
    - `apps/web/src/App.styles.test.ts`

### Validação executada (ajuste smooth-dashed-arrows)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

- Ajuste incremental (`tmp/ai/20260215-1120-remove-impact-shake`):
  - Removida a animação de tremida no hit do player no componente de destino.
  - `DiagramCanvas` deixou de aplicar as classes de impacto (`node-player-impact` e `node-group-impact`) durante a passagem do fluxo.
  - CSS limpo das regras e keyframe de shake (`@keyframes node-impact-shake`), mantendo apenas o feedback de iluminação (`node-player-highlight`).
  - Teste de estilos atualizado para garantir presença da animação de fluxo e ausência da animação de impacto.

### Validação executada (ajuste remove-impact-shake)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

- Ajuste incremental (`tmp/ai/20260215-1127-ui-ux-focus-sidebar`):
  - Branch `develop` criada a partir de `roadmap/m9-export` para centralizar a continuidade dos ajustes visuais.
  - Controles de jornada/filtro/player movidos para a lateral direita, junto do Inspector, em painel dedicado com layout vertical (mais estável em viewport menor).
  - Lista de jornadas mantida na lateral com seleção/autoplay e toggle de filtro por jornada.
  - Drawer inferior de jornadas simplificado para `Journey Timeline` (passos da jornada ativa), removendo a toolbar horizontal congestionada.
  - Modo foco adicionado (`Modo foco` na topbar, atalho `F` para alternar e `Esc` para sair):
    - oculta palette, inspector e painel inferior,
    - mantém canvas ocupando praticamente toda a tela útil.
  - CSS refinado para UX “studio-like”:
    - painéis laterais com blocos visuais (`sidebar-panel`),
    - controles de jornada em grid/linhas responsivas,
    - ajustes de responsividade para topbar/actions em larguras menores.
  - Teste de estilos atualizado para cobrir classes novas de foco e jornada lateral.

### Validação executada (ajuste ui-ux-focus-sidebar)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

- Ajuste incremental (`tmp/ai/20260215-1127-ui-ux-focus-sidebar`, continuação):
  - Menubar de topo refeito para padrão desktop profissional (estado controlado), removendo dependência de `details/summary`.
  - Menu agora fecha por clique fora/`Esc` e permite troca rápida entre menus por `ArrowLeft`/`ArrowRight` quando aberto.
  - Itens de menu ganharam estrutura mais clara (`label + shortcut`) e papel semântico (`role="menu"` / `menuitem`).
  - Topbar recebeu logo do app e hierarquia visual revisada.
  - Barra de ações rápidas foi simplificada para evitar duplicidade com o menubar.
  - Editor DSL recebeu polimento de UI:
    - superfície dedicada com contraste melhor,
    - tipografia mono refinada,
    - campo de edição com estados de foco mais claros e feedback textual mais legível.
  - Estilos dark/light atualizados para o novo menubar e novo visual do DSL.
  - Teste de estilos ampliado para cobrir classes novas de menubar/logo.

### Validação executada (ajuste menubar-pro-and-dsl-polish)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

- Ajuste incremental (`tmp/ai/20260215-1501-monaco-dock-player-polish`, continuação):
  - DSL recebeu nome oficial `JourneyScript` e editor Monaco integrado (`@monaco-editor/react` + `monaco-editor`), com:
    - registro de linguagem custom (`journey-script`) via Monarch,
    - tema dedicado light/dark,
    - migração do `textarea` para Monaco no drawer DSL.
  - UI de painéis evoluída para dockable workflow:
    - `Inspector` e `Journeys` agora vivem em um dock com abas arrastáveis,
    - dock pode alternar entre direita e baixo,
    - quando dockado embaixo, aparece como aba `Dock` no drawer.
  - Journeys lateral ganhou reorder por drag-and-drop (ordem persistida em `view.journeyIds`).
  - Player recebeu grupo de controles padrão com ícones (`prev/play-pause/next/reset`) e ação `prevPlayerStep` no store.
  - Topbar refinada com controles de visibilidade de painéis (palette/dock/workbench), mantendo menubar desktop e logo integrado ao bloco principal de menu.
  - Novo preset `Presentation mode` (`P`) com comportamento de demo:
    - oculta painéis para visão executiva,
    - restaura layout ao sair.
  - Refino de alças/ports:
    - portas de topo/base não usam mais cantos,
    - densidade de portas aumentada (spacing reduzido),
    - bolinhas de porta menores no canvas.
  - Confete do player com raio reduzido para efeito mais discreto (`MIN/MAX` menores).
  - Estilos atualizados para suportar dock, microinterações de abertura e Monaco no tema claro/escuro.
  - Cobertura de testes atualizada para store, estilos, ports e confete.

### Validação executada (ajuste monaco-dock-player-polish)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0728-menu-dock-confetti`):
  - Menubar corrigido para sobreposição consistente acima do canvas:
    - topbar/menu com z-index reforçado,
    - dropdown com prioridade visual maior,
    - redução de transparência para aparência mais sólida/profissional.
  - Dock refinado para padrão “desktop app” (Photoshop/Gimp-like):
    - controles de tabs/posição movidos para o header principal da janela,
    - painel dock ficou focado apenas no conteúdo ativo.
  - Confete do player ficou mais discreto e local:
    - raio mínimo/máximo reduzido,
    - menos bursts e menos partículas,
    - expansão mantida dentro da área do componente alvo,
    - duração/energia dos bursts reduzida no disparo.
  - Testes do helper de confete atualizados para os novos limites e cardinalidade de bursts.

### Validação executada (ajuste menu-dock-confetti)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0728-menu-dock-confetti`, continuação):
  - Lógica de animação do player foi acoplada ao progresso real da bolinha no path (rAF), removendo avanço automático por `setInterval`.
  - Sequenciamento agora é estrito por step:
    - bolinha percorre a aresta até o endpoint,
    - destino só destaca quando o progresso chega em `1.0`,
    - próxima seta só inicia após o evento de chegada (com hold curto para leitura visual).
  - Implementação isolada em helper testável (`playerStepTimeline`) para cálculo de progresso e gate de avanço pós-chegada.
  - Novo teste unitário cobre: clamp de progresso, hold de chegada e garantia de não disparar avanço múltiplo no mesmo step.

### Validação executada (ajuste player-strict-arrival)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0759-perf-canvas-optimization`):
  - Loop do `DiagramCanvas` otimizado para reduzir custo de render e GC durante animação contínua.
  - Overlay do trail passou a usar resize dedicado (`ResizeObserver` + `window.resize`), removendo leitura de layout por frame (`clientWidth/clientHeight`) dentro do `rAF`.
  - Canvas do trail agora usa `devicePixelRatio` com teto (`1.5`) para equilibrar nitidez e custo em telas HiDPI.
  - Trilha do player deixou de usar `slice/filter` em cada frame:
    - trim por limite máximo (`MAX_TRAILS`) agora é in-place,
    - compactação de partículas expiradas agora é in-place.
  - Ajustes adicionais no loop:
    - cálculos de zoom reaproveitados por frame (`inverseSafeZoom`),
    - partículas quase invisíveis deixam de ser desenhadas,
    - amostragem do progresso da curva ficou adaptativa ao percentual percorrido.
  - Helpers novos em `trailMath` com testes unitários (`trimArrayStartInPlace` e `compactPositiveAlphaInPlace`).

### Validação executada (ajuste perf-canvas-optimization)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0814-player-smooth-perf`):
  - Player deixou de publicar progresso contínuo em state React por frame no `DiagramCanvas`.
  - Highlight do destino agora atualiza apenas na transição de chegada (`false -> true`) por step, reduzindo churn de render no componente.
  - Loop de desenho passou a ler viewport por `ref` (sincronizado em effect), evitando reinstanciar o effect principal de animação em cada pan/zoom.
  - Hold de chegada foi reduzido para `40ms`, deixando a transição entre arestas mais responsiva sem perder semântica de “chegada”.
  - Política de tracejado ajustada para performance:
    - arestas continuam tracejadas por padrão,
    - animação de dash fica ativa apenas em arestas de contexto (player edge, filtro/jornada ativa ou edge selecionada).
  - `JourneyEdge`/helper de classes evoluídos para separar `edge-flowing` (estático) de `edge-flowing-animated` (animado).
  - Testes atualizados para refletir as novas classes e contratos de estilo.

### Validação executada (ajuste player-smooth-perf)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0824-export-animated-journeys`):
  - Novo pipeline de export animado para jornadas integrado ao menu `File`:
    - `Export GIF`,
    - `Export MP4` (com fallback automático para `WebM` quando MP4 não é suportado no browser),
    - `Export Animated SVG`.
  - Módulo novo `animatedExport` adiciona captura composta do canvas:
    - snapshot do SVG com estilos computados inline,
    - composição com `trail-canvas` em blend `screen` para manter o visual do rastro/orb,
    - render por frames para GIF e gravação via `MediaRecorder` para vídeo.
  - Export `Animated SVG` gera arquivo standalone com animação contínua do orb ao longo dos steps da jornada (loop).
  - Fluxo do App ajustado para:
    - resolver jornada alvo automaticamente (filtro/player/ativa),
    - preparar playback para captura,
    - restaurar estado original do player após export.
  - Feedback visual de export adicionado no topo (`topbar-status`) e botões de export animado ficam desabilitados durante geração.
  - Dependência `gifenc` adicionada para encoding GIF no browser.
  - Testes unitários novos para helpers de export animado (duração total e seleção de codec de vídeo).

### Validação executada (ajuste export-animated-journeys)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0910-export-loop-fix`):
  - Export GIF ajustado para capturar frames primeiro e codificar depois, evitando perda de trechos da jornada por custo de quantização em tempo real.
  - GIF agora força loop (`repeat: 0`) e adiciona frame de fechamento para transição contínua no reinício.
  - Export Animated SVG revisado para percorrer a jornada completa em um ciclo contínuo:
    - timeline com `keyTimes/keyPoints` por step (travel + hold),
    - loop infinito preservando pausa curta em cada chegada.
  - Export Animated SVG/GIF/MP4 agora preserva fundo temático do canvas (`dark/light`) e remove a grade no arquivo final.
  - Helpers novos de export cobertos por teste:
    - seleção distribuída de frames para paleta GIF,
    - timeline de loop da jornada.

### Validação executada (ajuste export-loop-fix)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0935-export-alignment-speed`):
  - Export animado desacelerado para leitura visual mais suave:
    - novo helper `resolveExportPlaybackSpeedMs` aplica fator dedicado no ritmo de caminhada da jornada exportada.
    - ritmo aplicado para GIF/MP4 (captura do player) e também para SVG animado.
  - Estado do player durante export passou a restaurar também a velocidade original após conclusão.
  - Composição de export (GIF/MP4) agora usa as dimensões efetivas do `trail-canvas` para evitar drift/desalinhamento entre rastro e path.
  - Snapshot do SVG para composição passou a respeitar explicitamente as dimensões do renderer, mantendo base e trilha no mesmo frame-space.
  - Pequeno ajuste de estabilização antes da captura (`waitForCanvasFrames(4)`), reduzindo artefatos de início.
  - Teste unitário novo para o cálculo de velocidade de export.

### Validação executada (ajuste export-alignment-speed)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0920-export-slower-arrival-hold`):
  - Export animado ficou mais lento para leitura:
    - multiplicador de velocidade dedicado do export aumentado (`1.6x`) para GIF/MP4/SVG.
  - Lógica de chegada do player ajustada para evitar avanço/confete prematuro:
    - hold padrão de chegada aumentado para `90ms`,
    - último step da jornada com hold específico maior (`220ms`) antes de `stepPlayer`.
  - Efeito prático:
    - menor sensação de “já disparou próximo/confete antes de chegar” no trecho final,
    - destaque/confete com timing mais coerente com a percepção visual do rastro.
  - Testes atualizados para os novos contratos de duração/velocidade do export.

### Validação executada (ajuste export-slower-arrival-hold)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`


- Ajuste incremental (`tmp/ai/20260216-0920-export-slower-arrival-hold`, continuação):
  - Player ganhou opção para desligar rastro e manter só a bolinha:
    - novo estado no store `playerTrailEnabled`,
    - toggle `Trail` nos controles de jornada,
    - canvas deixa de desenhar trilha/progresso quando desativado, mantendo orb.
  - Export Animated SVG revisado para robustez estrutural:
    - resolução dos steps passou a usar paths reais já renderizados no SVG (`*_path`) quando disponíveis,
    - fallback para recomputação geométrica mantido apenas como contingência.
  - Overlay animado (orb/halo) do SVG exportado passa a ser anexado no layer transformado (`g[transform]`), preservando alinhamento com viewport atual.
  - Removidos paths de overlay tracejados extras do SVG exportado, reduzindo poluição visual e casos de “quebra” da estrutura.

### Validação executada (ajuste trail-toggle-svg-structure)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`
