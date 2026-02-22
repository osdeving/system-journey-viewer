# AI_STATE

## Current Snapshot

- Roadmap milestones `M0 -> M9` were implemented.
- Feature branches were promoted without merge commits using cherry-pick flow.
- Latest script/UI increment (2026-02-21) refined **SJV Script v2** and notes UX with escaped multiline text support, semantic export IDs for generic showcase tokens, sticky-note rendering (fold + pin), and multiline note editing in canvas/inspector.
- Latest desktop UX increment (2026-02-21, evening pass) added bilingual showcase/tutorial loaders, startup splash/about metadata, preferences floating window, export gallery in help, dynamic topbar height layout, drilldown badge rendering, and expanded showcase drilldown coverage for all showcased microservices.
- Latest desktop hotfix (2026-02-21, late pass) fixed menubar dropdown clipping and restored full toolbar visibility by combining visible menu overflow with content-based topbar height measurement.
- Latest topbar hotfix follow-up (2026-02-21, night pass) removed fixed top-row sizing (now `auto`) and updated toolbar row wrapping/overflow so menu + toolbar content no longer clips at the canvas edge.
- Latest desktop shell refinement (2026-02-22) compacted the topbar by collapsing logo + menubar into one row, hiding topbar mode pills, and moving viewport controls (zoom/grid/snap/theme/auto-layout) to the main menu only.
- Latest workflow/docs increment (2026-02-22) refreshed repository `AGENTS.md` for the actual monorepo stack and expanded local skills for UI layout regressions, SJV Script changes, `gh` PR/merge flow, showcase/tutorial curation, docs synchronization, export validation, theme/palette accessibility tuning, Playwright visual capture, and local persistence migrations.
- Architecture baseline:
  - custom SVG editor engine (internal adapter, no paid lock-in),
  - versioned FULL model (`schemaVersion: 1.0`) as source of truth,
  - SJV Script for text import/export.
- Optional Codex assistance integrated via server-side gateway (`apps/codex-gateway`).
- SJV Script reference documentation now includes explicit syntax-vs-convention guidance plus expanded advanced examples and metadata/drilldown coverage (`docs/SJV_SCRIPT_SPEC.md`).

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
- SJV Script <-> FULL conversion with auto-layout.
- SJV Script v2 modeling semantics:
  - runtime edges are declared as `<edgeId>: <from> -> <to> ...`,
  - journey steps reference edge IDs in file order,
  - metadata edge layout is keyed by edge ID.
- Notes:
  - `note <alias> on <targetAlias> "text"` supported in parser/converter,
  - rendered as sticky notes with folded corner and pin plus dashed non-arrow attachments,
  - auto-attach and auto-place behavior when dropping/dragging notes onto nodes.
- Multiline text:
  - escaped text roundtrip in SJV Script (`\n`, `\r`, `\t`, `\"`, `\\`) for workspace, node, note, edge label, and journey names.
  - multiline note text editing supported in canvas inline editor and inspector.
- Semantic script export:
  - when internal IDs are generic (e.g., `e_c_1`, `j_c_1`), SJV Script export infers semantic edge/journey tokens from labels/names.
- SJV Script now supports optional UI-only geometry metadata:
  - `metadata ui-layout` for node bounds and edge label positions.
  - edge metadata now supports label side (`left|right`) in addition to label progress.
  - edge metadata also supports optional label font size.
- Static export (`SVG`, `PNG`, `PDF`).
- Animated export (`GIF`, `MP4`, animated `SVG`) with journey timeline playback.
- Presentation mode with clean rendering and export-focused controls.
- Workspace file lifecycle in-browser UI:
  - `New File` (blank workspace),
  - `Open File` (snapshot or SJV Script import: `.json/.sjv/.dsl/.txt`),
  - `Save File` with File System Access API support (handle reuse on `Ctrl/Cmd+S` and Save As on `Ctrl/Cmd+Shift+S`, with download fallback as `.sjv.json`).
  - entry view selection for SJV Script import now respects drilldown hierarchy (root/top-level view first, instead of arbitrary view key order).
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
  - dock tabs include `Inspector`, `Journeys`, `Timeline`, `SJV Script`, `Help`,
  - dock can be placed on left, right, bottom, or floating window,
  - side docks are resizable on their docking edge (left/right width control),
  - floating dock is draggable, resizable from all sides/corners, and clamped to viewport bounds,
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
  - edge endpoint drag handles now use larger capture area and stronger visual indicator.
