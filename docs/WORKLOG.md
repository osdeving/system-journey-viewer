# WORKLOG

Chronological engineering log. Entries are kept concise and focused on behavior and validation.

## 2026-02-21 - Sticky note UX, multiline SJV text support, and semantic showcase export IDs

### Scope

- Improve note visual language to match sticky-note behavior.
- Allow multiline text editing/rendering for notes and SJV Script escaped text.
- Export semantic edge/journey IDs for showcase-style scripts when internal IDs are generic.

### Changes

- Note UX and multiline editing:
  - sticky note canvas shape with folded corner and red pin styling;
  - multiline note rendering with line breaks on canvas;
  - inline note editor upgraded to textarea mode (`Enter` newline, `Ctrl/Cmd+Enter` commit);
  - inspector note name editor now supports multiline textarea;
  - files:
    - `apps/web/src/components/DiagramCanvas.tsx`
    - `apps/web/src/components/CanvasText.tsx`
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`
    - `apps/web/src/help/help.md`

- SJV Script escaped text:
  - parser/export now support escaped `\\n`, `\\r`, `\\t`, `\\"`, `\\\\`;
  - workspace/journey/node/note/edge quoted text roundtrip preserved with escaping;
  - files:
    - `apps/web/src/dsl-lite/parser.ts`
    - `apps/web/src/dsl-lite/convert.ts`
    - `apps/web/src/dsl-lite/parser.test.ts`
    - `docs/SJV_SCRIPT_SPEC.md`

- Showcase semantics and note persistence:
  - script export now infers semantic edge/journey IDs from labels/names when internal IDs are generic (`e_c_1`, `j_c_1`, etc.);
  - default showcase workspace now includes attached notes across container/component/hex views;
  - note target relation added to schema validation to avoid loss during persistence parse/serialize;
  - files:
    - `apps/web/src/model/defaultWorkspace.ts`
    - `apps/web/src/model/schema.ts`
    - `apps/web/src/model/schema.test.ts`
    - `docs/cim.sjv`

### Validation

- `npm install`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run test:run -- src/dsl-lite/parser.test.ts src/model/schema.test.ts src/App.styles.test.ts src/store/useEditorStore.test.ts`
- `npm --workspace @sjv/web run build`

## 2026-02-20 - SJV Script v2 migration, notes support, and full English UI/docs

### Scope

- Replace legacy text-format semantics with deterministic SJV Script v2 grammar.
- Add first-class attached notes behavior across parser/converter/store/canvas.
- Standardize all product-facing text/documentation to English and use `SJV Script` naming.

### Changes

- Script grammar and conversion:
  - runtime edges now use explicit edge IDs (`edgeId: from -> to : protocol \"label\"`);
  - journey steps are ordered by line position and reference edge IDs directly (no numeric prefixes);
  - metadata edge layout references edge IDs;
  - note declarations supported (`note <alias> on <targetAlias> \"text\"`);
  - files:
    - `apps/web/src/dsl-lite/types.ts`
    - `apps/web/src/dsl-lite/parser.ts`
    - `apps/web/src/dsl-lite/convert.ts`
    - `apps/web/src/dsl-lite/monacoJourneyScript.ts`

- Notes in editor behavior:
  - new `note` node kind and presets;
  - note attachments rendered as dashed non-arrow links;
  - dropped/dragged notes can auto-attach and auto-place around target nodes;
  - notes are excluded from regular edge connections and runtime journeys;
  - files:
    - `apps/web/src/model/types.ts`
    - `apps/web/src/model/nodePorts.ts`
    - `apps/web/src/presets/nodePresets.json`
    - `apps/web/src/presets/techPresets.json`
    - `apps/web/src/store/useEditorStore.ts`
    - `apps/web/src/components/DiagramCanvas.tsx`
    - `apps/web/src/App.css`

- UI/documentation language and naming:
  - UI copy translated to English;
  - user-facing naming standardized to `SJV Script`;
  - spec renamed to `docs/SJV_SCRIPT_SPEC.md` and rewritten for v2 grammar;
  - showcase script rebuilt in v2 syntax:
    - `docs/cim.sjv`;
  - related docs updated:
    - `README.md`
    - `apps/web/README.md`
    - `docs/UI_JOURNEYS_CAPABILITIES.md`
    - `docs/DECISIONS.md`
    - `docs/AI_STATE.md`
    - `INTRUCTIONS.md`
    - `CONTRIBUTING.md`
    - `.github/pull_request_template.md`

### Tests

- Updated parser/codex tests for SJV Script v2 output expectations:
  - `apps/web/src/dsl-lite/parser.test.ts`
  - `apps/web/src/dsl-lite/codexAssist.test.ts`
- Added store coverage for note behavior:
  - `apps/web/src/store/useEditorStore.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run test:run -- src/dsl-lite/parser.test.ts src/dsl-lite/codexAssist.test.ts src/dsl-lite/journeyDslSync.test.ts src/dsl-lite/sync.test.ts src/store/useEditorStore.test.ts`
- `npm --workspace @sjv/web run test:run -- src/store/useEditorStore.test.ts`
- `npm run test:run:gateway`
- `npm --workspace @sjv/web run build`

## 2026-02-20 - SJV Script specification expansion (keywords vs conventions, advanced examples, drilldown, metadata)

### Scope

- Clarify what in SJV Script is keyword/syntax and what is naming convention.
- Expand documentation with minimal, practical, and advanced examples.
- Add dedicated sections for drilldown, colors, metadata, tolerance rules, and app sync/import behavior.

### Changes

- Rewrote and expanded SJV Script reference:
  - `docs/SJV_SCRIPT_SPEC.md`
  - new structure includes:
    - quick answer for `view v_main container` vs arbitrary IDs (`view payments_main container`),
    - keywords vs conventions section,
    - identifier/token rules,
    - complete syntax blocks (`workspace`, `view`, `node`, `edge`, `journey`, `metadata ui-layout`),
    - runtime semantics and fallback behavior from parser/converter,
    - import/export/sync behavior aligned with current app implementation,
    - detailed examples:
      - absolute minimum,
      - minimum useful flow,
      - legacy implicit view,
      - drilldown by `drilldown`,
      - drilldown by `parent/via`,
      - metadata with `side/font/angle`,
      - large multi-view advanced example.

### Validation

- Documentation-only change (no runtime behavior changed).

