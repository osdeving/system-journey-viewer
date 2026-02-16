# AI_STATE

## Current Snapshot

- Roadmap milestones `M0 -> M9` were implemented.
- Feature branches were promoted without merge commits using cherry-pick flow.
- Architecture baseline:
  - custom SVG editor engine (internal adapter, no paid lock-in),
  - versioned FULL model (`schemaVersion: 1.0`) as source of truth,
  - DSL LITE (`JourneyScript`) for text import/export.
- Optional Codex assistance integrated via server-side gateway (`apps/codex-gateway`).

## Implemented Product Flows

- Canvas editing with pan/zoom, grid/snap, nodes/edges, ports, and docking.
- Preset catalog for C4, infra, and hexagonal architecture semantics.
- Theme persistence (`light` / `dark`) in workspace settings.
- Journey creation, filtering, and playback controls.
- Drill-down navigation (`Container -> Component -> Hex`) with breadcrumb.
- DSL LITE <-> FULL conversion with auto-layout.
- Static export (`SVG`, `PNG`, `PDF`).
- Animated export (`GIF`, `MP4`, animated `SVG`) with journey timeline playback.
- Presentation mode with clean rendering and export-focused controls.

## Animation and Player State

- Strict step sequencing:
  - edge animation progresses until endpoint,
  - destination highlight fires on visual arrival,
  - next step starts only after arrival hold.
- Optional trail toggle:
  - keep only orb motion when trail is disabled.
- Contextual dashed-edge animation:
  - dashed style for all edges,
  - animated dash prioritized for active journey context.
- Reduced confetti radius and intensity for subtle target-local feedback.

## Performance-Oriented Updates

- Trail canvas resize moved out of per-frame loop (`ResizeObserver` + viewport handlers).
- Device-pixel-ratio cap on trail overlay to reduce HiDPI fill-rate cost.
- In-place trail trimming/compaction to lower allocations and GC churn.
- Reduced React state churn from per-frame progress updates.

## UI/UX State

- Desktop-style menubar with controlled open/close behavior.
- Dockable side panel (`Inspector` / `Journeys`) with tab drag and position switching.
- Standard player control group with icon-based actions.
- Monaco-based `JourneyScript` editor with custom highlighting theme.
- Focus/presentation workflows for demo-friendly screen usage.

## Export State

- GIF export loops continuously and captures full journey playback.
- MP4 export enforces explicit codec support (no silent downgrade).
- Animated SVG export uses rendered path geometry when available.
- Export output applies canvas background theme and omits edit grid.

## Open Source / Delivery Readiness (2026-02-16)

- Documentation normalized to English.
- Community files added:
  - `CONTRIBUTING.md`
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - `SUPPORT.md`
  - `LICENSE`
- GitHub templates and CI workflow added under `.github/`.
- `vercel.json` added for static Vercel deployment of `apps/web`.
- README now includes embedded product demos (GIF/MP4) and a reproducible Playwright capture script (`scripts/capture-readme-demo.mjs`) to regenerate live UI media.

## Suggested Next Increments

- Upgrade edge routing with stronger orthogonal controls.
- Add full floating undocked windows and saved layout presets.
- Add undo/redo stack to the public UI workflow.
- Add integration tests for animated export pipeline and presentation mode regressions.
