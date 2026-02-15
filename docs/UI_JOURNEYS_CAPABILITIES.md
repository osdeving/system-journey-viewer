# UI Journeys e Capacidades (Estado Atual)

Documento de referência rápida para não se perder no que a UI já suporta hoje.

## 1) Mapa rápido da tela

- Topbar:
  - `Back`, `Select`, `Connector`, `Reload`, `Save`
  - `Export SVG`, `Export PNG`, `Export PDF`
  - `Zoom +`, `Zoom -`
  - toggles `Grid`, `Snap`, `Dark`
  - `Showcase`, `Reset`
- Sidebar esquerda (`Palette`):
  - presets de node por categoria (drag-and-drop para o canvas)
- Centro (`Canvas`):
  - edição visual (mover/redimensionar nodes, conectar, selecionar edge/node)
- Sidebar direita (`Inspector`):
  - edição de propriedades de node/edge selecionado
- Drawer inferior:
  - aba `Journeys`
  - aba `DSL` (com opção `Maximizar DSL`)

## 2) Jornada principal do usuário (happy path)

1. Montar estrutura base
- Arraste presets da `Palette` para o canvas.
- Em `Select`, mova e redimensione nodes.
- Edite `Nome`, `Tecnologia` e `Cor` no `Inspector` quando um node estiver selecionado.

2. Criar comunicações (edges)
- Troque para `Connector`.
- Crie edge arrastando de uma alça (porta) para outra alça.
- Selecione a edge e ajuste `Label` e `Protocolo` no `Inspector`.

3. Criar e montar jornada
- Na aba `Journeys`, clique em `Criar jornada`.
- Com a jornada ativa, selecione edges e use `Add to Active Journey` no `Inspector` da edge.
- Use `Filtrar` para mostrar visualmente uma jornada específica.

4. Executar jornada no player
- Selecione a jornada no combo `Player: selecione jornada` ou clicando no item da lista.
- Use `Play`, `Pausar`, `Step`, `Reset Player`.
- Ajuste `Loop`, `Highlight Nodes` e `Speed`.

5. Navegar entre camadas (drilldown)
- Faça double-click em node com `drilldown` para descer de camada.
- Use `Back` para voltar.

6. Exportar ou usar DSL
- Exporte o canvas em `SVG/PNG/PDF`.
- Na aba `DSL`, use `Exportar view atual` e `Importar DSL`.
- Opcional: `Refinar com Codex` para assistência textual da DSL.

## 3) O que a UI já permite hoje

- Edição visual de diagrama:
  - criar node por drag-and-drop
  - mover, redimensionar e selecionar
  - pan/zoom no canvas
  - grid e snap configuráveis
- Conexões:
  - edge por porta→porta (modo `Connector`)
  - edição de label e protocolo da edge
- Journeys:
  - criar jornada
  - associar/remover edges da jornada
  - filtrar jornada
  - autoplay ao selecionar jornada na lista
- Player:
  - play/pause/step/reset
  - loop e velocidade
  - highlight de nós e efeitos visuais de fluxo
- Drilldown:
  - container → component → hex (quando há referência)
- DSL:
  - exportar view para DSL LITE
  - importar DSL LITE (reconstrói workspace)
  - assistência do Codex via gateway
- Export:
  - SVG, PNG e PDF
- Persistência:
  - `Save`/`Reload` e persistência local com autosave por debounce
- Aparência:
  - tema light/dark
  - cores por node (inclui paleta de últimas cores)
  - shapes específicos para `db` e `queue`

## 4) O que NÃO está disponível (limites atuais)

- Não há remoção direta de edge isolada pela UI.
  - Hoje a remoção de edge ocorre ao remover um node conectado, ou ao remover a edge de uma jornada (sem apagar a edge do diagrama).
- Não há gestão completa de jornada (ex.: renomear ou excluir jornada) pela UI atual.
- Não há reordenação manual de passos da jornada por drag-and-drop.
  - A ordem é baseada no campo `n` dos passos ao adicionar.
- Não há undo/redo.
- Não há seleção múltipla/cópia/cola de nodes.
- Conexão por clique em node (sem alça) não é suportada no modo atual.
  - Apenas alça→alça no `Connector`.

## 5) Atalhos e comportamentos importantes

- `Delete` / `Backspace`:
  - remove node selecionado (com confirmação)
  - também remove edges conectadas e limpa passos de jornadas afetadas
- Troca de view (drilldown/back):
  - interrompe player em execução
  - reposiciona jornada do player para a camada atual
- `Importar DSL`:
  - substitui o workspace atual pelo importado

## 6) Referência de uso rápido (checklist)

- Quero só desenhar arquitetura:
  - `Select` + `Palette` + `Inspector`
- Quero ligar componentes:
  - `Connector` + arraste alça→alça
- Quero mostrar fluxo de negócio:
  - `Journeys` + `Add to Active Journey` + `Play`
- Quero detalhar níveis:
  - double-click para drilldown + `Back`
- Quero versão textual:
  - aba `DSL`
- Quero compartilhar:
  - `Export SVG/PNG/PDF`
