# AI_STATE

## Current Snapshot

- Roadmap milestones `M0 -> M9` were implemented.
- Feature branches were promoted without merge commits using cherry-pick flow.
- Latest UI increment (2026-02-19) added stronger dock/view controls, local recents memory, and in-app markdown help.
- Architecture baseline:
  - custom SVG editor engine (internal adapter, no paid lock-in),
  - versioned FULL model (`schemaVersion: 1.0`) as source of truth,
  - DSL LITE (`JourneyScript`) for text import/export.
- Optional Codex assistance integrated via server-side gateway (`apps/codex-gateway`).

## Implemented Product Flows

- Canvas editing with pan/zoom, grid/snap, nodes/edges, ports, and docking.
- Preset catalog for C4, infra, and hexagonal architecture semantics.
- Theme persistence (`light` / `dark`) in workspace settings.
- Journey creation, filtering, playback, and timeline editing controls.
- Global undo/redo history for workspace and major UI layout state (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y`).
- Journey filter focus modes:
  - off-scope render strategy: `show`, `dim`, `hide`,
  - optional journey-only reflow layout while filtering.
- Journey authoring from canvas:
  - drag/release an edge into a journey to append it as the next step;
  - drag-and-drop timeline steps to reorder with automatic renumbering.
- Selection lifecycle operations:
  - delete selected nodes or selected edge (`Delete/Backspace`);
  - duplicate selected node set or selected edge (`Ctrl/Cmd+D`);
  - same actions available in `Edit` menu and `Inspector`.
- Drill-down navigation (`Container -> Component -> Hex`) with breadcrumb.
- Shortcut-assisted drilldown modeling:
  - `Ctrl/Cmd+Alt+double-click` converts a node into a drilldown boundary entry and opens its new detail view.
- DSL LITE <-> FULL conversion with auto-layout.
- DSL LITE now supports optional UI-only geometry metadata:
  - `metadata ui-layout` for node bounds and edge label positions.
  - edge metadata now supports label side (`left|right`) in addition to label progress.
  - edge metadata also supports optional label font size.
- Static export (`SVG`, `PNG`, `PDF`).
- Animated export (`GIF`, `MP4`, animated `SVG`) with journey timeline playback.
- Presentation mode with clean rendering and export-focused controls.
- Workspace file lifecycle in-browser UI:
  - `New File` (blank workspace),
  - `Open File` (snapshot or DSL import: `.json/.sjv/.dsl/.txt`),
  - `Save File` with File System Access API support (handle reuse on `Ctrl/Cmd+S` and Save As on `Ctrl/Cmd+Shift+S`, with download fallback as `.sjv.json`).
  - entry view selection for DSL import now respects drilldown hierarchy (root/top-level view first, instead of arbitrary view key order).
- View hierarchy selector in topbar allows direct navigation across all nested views.
- `replaceWorkspace`/`goToView` now rebuild breadcrumb-compatible history from hierarchy, so `Back` works even when opening a deep view directly.

## Animation and Player State

- Strict step sequencing:
  - edge animation progresses until endpoint,
  - destination highlight fires on visual arrival,
  - next step starts only after arrival hold.
- Optional trail toggle:
  - keep only orb motion when trail is disabled.
- Default startup playback state:
  - loop enabled,
  - trail disabled,
  - slower base speed (`1800ms`),
  - default visual preset equivalent to `Orb only`.
- Contextual dashed-edge animation:
  - dashed style for all edges,
  - animated dash prioritized for active journey context.
- Reduced confetti radius and intensity for subtle target-local feedback.
- Connector UX now supports:
  - temporary connect mode while holding `Ctrl`,
  - modifier priority (`Ctrl+Alt`) that keeps drilldown gestures from being hijacked by connector mode,
  - target node/port highlight while dragging,
  - release-to-connect with nearest-handle resolution.

## Performance-Oriented Updates

- Trail canvas resize moved out of per-frame loop (`ResizeObserver` + viewport handlers).
- Device-pixel-ratio cap on trail overlay to reduce HiDPI fill-rate cost.
- In-place trail trimming/compaction to lower allocations and GC churn.
- Reduced React state churn from per-frame progress updates.

## UI/UX State

- Desktop-style menubar with controlled open/close behavior.
- File menu now separates:
  - local browser snapshot operations (`Save Snapshot`, `Reload Snapshot`),
  - disk file operations (`New/Open/Save File`).
- Infra visual language includes hexagon shapes for:
  - `gateway`,
  - `security`,
  - `load-balancer`.
- Dockable side panel (`Inspector` / `Journeys`) with tab drag and position switching.
- Dock/workbench now supports broader panel layout control:
  - dock tabs include `Inspector`, `Journeys`, `Timeline`, `DSL`, `Help`,
  - dock can be placed on right, bottom, or floating window,
  - floating dock is draggable, horizontally resizable from the right edge, and clamped to viewport bounds,
  - View menu exposes show/hide actions for palette, dock, and workbench.
- Standard player control group with icon-based actions.
- Intelligent view auto-arrange is available on demand:
  - View menu: `Auto Arrange`,
  - shortcut: `Ctrl/Cmd+Shift+L`,
  - applies best-effort node spacing/sizing, boundary refit, and edge-label repositioning.
- Journey panel now controls focus/layout policy:
  - `offscopeRenderMode` (`show|dim|hide`),
  - `layoutMode` (`preserve|reflow`),
  - `autoLayoutMode` (`manual|always`),
  - `Apply layout now` for manual scoped reflow.
- Top desktop menu now includes a dedicated `Journey` menu with parity actions for filtering/layout/player controls.
- Stronger edge editing UX:
  - selected edge marker rendered directly on path,
  - edge label isolation styling,
  - draggable edge label position (plus inspector slider),
  - draggable label side flip (left/right side of edge),
  - readable label orientation (avoids upside-down text, vertical-safe orientation),
  - click-hold + mouse wheel to increase/decrease edge label font size,
  - click-hold + `Alt` + mouse wheel to rotate edge label text with faster angle step,
  - double-click inline edge label editing.
- Node text editing and layout:
  - double-click inline editing for node title and subtitle/tech text,
  - hexagon infra nodes now render centered/top labels with truncation to avoid overflow.
- Monaco-based `JourneyScript` editor with custom highlighting theme.
- Focus/presentation workflows for demo-friendly screen usage.
- Presentation mode center indicators now show both `Step X/Y` and the currently animated step label.
- Presentation step label pill now keeps single-line behavior and playing-color parity with the step counter.

## Export State

- GIF export loops continuously and captures full journey playback.
- MP4 export enforces explicit codec support (no silent downgrade).
- Animated SVG export uses rendered path geometry when available.
- Export output applies canvas background theme and omits edit grid.
- Animated journey export now forces a compact focused render during capture (journey-only visual scope), then restores editor state.

## Local Persistence State

- Layout persistence now has dual path:
  - full snapshot persistence (`persist/hydrate`) for editor session state;
  - dedicated UI layout persistence in localStorage by `workspaceId` (node bounds + edge label positions), auto-applied on DSL import.
- Edge label angle is now part of persisted UI layout and DSL UI metadata import/export.
- File menu includes local recents memory (up to 3 saved snapshots) for quick reopen.

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
- README demo section now includes:
  - a visible warning that automated robot capture may show temporary UI misalignment;
  - a static screenshot reference (`docs/print-ui.png`) for layout fidelity.
- Vercel deployment compatibility updated:
  - root build now mirrors `apps/web/dist` to repository-level `dist` via `scripts/prepare-root-dist.mjs`;
  - `vercel.json` now uses `outputDirectory: "dist"` to match Vercel project defaults.
- Build chunking was improved with lazy-loading of Monaco and manual chunk splitting in Vite config.
- Dependabot version-update automation was disabled by removing `.github/dependabot.yml` to avoid automatic dependency PR churn in the current solo-maintainer phase.

## Suggested Next Increments

- Upgrade edge routing with stronger orthogonal controls.
- Add full floating undocked windows and saved layout presets.
- Add integration tests for animated export pipeline and presentation mode regressions.