- Node text editing and layout:
  - double-click inline editing for node title and subtitle/tech text,
  - hexagon infra nodes now render centered/top labels with truncation to avoid overflow.
  - inspector now supports explicit node text color customization (persisted in workspace model).
- Node fill presets are now theme-aware (light/dark Tailwind-inspired palettes) for stronger contrast in dark-mode workflows.
- Monaco-based `SJV Script` editor with custom highlighting theme.
- SJV Script panel now includes `Sync with editor` mode:
  - when enabled, valid SJV Script edits are applied to the view in real time while typing,
  - import flow preserves current app theme (prevents forced light-theme fallback on SJV Script load/import).
- SJV Script editor layout now enforces top-pinned controls and full-height Monaco area in:
  - side dock,
  - floating dock,
  - bottom drawer dock mode.
- Desktop shell enhancements:
  - dynamic topbar height measurement prevents overflow/wrap regressions from shrinking canvas/drawer space,
  - toolbar is now grouped and rendered in a dedicated row with section-level visibility preferences,
  - tooltips are user-configurable from settings/preferences.
- Menubar/toolbar regression fix:
  - desktop menu dropdowns are no longer clipped by topbar/menu container overflow,
  - topbar height now expands to fit wrapped content using scroll-height-aware measurement.
- Topbar layout follow-up:
  - app shell grid now uses `auto` for the topbar row to avoid fixed-height clipping loops,
  - toolbar row now wraps with visible overflow so labels/buttons remain fully visible.
- Topbar density refinement:
  - topbar branding is now logo-only (workspace name/breadcrumb removed from the header row),
  - menubar now shares the logo row,
  - topbar mode-pill row is hidden to reclaim vertical space,
  - viewport actions remain available in the main `View` menu instead of the toolbar.
- Startup layout defaults are now more canvas-first:
  - right dock panel starts hidden by default,
  - bottom workbench starts hidden by default,
  - users can reopen both via topbar panel toggles or the `View` menu.
- Presentation topbar layout refinement:
  - presentation mode now keeps logo/meta and the presentation toolbar in the same topbar row,
  - status/error messages (when present) render on a separate row without breaking the primary toolbar line.
- SJV Script panel simplification:
  - Codex refinement controls were removed from the SJV Script panel UI for now (feature deferred),
  - panel toolbar is focused on `Sync`, `Export`, and `Import`.
- Toolbar density refinement (desktop row):
  - toolbar action row now stays single-line and scrolls horizontally on narrower widths instead of wrapping,
  - editing/mode controls (`Select`, `Connector`, `Focus`, `Presentation`) use compact icon-only buttons with tooltips,
  - topbar dock-tab strip uses compact icon-only tabs to reduce width pressure.
- Reusable desktop window shell:
  - `Preferences` now uses a reusable `FloatingWindow` React component instead of an ad-hoc fixed panel,
  - window supports drag, resize (all edges/corners), and viewport clamping,
  - close action now uses a discreet icon-style button.
- Window-manager foundation (phase 1 start):
  - `help` and `preferences` now use a shared managed-window state model (`open`, placement, floating rect),
  - Help menu actions (`Guide`, `Export Gallery`, `About`) open a floating Help window by default (instead of forcing dock + drawer visibility),
  - floating `Help` and `Preferences` windows include dock handoff controls (float/left/right/bottom),
  - dock now includes a `Preferences` tab so dock handoff works,
  - dock tab order is normalized on hydrate to append missing tabs from older snapshots.
- Window-manager phase 2 kickoff:
  - managed-window state now uses a host-based layout model (`windows` + `hosts`) for `help` and `preferences`,
  - host state tracks tab stacks and active tabs for `left`, `right`, and `bottom`,
  - managed window operations now explicitly model `dock` and `float` transitions instead of only toggling placement metadata,
  - App integration still interoperates with the legacy dock renderer while preserving host membership state (transitional phase).
- Window-manager phase 3 transition slice:
  - added reusable `DockHost` component (tab strip + actions + body) as the base host renderer for docked windows,
  - legacy dock panel now renders docked `help`/`preferences` through `DockHost` when active, while non-managed tabs still use legacy dock content paths,
  - managed host tab selection in dock UI now syncs `activeDockTab` with managed host `activeTab`,
  - managed docked `help`/`preferences` tabs support float/close actions directly inside the dock host panel.
