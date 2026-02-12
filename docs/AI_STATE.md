# AI_STATE

## Estado atual

- Roadmap M0→M9 implementado.
- Branch por etapa criada (`roadmap/m0-*` até `roadmap/m9-*`), com promoção por cherry-pick sem merge commit.
- Arquitetura adotada: editor SVG custom com adapter interno (sem lock-in), modelo FULL versionado (`schemaVersion: 1.0`) e DSL LITE para import/export textual.

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
- Player com rastro iluminado temporal via canvas overlay (trail com fade/remoção).
- Labels de comunicação com numeração de jornada à esquerda quando há contexto de passo.

## Próximos incrementos sugeridos

- Refinar roteamento ortogonal avançado.
- Introduzir Monaco para DSL (atualmente textarea).
- Otimizar bundle do export PDF (chunk grande por `jspdf`).
