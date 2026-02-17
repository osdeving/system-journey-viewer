# WORKLOG

Chronological engineering log. Entries are kept concise and focused on behavior and validation.

## 2026-02-17 - Journey-focused layout modes, compact export, and DSL UI metadata

### Scope

- Add journey-filter visual strategies for complex canvases (hide/dim/show off-scope elements).
- Enable scoped auto-layout behavior during journey focus (`manual` apply vs `always` on filter).
- Keep journey exports concise by forcing compact visual focus for animated export.
- Persist and exchange UI geometry (node bounds and edge-label positions) using:
  - optional DSL metadata block (`metadata ui-layout`),
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
- DSL metadata for UI geometry:
  - `apps/web/src/dsl-lite/types.ts`
  - `apps/web/src/dsl-lite/parser.ts`
  - `apps/web/src/dsl-lite/convert.ts`
    - parses/exports `metadata ui-layout` blocks with:
      - `node <alias> at <x> <y> size <w> <h>`
      - `edge <from> -> <to> label <position>`
    - applies metadata on import after structural conversion.
  - Spec updated:
    - `docs/DSL_LITE_SPEC.md`
- Local layout persistence:
  - Added `apps/web/src/store/layoutPersistence.ts`
  - Integrated in `apps/web/src/App.tsx`:
    - debounced save to localStorage,
    - auto-apply saved layout when importing DSL.

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

## 2026-02-16 - DSL hierarchy-safe import and intelligent auto-arrange

### Scope

- Ensure complex DSL files preserve drilldown hierarchy semantics on import.
- Improve file-open workflow to support both snapshot JSON and raw DSL (`.sjv`/`.dsl`/text).
- Add optional best-effort auto-arrange for view layout quality (nodes + edge labels).

### Changes

- DSL hierarchy import hardening:
  - `apps/web/src/App.tsx`
    - added root view resolver based on drilldown graph (prefers top-level `container/system-context`);
    - DSL import from editor now opens the resolved hierarchy entry view instead of arbitrary first key.
  - Added file import fallback:
    - tries snapshot parser first (`.sjv.json/.json`);
    - falls back to DSL parser+converter when snapshot parsing fails;
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
- Keep journey/drilldown changes synchronized with DSL roundtrips.
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
  - `apps/web/src/dsl-lite/journeyDslSync.test.ts` for journey order and drilldown persistence across DSL conversion.
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
  - `docs/DSL_LITE_SPEC.md`
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

## 2026-02-15 - UI polish, dockable workflows, Monaco DSL editor

### Highlights

- Introduced desktop-style menubar behavior and dock controls.
- Added `JourneyScript` naming and Monaco syntax highlighting.
- Added dockable `Inspector/Journeys` with draggable tabs and side/bottom docking.
- Upgraded player controls with icon-based transport actions.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-12 to 2026-02-14 - Foundation milestones (M0 to M9)

### Highlights

- Built editor core (nodes/edges, snap/grid, presets, journeys, player, drill-down).
- Implemented FULL model and DSL LITE conversion pipeline.
- Added static export (SVG/PNG/PDF).
- Added Codex gateway integration for DSL assistance.

### Validation

- Iterative lint/test/build checks per milestone branch.