- Window-manager phase 4 layout-host slice:
  - managed hosts now render as dedicated app-layout regions (`managedLeft`, `managedRight`, `managedBottom`) with real grid columns/row,
  - `Help`/`Preferences` dock actions target managed hosts directly instead of moving the legacy dock,
  - managed-host headers support host-to-host moves (`left|right|bottom`), float, and close,
  - legacy dock strip now hides managed tabs and resolves legacy active-tab fallback when a managed window is docked to avoid duplicate panel content.
- Window-manager phase 5 core-panel migration:
  - core dock tabs (`Inspector`, `Journeys`, `Timeline`, `SJV Script`) are now also managed windows (same host model as `Help`/`Preferences`),
  - topbar dock-tab shortcut strip now opens managed windows into default hosts instead of relying on legacy dock tab rendering,
  - `View` panel actions and insert shortcuts for timeline/DSL now open managed windows,
  - managed floating windows are rendered through a shared loop (`MANAGED_WINDOW_IDS`) with a shared content mapper and reusable `FloatingWindow`,
  - legacy dock remains as a compatibility shell (placement/floating-dock mechanics) and displays an empty-state message when no legacy tabs exist.
- Splash UX:
  - Help menu now includes `Show Splash`,
  - Preferences also includes a `Show splash now` action for replaying the startup splash.
- Help and onboarding enhancements:
  - help panel now has `Guide`, `Export Gallery`, and `About` sections,
  - startup splash presents app identity/version (`MVP Beta`) and ownership label (`Willams Sousa`),
  - showcase/tutorial loading supports `EN` and `PT` variants from menus/preferences.
- Drilldown affordance enhancement:
  - nodes with drilldown now render a top-right external-link style badge.
- Connector ergonomics enhancement:
  - edge endpoint reconnect handles and hover resolution radius were increased for easier pointer targeting.
- Keyboard mode shortcuts no longer bind presentation toggle to `P` to avoid conflicts with text typing.
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
  - dedicated UI layout persistence in localStorage by `workspaceId` (node bounds + edge label positions), auto-applied on SJV Script import.
- Edge label angle is now part of persisted UI layout and SJV Script UI metadata import/export.
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

## Agent Workflow State (2026-02-22)

- Root `AGENTS.md` is now monorepo-aware (`apps/web` primary, `apps/codex-gateway` secondary) instead of Java/Spring-default guidance.
- Frontend-specific agent guardrails live in `apps/web/AGENTS.md`.
- Local repo skills now exist under `skills/` for recurring workflows:
  - `sjv-ui-layout-regression-fix`
  - `sjv-script-change-with-roundtrip-tests`
  - `sjv-pr-and-merge-gh`
  - `sjv-showcase-tutorial-curation`
  - `sjv-docs-sync`
  - `sjv-export-pipeline-validation`
  - `sjv-theme-and-palette-accessibility`
  - `sjv-playwright-visual-capture`
  - `sjv-local-persistence-migrations`
- Validation guidance in `AGENTS.md` now includes a per-area matrix so docs/skills-only changes do not require full app builds.

## Web Source Structure / Readability State (2026-02-22)

- `apps/web/src` now separates React UI components from pure helpers more clearly:
  - `src/components/canvas/*` and `src/components/windowing/*` contain React components,
  - non-React diagram helpers were relocated to `src/diagram/edges/*`, `src/diagram/nodes/*`, and `src/diagram/player/*`.
- Managed-window floating UI metadata/default host mapping was extracted from `src/App.tsx` into `src/windowing/windowUiConfig.ts` to reduce local monolith pressure.
- `docs/FILE_ATLAS.md` documents the current `apps/web/src` taxonomy, naming conventions, and the header-first rule.
- `skills/sjv-file-atlas-and-header-conventions` is available for future refactors that touch file placement or file-header conventions.
- `apps/web/src` now uses top-of-file `Purpose:` comments (TS/TSX/CSS/MD) so the first lines immediately describe the file role.

## Window Manager Plan Status Rebaseline (2026-02-22)