## 2026-02-20 - SJV Script editor full-height layout in dock/floating/bottom contexts

### Scope

- Fix SJV Script editor panel so Monaco occupies full available vertical space.
- Ensure toolbar controls stay pinned at the top and editor consumes remaining area.
- Fix bottom dock rendering where SJV Script content looked vertically centered and wasted space.

### Changes

- Dock body + SJV Script fill behavior:
  - added SJV Script-aware dock body class to force full-height content area:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`
  - `dock-tab-body` now uses grid stretching with child `min-height: 0` to avoid collapse.
  - `dock-tab-body-dsl` now disables outer scroll and lets Monaco consume internal area.

- Bottom drawer dock flow:
  - added dedicated drawer class for dock tab (`journey-drawer-dock`) with `auto + 1fr` rows:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`
  - ensures dock panel fills full bottom drawer height instead of staying compact.

- SJV Script panel sizing:
  - `dsl-panel` now always uses `auto / minmax(0,1fr) / auto` rows and `height: 100%`:
    - keeps controls at top and status at bottom while Monaco fills center.
  - file:
    - `apps/web/src/App.css`

### Tests

- Updated:
  - `apps/web/src/App.styles.test.ts`
    - asserts new selectors for SJV Script dock full-height layout.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/App.styles.test.ts`
- `npm --workspace @sjv/web run test:run -- --maxWorkers=1`
- `npm --workspace @sjv/web run build`

## 2026-02-20 - SJV Script typing sync direction fix, presentation shortcut cleanup, and theme-safe SJV Script import

### Scope

- Remove `P` keyboard shortcut that was interrupting normal typing.
- Fix `Sync with editor` behavior so SJV Script typing updates the canvas view in real time.
- Ensure SJV Script import preserves currently selected app theme instead of forcing light.

### Changes

- Mode shortcuts:
  - removed `P` presentation toggle from keyboard shortcuts.
  - extracted mode shortcut resolution helper:
    - `apps/web/src/keyboard/modeShortcuts.ts`
  - wired in app:
    - `apps/web/src/App.tsx`

- SJV Script sync behavior:
  - replaced old workspace->SJV Script mirror flow with SJV Script->workspace live apply flow.
  - sync now keeps editor editable and applies valid SJV Script changes to view while typing.
  - file:
    - `apps/web/src/App.tsx`

- Theme-safe SJV Script import:
  - extracted helper to parse SJV Script and force current app theme on imported workspace:
    - `apps/web/src/dsl-lite/sync.ts`
  - applied in:
    - SJV Script panel `Import SJV Script` action,
    - file open fallback when payload is SJV Script.
  - file:
    - `apps/web/src/App.tsx`

- Help update:
  - clarified sync semantics as live SJV Script-to-view updates.
  - file:
    - `apps/web/src/help/help.md`

### Tests

- Added:
  - `apps/web/src/keyboard/modeShortcuts.test.ts`
- Updated:
  - `apps/web/src/dsl-lite/sync.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/dsl-lite/sync.test.ts src/keyboard/modeShortcuts.test.ts`
- `npm --workspace @sjv/web run test:run -- --maxWorkers=1`
- `npm --workspace @sjv/web run build`

## 2026-02-20 - Edge arrow orientation fix, SJV Script live sync, stronger edge-handle visibility, and node text color controls

### Scope

- Fix edge arrowheads that were visually constrained to left/right orientation.
- Add optional live SJV Script sync from canvas/editor changes.
- Improve hover/discoverability for edge endpoint drag handles.
- Refresh node color presets for light/dark themes and allow editing node text color.

### Changes

- Edge curve routing/orientation:
  - extracted shared curve resolver:
    - `apps/web/src/engine/edgeCurve.ts`
  - curve control points now follow source/target port directions, so marker tangents can resolve vertical and horizontal orientations correctly.
  - diagram and animated export now share the same curve logic:
    - `apps/web/src/components/DiagramCanvas.tsx`
    - `apps/web/src/export/animatedExport.ts`

- SJV Script panel sync:
  - added `Sync with editor` toggle in SJV Script toolbar.
  - when enabled, SJV Script panel mirrors workspace edits in real time and editor switches to read-only mirror mode.
  - extracted sync helper:
    - `apps/web/src/dsl-lite/sync.ts`
  - wired in UI:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`

- Edge-handle visibility:
  - increased capture/resolve radii for edge anchor handles and connection target hover.
  - increased port visual radius and strengthened handle contrast/glow.
  - files:
    - `apps/web/src/components/DiagramCanvas.tsx`
    - `apps/web/src/App.css`

- Node palette and text color:
  - replaced generic fill presets with theme-aware Tailwind-inspired dark/light sets.
  - added inspector controls for node text color (picker + presets).
  - persisted node `textColor` in model/store/schema.
  - files:
    - `apps/web/src/App.tsx`
    - `apps/web/src/components/DiagramCanvas.tsx`
    - `apps/web/src/model/types.ts`
    - `apps/web/src/model/schema.ts`
    - `apps/web/src/store/useEditorStore.ts`

- Help update:
  - documented SJV Script sync and easier edge endpoint handle interaction.
  - file:
    - `apps/web/src/help/help.md`

### Tests

- Added:
  - `apps/web/src/engine/edgeCurve.test.ts`
  - `apps/web/src/dsl-lite/sync.test.ts`
- Updated:
  - `apps/web/src/store/useEditorStore.test.ts`
  - `apps/web/src/model/schema.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/engine/edgeCurve.test.ts src/dsl-lite/sync.test.ts src/store/useEditorStore.test.ts src/model/schema.test.ts`
- `npm --workspace @sjv/web run test:run -- --maxWorkers=1`
- `npm --workspace @sjv/web run build`

## 2026-02-19 - Full dock resizing model (left/right/bottom/floating) and faster edge-label rotation

### Scope

- Keep same open PR branch and add requested UX refinements:
  - support dock resize while docked (left/right),
  - support floating dock resize from all sides/corners,
  - keep docked sizes in UI context per docking side,
  - increase edge-label rotation speed when using `hold + Alt + wheel`.

### Changes

