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

### Validação executada

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`