- Original plan status after the latest delivery:
  - Phase 1 (`Window Manager foundation`): complete for the original scope (generic managed-window model + hosts + dock/float/open/close + persistence + startup restore + restore/reset layout). Legacy dock shell compatibility still exists as a separate UX layer, but window-layout persistence/restore now also covers its current state so it is no longer a foundation blocker.
  - Phase 2 (`Migrate current panels`): `Palette` is now part of the managed-window system alongside `Inspector`, `Journeys`, `Timeline`, `SJV Script`, `Help`, and `Preferences`.
  - Phase 3 (`Menu Window/View`): complete for the original scope. `Window` now owns panel/window/layout actions (`open panels`, `show/hide palette/dock/workbench`, dock placement, `Restore/Reset Window Layout`, `Show Splash`) and `Insert` is content-focused (`Load Showcase` / `Load Tutorial`).
  - Phase 4 (`Guided Tutorial engine`): in progress. Slices 1-3 delivered the overlay tour, action-gated steps, and spotlight cutout fix; slice 4 adds task-oriented action-gated steps for opening a specific panel from the `Window` menu, selecting a node, and editing the node name in the Inspector. Remaining work still includes richer target types, more advanced action-wait predicates, and broader task walkthrough coverage.
    - Slice 5 adds dynamic menu-aware spotlight targets (`selector` unions + DOM mutation remeasure), a `Window > Open SJV Script Panel` action-gated step, and an `SJV Script` sync-toggle action-gated step.
    - Tutorial overlay now remeasures after menu/pointer interactions so the tutorial card can move away from open menus and highlighted menu content stays visible (not blurred under the overlay cutout).
    - Slice 6 adds more action-gated workflow coverage: `Window > Open Timeline Panel`, edge selection on canvas, edge label editing, and edge protocol changes in the Inspector.
    - Remaining tutorial coverage is intentionally being delivered incrementally (TBD slices) so shell/density refactors can proceed in parallel without blocking.
  - Phase 5 (`Density / visual refinement`): partial (formal density system exists; ongoing work is expanding density coverage and visual polish into canvas/panels/forms).
    - Added a reusable `OverflowStrip` component for compact, non-wrapping horizontal controls with wheel scroll + arrow nav.
    - Dock-host tabs now support wheel scrolling and drag-reorder, and SJV Script toolbar uses compact labels before showing overflow navigation.
    - Legacy dock shell regions/actions are now hidden when no legacy tabs exist, preventing duplicate empty side/bottom dock areas during managed-host layouts.
    - Window-menu items gained lightweight icons for faster scanning; floating `Preferences`/`Help` content layouts were tuned to avoid vertical control stretching on resize.
    - Added a formal persisted `UI Density` preference (`comfortable | compact`) with a root density class and shared shell density tokens (menus, toolbars, dock tabs, drawer tabs, floating headers, panel padding/gaps).
    - Desktop menu item icons are now applied consistently across all menus (`File`, `Edit`, `View`, `Window`, `Journey`, `Insert`, `Settings`, `Help`) via a shared render helper.
    - Default UI density now starts in `compact` (still switchable via `Settings` and `Preferences`).
    - Density token coverage was extended into `Inspector` and journey-side form controls (inputs/selects/buttons/field rows) for more consistent compact mode behavior.
    - Palette list now includes compact icon glyphs per preset and uses subtler themed scrollbars (instead of browser-default scroll styling).
    - Canvas view now shows a subtle inline back-arrow overlay (top-left) when drilldown history exists; the old drilldown hint text was removed from that region.
    - Drilldown creation follow-up navigation was fixed by restoring interior hit-testing for boundary nodes that own a drilldown reference (double-click opens the child after returning to parent view).
    - Optional node depth effects (3D-style lighting overlays) were added for non-note/non-boundary nodes, with hidden rear-detail lines for queue/database shapes and a user preference toggle (`Enable node depth effects (3D look)`).
- `Palette` no longer uses the legacy dedicated left sidebar render path; it is rendered via managed hosts/floating windows and default-opens docked left at startup.
- Window-layout persistence now also stores managed host sizes (`managedLeftHostWidth`, `managedRightHostWidth`, `managedBottomHostHeight`) and `Restore/Reset Window Layout` applies them.
- Splash is now a reusable component with auto-dismiss per-open + outside-click dismiss; floating window title bars and dock-host tab strips received UX polish (thinner title bars, smaller controls, tab overflow arrows instead of native scrollbar).

## Suggested Next Increments

- Upgrade edge routing with stronger orthogonal controls.
- Add full floating undocked windows and saved layout presets.
- Add integration tests for animated export pipeline and presentation mode regressions.