- Dock resize system:
  - added dock placement option on left side,
  - added dock side splitters:
    - left dock expands/shrinks to the right,
    - right dock expands/shrinks to the left,
  - side dock widths are tracked independently (`leftDockWidth`, `rightDockWidth`) and restored through UI history snapshots,
  - floating dock now supports resize from all edges/corners (`n/s/e/w/ne/nw/se/sw`),
  - implemented pointer-based resize + clamping logic with reusable utilities:
    - `apps/web/src/layout/floatingDock.ts`
    - `apps/web/src/layout/dockSizing.ts`
  - wired into app state flow and styles:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`

- Edge-label rotation speed:
  - increased rotation step from slow incremental updates to faster step (`6` degrees per wheel event),
  - extracted wheel-angle helper:
    - `apps/web/src/components/edgeLabelWheel.ts`
  - integrated in canvas interaction:
    - `apps/web/src/components/DiagramCanvas.tsx`

- Help update:
  - documented side-dock and floating full-direction resize behavior plus faster rotation behavior:
    - `apps/web/src/help/help.md`

### Tests

- Added:
  - `apps/web/src/layout/floatingDock.test.ts`
  - `apps/web/src/layout/dockSizing.test.ts`
  - `apps/web/src/components/edgeLabelWheel.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-21 - Menubar dropdown and toolbar visibility regression hotfix

### Scope

- Fixed a post-desktop-polish regression where top menu dropdowns were not visible and toolbar rows could be visually clipped.

### Changes

- `apps/web/src/App.css`
  - restored visible overflow behavior for topbar/menu container to avoid clipping desktop menu dropdowns;
  - restored wrapping behavior in `.desktop-menu-bar` so menu rows can grow vertically instead of forcing clipped overflow.
- `apps/web/src/App.tsx`
  - topbar height measurement now considers both rendered height and `scrollHeight` so wrapped/stacked topbar content expands layout correctly.
- `apps/web/src/layout/topbarSizing.ts` (new)
  - extracted topbar-height resolution logic into a dedicated utility.
- `apps/web/src/layout/topbarSizing.test.ts` (new)
  - added focused unit coverage for topbar height resolution edge cases.
- `apps/web/src/App.styles.test.ts`
  - added style assertions to prevent regressions in topbar/menu overflow and wrapping behavior.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-21 - Topbar clipping follow-up fix (menu + toolbar rows)

### Scope

- Fixed remaining topbar clipping where toolbar text/buttons could appear partially cut at the canvas edge on some viewport/layout states.

### Changes

- `apps/web/src/App.tsx`
  - changed app grid top row from fixed pixel height to `auto`, removing topbar self-sizing feedback loop that could clip toolbar content.
  - extracted row-template resolution into a dedicated helper for deterministic behavior.
- `apps/web/src/layout/layoutGrid.ts` (new)
  - added `resolveLayoutGridTemplateRows` helper for immersive/studio row templates.
- `apps/web/src/layout/layoutGrid.test.ts` (new)
  - added unit coverage for immersive and drawer-visible/drawer-hidden row composition.
- `apps/web/src/App.css`
  - updated `.topbar-actions` to allow wrapping with visible overflow, avoiding clipped toolbar labels in dense states.
- `apps/web/src/App.styles.test.ts`
  - added regression assertion for `.topbar-actions` wrap/overflow behavior.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Agent workflow refresh (monorepo AGENTS + local skills)

### Scope

- Reworked repository agent instructions to match the actual monorepo stack and recurring workflows.
- Added local skills for common SJV tasks (UI layout regressions, SJV Script changes, PR/merge flow).

### Changes

- `AGENTS.md`
  - rewritten from backend-centric assumptions to a monorepo/front-end-first policy aligned with current repository reality;
  - added validation matrix (`docs/skills`, `apps/web`, `apps/codex-gateway`, cross-app CI);
  - added product language consistency rule (English repo output by default);
  - added UI shell regression discipline (menubar/toolbar/dock/workbench checks);
  - added persisted UI state migration awareness rule;
  - documented implemented local skills and candidate next skills.
- `apps/web/AGENTS.md` (new)
  - frontend-specific rules for high-risk areas, testing expectations, and manual smoke checklists for layout and SJV Script changes.
- `skills/sjv-ui-layout-regression-fix/SKILL.md` (new)
  - repeatable workflow for fixing desktop shell clipping/overflow/wrap regressions with regression-test guidance.
- `skills/sjv-script-change-with-roundtrip-tests/SKILL.md` (new)
  - SJV Script contract-change workflow covering parser/sync/export/docs/showcase alignment and roundtrip checks.
- `skills/sjv-pr-and-merge-gh/SKILL.md` (new)
  - standardized `gh` PR creation/check monitoring/rebase-merge workflow aligned with repo branch policy.

### Validation

- `git diff --check`
- `find skills -maxdepth 2 -name SKILL.md | sort`
- `rg -n \"^---$|^name: |^description: \" skills/*/SKILL.md`

## 2026-02-19 - Playback defaults, dock/view upgrades, edge-label rotation, recents memory, and help guide

### Scope

- Apply requested startup defaults for journey playback/focus.
- Expand dock/view workflow with floating dock and panel visibility controls.
- Add edge-label rotation shortcut and persist angle in SJV Script/layout metadata.
- Add local recent-workspace memory (up to 3 entries) in File menu.
- Add in-app markdown Help panel and update repository capability docs.

### Changes

- Playback and journey focus defaults:
  - `loop` now starts enabled.
  - `trail` now starts disabled.
  - default animation preset behavior resolves to `orb`.
  - off-scope rendering defaults to `hide`.
  - default animation speed set to slower baseline (`1800ms`).
  - files:
    - `apps/web/src/store/useEditorStore.ts`
    - `apps/web/src/model/defaultWorkspace.ts`
    - `apps/web/src/model/blankWorkspace.ts`
    - `apps/web/src/model/schema.ts`

- Journey timeline editing parity:
  - timeline items now match journey-list style and support drag-drop reorder + remove in panel/dock timeline.
  - files:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`

- Edge-label rotation shortcut:
  - hold selected edge label + wheel => font size.
  - hold selected edge label + `Alt` + wheel => rotation angle.
  - added `edge.style.labelAngle` with schema validation and persistence.
  - SJV Script UI metadata now supports optional `angle` on edges.
  - files:
    - `apps/web/src/components/DiagramCanvas.tsx`
    - `apps/web/src/components/JourneyEdge.tsx`
    - `apps/web/src/model/types.ts`
    - `apps/web/src/model/schema.ts`
    - `apps/web/src/store/useEditorStore.ts`
    - `apps/web/src/store/layoutPersistence.ts`
    - `apps/web/src/dsl-lite/types.ts`
    - `apps/web/src/dsl-lite/parser.ts`
    - `apps/web/src/dsl-lite/convert.ts`

- Player orb cleanup:
  - orb/trail visuals are cleared when playback stops so stale orb does not remain after pan/zoom/resize.
  - file:
    - `apps/web/src/components/DiagramCanvas.tsx`

- Presentation indicator polish:
  - step name pill keeps single-line behavior with larger width allowance.
  - step name pill uses same playing color treatment as `Step X/Y`.
  - files:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`

