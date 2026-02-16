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
- Player refinado com chegada visual ao final da seta antes do highlight do destino, sem tremida no componente alvo (somente iluminação) e fluxo tracejado animado na aresta ativa.
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
- Layout com splitters para redimensionar painel inferior (timeline/DSL) e toolbox (largura).
- Indicadores visuais de modo exibindo ferramenta ativa, camada atual e estado do player (Animação/Render).
- Painel de Journeys reposicionado para a lateral direita junto ao Inspector, com controles verticais (filtro/player) para melhor responsividade.
- Drawer inferior com tabs (`Journey Timeline` / `DSL`) para separar leitura de passos da edição de DSL.
- DSL com ação de maximizar/restaurar painel para edição focada.
- Modo foco (`F` / `Esc`) adicionado para canvas full-view, ocultando paleta, inspector e painel inferior.
- Menubar desktop refatorado para estado controlado (sem `details`), com fechamento por clique externo/`Esc`, navegação entre menus por setas e logo do app na topbar.
- Topbar com ações rápidas reduzidas e restante das operações concentradas no menubar, melhorando legibilidade.
- Editor DSL recebeu polimento visual (surface dedicada, tipografia mono refinada, foco/contraste e feedbacks mais claros).
- DSL ganhou nome oficial `JourneyScript` e integração com Monaco (`@monaco-editor/react`) com syntax highlighting custom (Monarch) e tema light/dark dedicado.
- Painel `Inspector/Journeys` virou dockable window: abas arrastáveis, reposicionamento para direita/baixo e abertura via drawer quando dockado embaixo.
- Controles do Dock migrados para o header da aplicação (estilo desktop app), mantendo o painel de conteúdo separado.
- Menubar/topbar receberam reforço de hierarquia visual (z-index e opacidade) para dropdown sempre sobre o canvas.
- Lista de jornadas lateral ganhou reorder por drag-and-drop, mantendo persistência na ordem da view.
- Player recebeu controle padrão com ícones (retroceder, play/pause, avançar, reset) e suporte a passo anterior no store.
- Layout ganhou preset `Presentation mode` (`P`) + microinterações de abertura/fechamento de painéis (palette, dock, workbench).
- Ports/alças refinados: sem cantos no topo/base, maior densidade de encaixes por tamanho, bolinhas menores e mais discretas.
- Confete do player ficou mais discreto e local ao componente alvo (raio menor, menos partículas, bursts mais curtos).
- DSL com assistência do Codex: instrução customizada, execução via endpoint `/api/codex/dsl-assist`, reaproveitamento de `threadId` e ação para limpar contexto do thread.
- Vite com proxy `/api/codex` para gateway local (`http://localhost:8787`) durante desenvolvimento.
- Guia de operação da UI disponível em `docs/UI_JOURNEYS_CAPABILITIES.md` (jornadas de uso, capacidades e limitações atuais).
- README raiz reestruturado para leitura humana (onboarding rápido, fluxo de uso, limites atuais e mapa de documentação).
- Spec oficial da DSL LITE disponível em `docs/DSL_LITE_SPEC.md` (EBNF, semântica, catálogo e limites de hierarquia/drilldown).
- DSL LITE evoluída para arquivo único multi-view com hierarquia (`parent/via`, `drilldown`) e fronteira por grupo (`contains`) aplicada no render via boundary.
- Canvas com seleção múltipla de componentes (add/remove por modificador), arraste em grupo e remoção em lote via teclado.
- Resize de node por arraste em qualquer trecho da borda, com cursor contextual por direção de ajuste.
- Ports dinâmicos por tamanho do node (mais encaixes conforme largura/altura), propagados em criação/import e resize.
- Manipulação de setas no modo Select: drag de endpoint por encaixe, reconexão para outro encaixe ou body do node (auto-nearest port) e ciclo de desempate quando múltiplas setas compartilham o mesmo encaixe.
- Topbar com menu desktop (`File/Edit/View/Insert`) além dos botões rápidos existentes.
- Visual refresh do canvas inspirado na UI de referência em `temp/`: paleta dark azul/verde, fundo com gradientes radiais, setas com arrowhead customizado e rastro do player com glow reforçado (track base + progresso + orb halo).
- Showcase padrão ajustado para identidade dark (tema default `dark`) e sem cores fixas por node no seed, permitindo que a paleta visual da UI conduza o look inicial.
- Todas as setas agora usam tracejado animado contínuo (inclusive preview de conexão), com ciclo de dash sem salto perceptível para movimento mais suave.

## Próximos incrementos sugeridos

- Refinar roteamento ortogonal avançado.
- Evoluir dock para undock em janela flutuante real (drag livre) e presets salvos de layout por usuário.
- Otimizar bundle do export PDF (chunk grande por `jspdf`).