- Dock/view system improvements:
  - dock tabs expanded to `Inspector`, `Journeys`, `Timeline`, `SJV Script`, `Help`.
  - dock placement controls for right/bottom/floating.
  - floating dock window with draggable header and viewport clamp.
  - menu actions to show/hide palette, dock, and workbench similar to desktop creative apps.
  - files:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`

- Local recents memory:
  - save operations now mirror a snapshot copy into localStorage recents (max 3).
  - File menu can open recent entries directly.
  - files:
    - `apps/web/src/file/recentWorkspaces.ts`
    - `apps/web/src/file/recentWorkspaces.test.ts`
    - `apps/web/src/App.tsx`

- Help and docs:
  - app tab title updated to `System Journey Viewer`.
  - markdown help menu/panel added via `react-markdown`.
  - repository docs updated with new capabilities.
  - files:
    - `apps/web/index.html`
    - `apps/web/src/help/help.md`
    - `apps/web/src/App.tsx`
    - `apps/web/package.json`
    - `README.md`
    - `docs/UI_JOURNEYS_CAPABILITIES.md`

- CI/CD note:
  - verified via GitHub API that required checks are `Web lint/test/build` and `Gateway tests`; no Sourcery check/comment workflow is configured in this repository.

### Tests

- Added:
  - `apps/web/src/file/recentWorkspaces.test.ts`
- Updated:
  - `apps/web/src/store/useEditorStore.test.ts`
  - `apps/web/src/store/layoutPersistence.test.ts`
  - `apps/web/src/model/schema.test.ts`
  - `apps/web/src/dsl-lite/parser.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-19 - Presentation mode shows active step name next to step counter

### Scope

- In presentation mode, show the currently animated step name beside `Step X/Y` in the centered mode indicators.

### Changes

- Added player step label resolver utility:
  - `apps/web/src/journeys/playerStepLabel.ts`
  - resolves active step by sorted journey order (`n`) and returns edge label fallback to `edgeId`.
- Wired the resolved label into presentation mode indicators:
  - `apps/web/src/App.tsx`
  - in `mode-indicators-presentation`, now renders current step name next to `Step X/Y`.
- Added truncation style for long step labels in the topbar:
  - `apps/web/src/App.css`
  - new `.mode-pill-step-name` with ellipsis behavior.

### Tests

- Added unit tests for active step label resolution:
  - `apps/web/src/journeys/playerStepLabel.test.ts`

### Validation

- `npm --workspace @sjv/web run test:run -- src/journeys/playerStepLabel.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

## 2026-02-19 - Inline text editing, edge-label zoom, and hierarchy-safe view navigation

### Scope

- Fix hexagon node text overflow for infra nodes (`gateway`, `security`, `load-balancer`).
- Add direct in-canvas text editing for edge labels and node texts.
- Add edge-label font size adjustment with click-hold + mouse wheel.
- Prevent drilldown-load dead-ends by improving view hierarchy navigation after file import.

### Changes

- Canvas text rendering/interaction:
  - Added reusable SVG text wrapper:
    - `apps/web/src/components/CanvasText.tsx`
  - Updated edge text rendering:
    - `apps/web/src/components/JourneyEdge.tsx`
      - optional `edge.style.labelFontSize` support,
      - double-click callback for inline editing.
  - Updated canvas interaction logic:
    - `apps/web/src/components/DiagramCanvas.tsx`
      - inline editor overlay for:
        - edge label,
        - node title,
        - node subtitle/tech,
      - edge label font-size wheel adjustment while holding label drag,
      - hexagon node label layout adjusted to centered/top positions with truncation.

- State/model/schema:
  - Added optional `edge.style.labelFontSize`:
    - `apps/web/src/model/types.ts`
    - `apps/web/src/model/schema.ts`
    - `apps/web/src/store/useEditorStore.ts`
  - Added store action:
    - `setEdgeLabelFontSize(edgeId, fontSize)` with clamping.

- SJV Script UI metadata:
  - Added optional UI metadata parsing/export for edge label font size:
    - `apps/web/src/dsl-lite/types.ts`
    - `apps/web/src/dsl-lite/parser.ts`
    - `apps/web/src/dsl-lite/convert.ts`

- View hierarchy navigation:
  - Added shared hierarchy utilities:
    - `apps/web/src/viewHierarchy.ts`
  - Added topbar hierarchy selector:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`
  - Updated store navigation behavior:
    - `replaceWorkspace` and `goToView` now derive compatible breadcrumb history from hierarchy so `Back` works when opening deep views directly.

### Tests

- Added/updated:
  - `apps/web/src/viewHierarchy.test.ts`
  - `apps/web/src/store/useEditorStore.test.ts`
  - `apps/web/src/model/schema.test.ts`

### Validation

- `npm --workspace @sjv/web run test:run -- src/store/useEditorStore.test.ts src/viewHierarchy.test.ts src/model/schema.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`
- `npm --workspace @sjv/web run test:run -- --maxWorkers=1`
  - Note: default parallel `vitest run` timed out workers in this environment; single-worker run completed with all tests passing.

## 2026-02-17 - Replace default Vite favicon with app logo

### Scope

- Replace browser tab icon from default Vite logo to System Journey Viewer brand logo.

### Changes

- Updated favicon link:
  - `apps/web/index.html`
    - `href="/vite.svg"` -> `href="/sjv-logo.svg"`
- Added branded SVG favicon:
  - `apps/web/public/sjv-logo.svg`
    - same visual identity used in the app topbar logo badge.

### Validation

- `npm --workspace @sjv/web run build`

## 2026-02-17 - Edge-label readability, smarter journey reflow, and global undo/redo

### Scope

- Improve auto-layout edge label legibility and collision avoidance.
- Add two-axis label editing (along edge + side flip) and prevent upside-down edge text.
- Ensure journey filter reflow applies consistently from both dropdown and journey quick-filter button.
- Introduce robust undo/redo across workspace + major UI layout states.
- Expose journey controls in the top desktop menu and reorganize dock journey controls.

### Changes

- Edge label model/schema/persistence:
  - Added optional `edge.style.labelSide` (`left | right`) in:
    - `apps/web/src/model/types.ts`
    - `apps/web/src/model/schema.ts`
  - Extended layout persistence to save/restore side + position:
    - `apps/web/src/store/layoutPersistence.ts`
- SJV Script metadata support:
  - `metadata ui-layout` edge lines now support optional side:
    - `edge <from> -> <to> label <position> side <left|right>`
  - Implemented parse/export/import wiring in:
    - `apps/web/src/dsl-lite/types.ts`
    - `apps/web/src/dsl-lite/parser.ts`
    - `apps/web/src/dsl-lite/convert.ts`
- Edge label rendering and interaction:
  - Replaced `textPath`-bound labels with explicit positioned/rotated `<text>` labels to enforce readable orientation.
  - Added vertical readability normalization and side offsets.
  - Label drag now updates both:
    - `labelPosition` (along the edge),
    - `labelSide` (opposite side of the edge when crossing the normal axis).
  - Files:
    - `apps/web/src/components/edgePresentation.ts`
    - `apps/web/src/components/JourneyEdge.tsx`
    - `apps/web/src/components/DiagramCanvas.tsx`
    - `apps/web/src/App.css`
- Auto-layout improvements:
  - Added stronger edge-length heuristics based on rendered label width.
  - Added explicit penalties for:
    - label-label overlap,
    - label-label minimum gap violations,
    - label-node overlap,
    - label-node minimum gap violations.
  - Added side candidate selection (`left/right`) during label placement.
  - File:
    - `apps/web/src/layout/autoArrange.ts`
- Journey filter consistency:
  - Added unified `applyJourneyFilter(...)` path used by both filter dropdown and per-journey filter button.
  - Ensures immediate scoped reflow when policy is `always + reflow`.
  - File:
    - `apps/web/src/App.tsx`
- Undo/redo:
  - Added bounded history stack with coalescing for high-frequency edits.
  - Includes workspace + view/selection/player state and key dock/panel UI state.
  - Added shortcuts:
    - `Ctrl/Cmd+Z` undo
    - `Ctrl/Cmd+Shift+Z` and `Ctrl/Cmd+Y` redo
  - Added Edit menu entries with disabled-state behavior.
  - File:
    - `apps/web/src/App.tsx`
- Menu and journey panel organization:
  - Added new `Journey` top menu containing filter/layout/player actions previously scattered across side controls.
  - Reorganized journey dock panel into grouped sections: `Creation`, `Filter & Layout`, `Player`, `Journeys`.
  - File:
    - `apps/web/src/App.tsx`
    - `apps/web/src/App.css`

### Tests

- Updated:
  - `apps/web/src/model/schema.test.ts`
  - `apps/web/src/store/layoutPersistence.test.ts`
  - `apps/web/src/dsl-lite/parser.test.ts`
  - `apps/web/src/components/edgePresentation.test.ts`
  - `apps/web/src/store/useEditorStore.test.ts`
  - `apps/web/src/App.styles.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-17 - Journey-focused layout modes, compact export, and SJV Script UI metadata

### Scope

- Add journey-filter visual strategies for complex canvases (hide/dim/show off-scope elements).
- Enable scoped auto-layout behavior during journey focus (`manual` apply vs `always` on filter).
- Keep journey exports concise by forcing compact visual focus for animated export.
- Persist and exchange UI geometry (node bounds and edge-label positions) using:
  - optional SJV Script metadata block (`metadata ui-layout`),
  - local browser persistence keyed by workspace id.

### Changes

- Journey focus semantics:
  - Added `journeyFocus` settings in workspace model/schema:
    - `offscopeRenderMode`: `show | hide | dim`
    - `layoutMode`: `preserve | reflow`
    - `autoLayoutMode`: `manual | always`
  - Updated defaults in:
    - `apps/web/src/model/defaultWorkspace.ts`
    - `apps/web/src/model/blankWorkspace.ts`
    - `apps/web/src/dsl-lite/convert.ts`
    - `apps/web/src/model/schema.ts`
- New journey scope utility:
  - `apps/web/src/journeys/focus.ts`
  - resolves focused edge/node sets per `view + journey`, including boundary parents.
- Canvas rendering behavior:
  - `apps/web/src/components/DiagramCanvas.tsx`
    - focus-aware visibility (`hide`) and dimming (`dim`) for nodes and edges,
    - interaction hit-testing now respects visible node set in hidden mode,
    - optional export-time forced focus (`exportFocusJourneyId`) for compact capture.
  - `apps/web/src/components/JourneyEdge.tsx`
  - `apps/web/src/components/journeyEdgeClassName.ts`
  - `apps/web/src/App.css`
    - added `node-journey-dimmed`, `edge-dimmed`, and `edge-label-dimmed` styles.
- Scoped auto-layout:
  - `apps/web/src/layout/autoArrange.ts`
    - now supports optional node/edge scope input.
  - `apps/web/src/store/useEditorStore.ts`
    - `autoArrangeCurrentView(scope?)` and `setJourneyFocusSettings(...)`.
  - `apps/web/src/App.tsx`
    - journey panel controls for focus mode + layout mode + auto policy,
    - `Apply layout now` action,
    - auto-layout effect for `always + reflow` when filter is active.
- Compact journey export:
  - `apps/web/src/App.tsx`
    - animated export now temporarily forces focused render for selected journey, restoring state afterwards.
- SJV Script metadata for UI geometry:
  - `apps/web/src/dsl-lite/types.ts`
  - `apps/web/src/dsl-lite/parser.ts`
  - `apps/web/src/dsl-lite/convert.ts`
    - parses/exports `metadata ui-layout` blocks with:
      - `node <alias> at <x> <y> size <w> <h>`
      - `edge <from> -> <to> label <position>`
    - applies metadata on import after structural conversion.
  - Spec updated:
    - `docs/SJV_SCRIPT_SPEC.md`
- Local layout persistence:
  - Added `apps/web/src/store/layoutPersistence.ts`
  - Integrated in `apps/web/src/App.tsx`:
    - debounced save to localStorage,
    - auto-apply saved layout when importing SJV Script.

### Tests

- Added:
  - `apps/web/src/journeys/focus.test.ts`
  - `apps/web/src/store/layoutPersistence.test.ts`
- Updated:
  - `apps/web/src/components/JourneyEdge.test.ts`
  - `apps/web/src/store/useEditorStore.test.ts`
  - `apps/web/src/dsl-lite/parser.test.ts`
  - `apps/web/src/model/schema.test.ts`
  - `apps/web/src/App.styles.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - SJV Script hierarchy-safe import and intelligent auto-arrange

### Scope

- Ensure complex SJV Script files preserve drilldown hierarchy semantics on import.
- Improve file-open workflow to support both snapshot JSON and raw SJV Script (`.sjv`/`.dsl`/text).
- Add optional best-effort auto-arrange for view layout quality (nodes + edge labels).

### Changes

- SJV Script hierarchy import hardening:
  - `apps/web/src/App.tsx`
    - added root view resolver based on drilldown graph (prefers top-level `container/system-context`);
    - SJV Script import from editor now opens the resolved hierarchy entry view instead of arbitrary first key.
  - Added file import fallback:
    - tries snapshot parser first (`.sjv.json/.json`);
    - falls back to SJV Script parser+converter when snapshot parsing fails;
    - supports `.sjv`, `.dsl`, `.txt` in picker/input accept lists.
- Auto-arrange (best-effort document formatting):
  - Added `apps/web/src/layout/autoArrange.ts`:
    - Dagre-based graph layout for current view;
    - dynamic node sizing from text estimates (name/tech) to reduce text overflow;
    - grouped boundary re-fitting around children;
    - iterative edge label position optimization to reduce label overlap and node/label collisions.
  - `apps/web/src/store/useEditorStore.ts`
    - added `autoArrangeCurrentView()` action to apply arranged node bounds/ports and edge label positions.
  - `apps/web/src/App.tsx`
    - added `Auto Arrange` controls in top toolbar and View menu;
    - added keyboard shortcut `Ctrl/Cmd+Shift+L`.
- Regression coverage:
  - `apps/web/src/dsl-lite/parser.test.ts`
    - added real-world `docs/cim.sjv` import test validating multi-view drilldown hierarchy.
  - `apps/web/src/store/useEditorStore.test.ts`
    - added auto-arrange spacing/label normalization test.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - Selection lifecycle and edge/journey interaction hardening

### Scope

- Fix modifier-key conflicts between temporary connector mode and journey edge assignment.
- Add complete selection actions for nodes/edges (delete + duplicate) with keyboard/menu/inspector access.
- Improve edge selection feedback and label handling UX.
- Prevent accidental text selection during drag-heavy editor interactions.

### Changes

- Interaction conflict fixes:
  - `apps/web/src/components/DiagramCanvas.tsx`
    - temporary connector mode now activates only for `Ctrl` without `Alt/Meta`;
    - `Ctrl+Alt` no longer competes with journey drag behavior, preserving drilldown gesture priority.
  - `apps/web/src/App.tsx`
    - edge-to-journey assignment now ignores modifier keys and connector-pending state.
- Selection lifecycle actions (store-level, centralized):
  - `apps/web/src/store/useEditorStore.ts`
    - added `removeEdge(edgeId)`;
    - added `duplicateSelection(offset?)` (duplicates selected edge or selected node set, including internal edges);
    - added `setEdgeLabelPosition(edgeId, position)`;
    - refactored edge removal side effects (views, journeys, player state) through shared helper flow.
- Keyboard/menu/inspector operations:
  - `apps/web/src/App.tsx`
    - `Delete/Backspace` removes selected node(s) or selected edge (with confirmation);
    - `Ctrl/Cmd + D` duplicates current selection;
    - `Edit` menu now includes `Duplicate Selection` and `Delete Selection`;
    - inspector adds duplicate/delete actions for nodes and edges.
- Edge visual feedback and label ergonomics:
  - `apps/web/src/components/JourneyEdge.tsx`
    - added explicit selected-edge indicator marker;
    - label position now reads edge style offset and supports pointer drag start.
  - `apps/web/src/components/DiagramCanvas.tsx`
    - added label dragging along path (updates offset continuously).
  - `apps/web/src/App.tsx`
    - edge inspector now exposes `Label Position` slider.
- UX polish:
  - `apps/web/src/App.css`
    - disabled broad text selection in editor layout while preserving text inputs/Monaco selection;
    - added mode-aware cursor cues (`copy`, `ew-resize`) and new edge selection/label styles.
- Data model/schema updates:
  - `apps/web/src/model/types.ts`
  - `apps/web/src/model/schema.ts`
  - `apps/web/src/dsl-lite/convert.ts`
    - added optional `edge.style.labelPosition` support.

### Tests

- Updated tests:
  - `apps/web/src/store/useEditorStore.test.ts`
    - edge removal + journey renumbering,
    - edge duplication,
    - node-set duplication,
    - edge label position clamp.
  - `apps/web/src/App.styles.test.ts`
    - new selection/inspector/label style hooks coverage.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - Journey authoring UX and drilldown creation sync

### Scope

- Improve journey authoring directly from canvas edges.
- Allow timeline step reordering with automatic renumbering.
- Add shortcut-driven drilldown creation during modeling.
- Keep journey/drilldown changes synchronized with SJV Script roundtrips.
- Improve file save workflow with reusable handle on `Ctrl/Cmd+S`.

### Changes

- Updated store APIs in `apps/web/src/store/useEditorStore.ts`:
  - added `createDrilldownForNode(nodeId)` to create/open detail views and convert source node to a boundary/drilldown entry point;
  - added `reorderJourneyStep(journeyId, edgeId, targetEdgeId)` and normalized step numbering after add/remove/reorder operations.
- Updated canvas interactions:
  - `apps/web/src/components/JourneyEdge.tsx` now emits edge pointer-start callbacks for journey assignment gestures;
  - `apps/web/src/components/DiagramCanvas.tsx` now supports `Ctrl/Cmd+Alt+double-click` to create a drilldown and immediately open it.
- Updated app-level UX in `apps/web/src/App.tsx`:
  - edge-to-journey assignment by dragging/releasing an edge onto a journey item;
  - journey timeline step drag-and-drop reorder in the drawer;
  - `Ctrl/Cmd+S` now reuses a previous file handle when available (save), while `Ctrl/Cmd+Shift+S` forces Save As;
  - file open/save flow now prefers File System Access API and falls back to browser download/input.
- Updated UI styles/tests:
  - `apps/web/src/App.css` and `apps/web/src/App.styles.test.ts` for edge-drop-target and draggable-step affordances.
- Added sync regression tests:
  - `apps/web/src/dsl-lite/journeyDslSync.test.ts` for journey order and drilldown persistence across SJV Script conversion.
  - expanded `apps/web/src/store/useEditorStore.test.ts` coverage for journey reordering and drilldown creation behavior.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - Infra node shape switched from diamond to hexagon

### Scope

- Replace recently introduced diamond infra shape with hexagon shape for routing/security visual nodes.

### Changes

- Updated shape resolver:
  - replaced `resolveDiamondShape` with `resolveHexagonShape` in `apps/web/src/components/nodeShapePaths.ts`.
- Updated canvas rendering:
  - `gateway`, `security`, and `load-balancer` now render as hexagons in `apps/web/src/components/DiagramCanvas.tsx`.
- Updated shape tests:
  - migrated expectations in `apps/web/src/components/nodeShapePaths.test.ts` from diamond to hexagon paths.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/components/nodeShapePaths.test.ts`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - Connector UX overhaul and diamond infra nodes

### Scope

- Improve connector behavior and precision in canvas interactions.
- Add diamond node shapes for infra routing/security style components.

### Changes

- Connector interaction refinements in `apps/web/src/components/DiagramCanvas.tsx`:
  - added temporary connector mode while holding `Ctrl`;
  - in temporary connector mode, dragging from a node no longer moves node/canvas and starts edge preview instead;
  - connection now resolves on pointer release (no early auto-connect), snapping to best target handle;
  - target node + target handle highlight added during drag for clearer feedback;
  - connector mode now supports both node-to-node and handle-to-handle workflows consistently.
- Store behavior update in `apps/web/src/store/useEditorStore.ts`:
  - `beginConnection` no longer forces `activeTool = connector`, enabling temporary modifier-based connector flow.
- Shape system updates:
  - added `resolveDiamondShape` in `apps/web/src/components/nodeShapePaths.ts`;
  - rendered `gateway`, `security`, and `load-balancer` as diamonds in canvas.
- Preset catalog updates:
  - added `load-balancer` node preset in `apps/web/src/presets/nodePresets.json`;
  - added `load-balancer` tech preset in `apps/web/src/presets/techPresets.json`;
  - added `load-balancer` to `NodeKind` union in `apps/web/src/model/types.ts`.
- Styling updates in `apps/web/src/App.css`:
  - `.node-connection-target` and `.node-port-highlight` for live connection feedback.

### Tests

- Added/updated tests:
  - `apps/web/src/components/nodeShapePaths.test.ts` (diamond shape coverage).
  - `apps/web/src/store/useEditorStore.test.ts` (`beginConnection` does not alter active tool).
  - `apps/web/src/App.styles.test.ts` (new connector highlight classes present).

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - Workspace file management (new/open/save)

### Scope

- Add disk-based workspace file operations in the web editor:
  - create a new blank file,
  - save current workspace snapshot to file,
  - load workspace snapshot from file.

### Changes

- Added file helpers:
  - `apps/web/src/file/workspaceFile.ts`
    - snapshot serialization for download payload,
    - strict snapshot parsing/validation with schema checks,
    - workspace file naming strategy (`.sjv.json`).
- Added blank workspace factory:
  - `apps/web/src/model/blankWorkspace.ts`
    - creates an empty container view workspace for `New File`.
- Updated `apps/web/src/App.tsx`:
  - `File` menu now includes `New File`, `Open File...`, and `Save File...`;
  - added hidden file input workflow for loading snapshot files;
  - added keyboard shortcuts:
    - `Ctrl/Cmd+N` -> new file,
    - `Ctrl/Cmd+O` -> open file,
    - `Ctrl/Cmd+Shift+S` -> save file,
    - existing local snapshot shortcuts kept (`Ctrl/Cmd+S`, `Ctrl/Cmd+R`).
- Added tests:
  - `apps/web/src/file/workspaceFile.test.ts`
    - filename normalization,
    - valid roundtrip parse/serialize,
    - invalid payload handling.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/file/workspaceFile.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - Dependabot auto-PRs disabled

### Scope

- Stop automatic dependency update pull requests to reduce repository noise for a solo-maintainer workflow.

### Changes

- Removed `.github/dependabot.yml`.
- Existing open Dependabot pull requests were previously closed.

### Validation

- Repository configuration change only (no runtime code path affected).

## 2026-02-16 - README demo disclaimer and Vercel build/output fixes

### Scope

- Improve README clarity for demo media quality expectations.
- Add static UI reference image.
- Fix Vercel output directory mismatch and reduce build chunk warnings.

### Changes

- README updates:
  - added visible warning that robot-captured demo may show temporary UI misalignment;
  - added static screenshot section using `docs/print-ui.png`;
  - updated Vercel output directory instructions to `dist`.
- Build/deploy pipeline updates:
  - added `scripts/prepare-root-dist.mjs` to copy `apps/web/dist` to root `dist`;
  - updated root `build` script to run web build and then mirror output to root `dist`;
  - updated `vercel.json` to `outputDirectory: \"dist\"`.
- Bundle/chunk updates:
  - lazy-loaded Monaco editor in `apps/web/src/App.tsx`;
  - added manual chunk strategy and raised chunk warning threshold in `apps/web/vite.config.ts`.

### Validation

- `npm run lint`
- `npm run test:run`
- `npm run build`

## 2026-02-16 - README demo media and Playwright capture workflow

### Scope

- Improved README to communicate product value visually.
- Added real UI walkthrough media generated from a running instance.
- Added a reusable automation script for future README/demo media refresh.

### Changes

- README enhancements:
  - new `Product Demo` section with embedded GIF and MP4 links;
  - added exported journey animation examples from `docs/`;
  - added `Generate Demo Media with Playwright` section with reproducible commands.
- Added `scripts/capture-readme-demo.mjs`:
  - launches Chromium with Playwright,
  - loads showcase data and enters presentation mode,
  - starts journey playback and records video,
  - outputs `webm` and encodes `mp4` + `gif` via `ffmpeg`.
- Added/updated demo artifacts:
  - `docs/readme-live-demo.webm`
  - `docs/readme-live-demo.mp4`
  - `docs/readme-live-demo.gif`
  - existing showcase export assets are referenced by README.

### Validation

- `npm --workspace @sjv/web run dev -- --host 127.0.0.1 --port 4173`
- `npm install --no-save playwright`
- `npm exec playwright install chromium`
- `DEMO_URL=http://127.0.0.1:4173 node scripts/capture-readme-demo.mjs`
- `npm run lint`
- `npm run test:run`

## 2026-02-16 - Open-source readiness and full English documentation

### Scope

- Prepared repository for GitHub publication and community onboarding.
- Added CI and templates for consistent pull request quality.
- Added Vercel deployment configuration for `apps/web`.
- Converted project documentation to English.

### Changes

- Added OSS/community documentation:
  - `CONTRIBUTING.md`
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - `SUPPORT.md`
  - `LICENSE`
- Added GitHub configuration:
  - `.github/workflows/ci.yml`
  - `.github/pull_request_template.md`
  - `.github/ISSUE_TEMPLATE/bug_report.yml`
  - `.github/ISSUE_TEMPLATE/feature_request.yml`
  - `.github/ISSUE_TEMPLATE/config.yml`
  - `.github/dependabot.yml`
- Added Vercel configuration:
  - `vercel.json`
  - `.env.example` for gateway and local development references.
- Rewrote key docs to English:
  - `README.md`
  - `apps/web/README.md`
  - `docs/DECISIONS.md`
  - `docs/UI_JOURNEYS_CAPABILITIES.md`
  - `docs/SJV_SCRIPT_SPEC.md`
  - `docs/AI_STATE.md`
  - `docs/WORKLOG.md`
  - `AGENTS.md`
  - `INTRUCTIONS.md`

### Validation

- `npm run lint`
- `npm run test:run`
- `npm run test:run:gateway`
- `npm run build`

## 2026-02-16 - Presentation mode and export reliability fixes

### Highlights

- Fixed presentation layout to use a single main canvas area and avoid right-side clipping.
- Removed toolbar overflow behavior that produced horizontal scrolling.
- Hardened MP4 export behavior for browser compatibility.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-16 - Animated export and player timing refinements

### Highlights

- Added animated export support for GIF, MP4, and animated SVG.
- Ensured full-journey loop capture and slower, more readable playback pacing.
- Aligned trail composition to rendered geometry and viewport transforms.
- Added trail toggle while preserving moving orb rendering.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-15 - UI polish, dockable workflows, Monaco SJV Script editor

### Highlights

- Introduced desktop-style menubar behavior and dock controls.
- Added `SJV Script` naming and Monaco syntax highlighting.
- Added dockable `Inspector/Journeys` with draggable tabs and side/bottom docking.
- Upgraded player controls with icon-based transport actions.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-12 to 2026-02-14 - Foundation milestones (M0 to M9)

### Highlights

- Built editor core (nodes/edges, snap/grid, presets, journeys, player, drill-down).
- Implemented FULL model and SJV Script conversion pipeline.
- Added static export (SVG/PNG/PDF).
- Added Codex gateway integration for SJV Script assistance.

### Validation

- Iterative lint/test/build checks per milestone branch.

## 2026-02-21 - Desktop UX pass, showcase/tutorial variants, drilldown visuals

### Scope

- Completed the pending desktop-oriented UX package requested for MVP polish:
  - startup splash + about metadata,
  - preferences floating window,
  - toolbar section visibility controls,
  - tooltip opt-in/opt-out,
  - showcase/tutorial loaders in EN/PT,
  - help panel tabs for guide/export gallery/about,
  - drilldown visual badge,
  - stronger edge endpoint drag handles,
  - richer default showcase with drilldowns for all showcased microservices.

### Changes

- Workspace/showcase model updates:
  - `apps/web/src/model/defaultWorkspace.ts`
    - expanded showcase structure with `ms-fulfillment` component + hex drilldown views,
    - attached notes across views,
    - stronger semantic edge labels,
    - curated node/text color examples,
    - tutorial note in container view,
    - drilldown coverage for all showcased microservices.
  - `apps/web/src/model/showcaseWorkspace.ts` (new)
    - locale/mode factory for `showcase|tutorial` and `en|pt` variants.
  - `apps/web/src/model/showcaseWorkspace.test.ts` (new)
    - coverage for EN/PT and showcase/tutorial variants.

- Store behavior updates:
  - `apps/web/src/store/useEditorStore.ts`
    - `loadShowcaseWorkspace` now accepts `{ locale, mode }`,
    - preserves the active app theme while loading showcase/tutorial variants.
  - `apps/web/src/store/useEditorStore.test.ts`
    - adjusted drilldown expectation for preconfigured worker drilldown,
    - added localized tutorial load + theme-preservation test.

- Canvas/interaction updates:
  - `apps/web/src/components/DiagramCanvas.tsx`
    - added top-right drilldown badge (external-link style) on nodes with `drilldownRef`,
    - increased edge anchor and connection hover radii for easier endpoint reconnection.
  - `apps/web/src/App.css`
    - visual tuning for anchor prominence,
    - drilldown badge styles (light/dark).

- Desktop shell and Help UX:
  - `apps/web/src/App.tsx`
    - new `Settings` desktop menu with preferences actions,
    - bilingual showcase/tutorial actions in `Insert` and `Help` menus,
    - help sections (`Guide`, `Export Gallery`, `About`),
    - startup splash (`MVP Beta`, `Willams Sousa`),
    - floating preferences window,
    - tooltip gating,
    - toolbar section grouping/visibility support,
    - topbar height is now measured dynamically for stable canvas/drawer sizing,
    - SJV editor status stack and single-line toolbar behavior improved for full-height editor usage.
  - `apps/web/src/help/help.md`
    - documented preferences, export gallery, showcase/tutorial variants, and splash/about behavior.

- Static media for in-app export gallery:
  - `apps/web/public/gallery/readme-live-demo.gif`
  - `apps/web/public/gallery/orders-platform-showcase-order-creation-sync-event.mp4`
  - `apps/web/public/gallery/print-ui.png`

- Test updates for hierarchy/DSL expectations after new drilldown defaults:
  - `apps/web/src/viewHierarchy.test.ts`
  - `apps/web/src/dsl-lite/journeyDslSync.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`
