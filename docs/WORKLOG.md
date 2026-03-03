# WORKLOG

Chronological engineering log. Entries are kept concise and focused on behavior and validation.

## 2026-03-03 - Topbar sizing no longer clips full-height splitters after popovers

### Scope

- Fixed the desktop shell so side splitters keep their full-height hit area after opening and closing topbar popovers such as menus or the cloud badge panel.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/layout/topbarSizing.ts`, `apps/web/src/layout/topbarSizing.test.ts`, `apps/web/src/App.source.test.ts`
  - topbar height measurement now uses the bottom edge of direct in-flow topbar children instead of `topbarElement.scrollHeight`,
  - absolutely positioned overflow UI (menu dropdowns / popovers) no longer inflates the stored `topbarHeight` after it closes,
  - side splitters that use `topbarHeight` for absolute positioning now keep starting at the real top of the content area instead of only highlighting a lower segment,
  - added helper coverage plus a source regression for the new topbar-measurement contract.
- `docs/AI_STATE.md`
  - recorded the topbar/splitter sizing fix for future layout debugging.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/layout/topbarSizing.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-03 - Manual SJV Import preserves current visual anchors

### Scope

- Extended the visual-state preservation hotfix from live `Sync with editor` to the manual `Import` action in the `SJV Script` panel.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`
  - the `Import SJV Script` button now applies `preserveWorkspaceVisualStateForDslSync(...)` before `replaceWorkspace(...)` whenever the parsed script has no `metadata ui-layout`,
  - manual imports still replace the current workspace semantically, but matching nodes/edges now keep their current visual-only state (including manual edge anchors and routes) instead of snapping back to default ports,
  - added a source regression so the manual import path stays wired to the preservation helper.
- `docs/AI_STATE.md`
  - recorded that the manual `Import` path now matches the live-sync visual-state preservation rule.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-03 - Managed window reopen host memory and bottom workbench opt-in

### Scope

- Fixed panel-opening behavior so closed docked windows reopen in their remembered dock host instead of always forcing the default host.
- Stopped the bottom workbench from auto-opening when leaving Presentation mode.

### Changes

- `apps/web/src/windowing/windowManager.ts`, `apps/web/src/windowing/windowManager.test.ts`
  - added `resolveManagedDockPlacementForPanelOpen(...)` to reuse a remembered dock host (`left|right|bottom`) when reopening a closed panel,
  - added regression coverage for the remembered-host resolution.
- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`
  - `Open ... Panel` actions now reopen a panel in its remembered dock host when it was previously moved, otherwise they still use the default host (`right`, except `Palette` on the left),
  - added a small presentation-mode ref so the bottom workbench keeps its prior collapsed state when leaving Presentation mode instead of forcing itself open,
  - added source regression coverage so the bottom workbench remains opt-in and the panel-open path keeps using the remembered-host helper.
- `docs/AI_STATE.md`
  - recorded the new remembered-host reopen behavior and the workbench-collapse preservation on Presentation exit.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/windowing/windowManager.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-03 - DSL sync preserves manual visual edge anchors

### Scope

- Fixed live `SJV Script` sync so valid text edits no longer reset matching edges back to default node ports while you are editing the diagram visually.

### Changes

- `apps/web/src/dsl-lite/preserveVisualState.ts`, `apps/web/src/dsl-lite/preserveVisualState.test.ts`
  - added a pure helper that preserves in-memory visual-only node/edge state for matching entities during DSL sync,
  - preserves current node bounds/colors plus edge port anchors, route, and visual style when the semantic edge identity still matches,
  - avoids reusing a manual route when the DSL changed an edge endpoint node.
- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`
  - the live `Sync with editor` effect now applies `preserveWorkspaceVisualStateForDslSync(...)` before `replaceWorkspace(...)` whenever the parsed script has no `metadata ui-layout`,
  - this keeps manual edge-anchor choices stable while still applying semantic text changes from the editor,
  - added a source regression to keep the sync path wired to the new helper.
- `docs/AI_STATE.md`
  - recorded the live-sync visual-state preservation behavior.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/dsl-lite/preserveVisualState.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-03 - Supabase cloud script picker filtered-count summary

### Scope

- Added a visible filtered-vs-total result count to the top-right Supabase cloud script picker.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/App.css`, `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added a live summary line above the saved-script list showing how many filtered results are currently visible out of the total saved scripts,
  - added regression coverage for the new summary text and styling hook.
- `docs/SUPABASE_SETUP.md`, `docs/AI_STATE.md`
  - updated docs/session state to mention the live filtered/total count in the cloud script picker.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-03 - Supabase cloud script picker search filter

### Scope

- Added search/filter to the top-right Supabase cloud script picker so saved scripts are easier to find once the list grows.

### Changes

- `apps/web/src/integrations/supabase/cloudScriptSelection.ts`, `apps/web/src/integrations/supabase/cloudScriptSelection.test.ts`
  - added a pure helper to filter saved cloud scripts by title or workspace ID using case-insensitive matching,
  - added focused regression coverage for blank and matching filter queries.
- `apps/web/src/App.tsx`, `apps/web/src/App.css`, `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added a `Filter scripts` search field inside the top-right cloud picker,
  - the picker now narrows the visible script rows as you type and shows an explicit empty-state message when nothing matches,
  - closing the picker (or loading/replacing the workspace) clears the current filter text,
  - added source/style regression coverage for the new search UI.
- `docs/SUPABASE_SETUP.md`, `docs/AI_STATE.md`
  - updated docs/session state to mention title/workspace-id filtering in the cloud script picker.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/integrations/supabase/cloudScriptSelection.test.ts src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-03 - Supabase cloud script picker UI in topbar badge

### Scope

- Replaced the temporary browser prompt used for cloud SJV Script loading with a clickable list inside the existing top-right Supabase cloud panel.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added a saved-script picker section inside the top-right cloud badge panel with `Save script` / `Load script` actions and clickable saved-script rows,
  - made `Load Script from Supabase Cloud` open that picker instead of using a browser prompt,
  - loading a row still replaces the current workspace exactly like a local SJV open,
  - saving a script now updates the in-memory picker list immediately so a newly saved cloud row appears without a manual refresh,
  - added regression coverage for the new panel copy and styles.
- `apps/web/src/integrations/supabase/cloudScriptSelection.ts`, `apps/web/src/integrations/supabase/cloudScriptSelection.test.ts`
  - repurposed the helper to format stable UTC timestamps for the in-app script picker rows,
  - updated focused tests to cover the new formatting-only helper behavior.
- `docs/SUPABASE_SETUP.md`, `docs/AI_STATE.md`
  - updated the docs/state to describe the clickable cloud-panel picker instead of the earlier prompt-based selection.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/integrations/supabase/cloudScriptSelection.test.ts src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-03 - Supabase SJV Script load selection and sticky save target

### Scope

- Fixed the cloud SJV Script flow so saved scripts can be selected from a user-visible list instead of only loading by the current workspace ID.
- Kept the selected cloud script row as the active save target so follow-up cloud saves keep updating the same Supabase record until a new/local file replaces it.

### Changes

- `apps/web/src/integrations/supabase/workspaceCloudStore.ts`, `apps/web/src/integrations/supabase/workspaceCloudStore.test.ts`
  - added `listScripts()` for the signed-in user and regression coverage for the new Supabase scripts listing contract,
  - kept the existing `scripts` table shape while exposing script summaries (`workspaceId`, `title`, `updatedAt`) for the UI.
- `apps/web/src/integrations/supabase/cloudScriptSelection.ts`, `apps/web/src/integrations/supabase/cloudScriptSelection.test.ts`
  - added a pure helper for numbered prompt rendering and selection parsing when loading saved cloud scripts,
  - added focused tests for prompt text and invalid/valid selection handling.
- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`
  - `Load Script from Supabase Cloud` now lists saved scripts for the signed-in user, loads the selected SJV payload, and replaces the current workspace like a local `Open File`,
  - the selected cloud script row is remembered as the active cloud save target,
  - opening a local file, loading a workspace snapshot, creating a new file, or signing out clears that active cloud script target,
  - updated the Preferences copy to reflect loading saved scripts instead of only the latest current-workspace script.
- `docs/SUPABASE_SETUP.md`, `docs/AI_STATE.md`
  - synced the user-facing Supabase docs and session state to describe the new script selection and sticky cloud-save behavior.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/integrations/supabase/workspaceCloudStore.test.ts src/integrations/supabase/cloudScriptSelection.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

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

## 2026-02-22 - State persistence hardening + SJV metadata/source-of-truth sync improvements

### Scope

- Harden browser autosave/restore so the last editor session restores reliably regardless of the active view.
- Expand SJV `metadata ui-layout` and local layout persistence so Inspector color changes roundtrip through script/canvas.
- Improve SJV sync consistency and clarify state ownership across shell UI vs workspace/canvas metadata.

### Changes

- `apps/web/src/store/persistence.ts`, `apps/web/src/store/useEditorStore.ts`, `apps/web/src/model/types.ts`, `apps/web/src/model/schema.ts`
  - added a **global latest editor snapshot** key (`sjv:editor-snapshot:v2`) so restore no longer depends on saving while `v_container` was active,
  - `saveSnapshot(...)` now writes both the new global key and the legacy per-view key for compatibility,
  - editor snapshots now persist richer session state (view history, tool mode, selection, pending connection, active journey/filter, player settings),
  - `hydrate()` now restores the saved session state instead of resetting many fields to hardcoded defaults,
  - startup restore now falls back to the first available view if the saved/current default view is missing.
- `apps/web/src/store/layoutPersistence.ts`
  - expanded per-workspace layout metadata to persist:
    - node `fillColor` and `textColor`,
    - edge `labelFontSize` (in addition to label position/side/angle),
  - `applyWorkspaceLayout(...)` now reapplies these visual fields safely with clamping.
- `apps/web/src/dsl-lite/types.ts`, `apps/web/src/dsl-lite/parser.ts`, `apps/web/src/dsl-lite/convert.ts`
  - extended `metadata ui-layout` node lines with optional `fill` and `text` color tokens,
  - import/export roundtrip now preserves node colors through SJV Script metadata.
- `apps/web/src/dsl-lite/sync.ts`, `apps/web/src/App.tsx`
  - added parsed-document metadata flag (`hasUiLayoutMetadata`) to SJV import flow,
  - when SJV text contains `metadata ui-layout`, local cached layout is no longer overlaid on top of the script (script metadata becomes authoritative),
  - SJV sync now updates script text from workspace changes (Inspector/canvas edits) while sync is enabled, with loop guards to avoid feedback cycles.
- `apps/web/src/App.tsx`
  - window-layout bootstrap persistence now also restores shell session UI fields (`drawerTab`, `dslMaximized`, `focusMode`, `presentationMode`, `helpSection`, `journeyDraftName`, `leftSidebarWidth`) for a closer session restore.
- `docs/STATE_PERSISTENCE_MAP.md`
  - new source-of-truth map documenting the persistence domains, stored properties, and precedence rules between editor snapshot, shell UI layout, local layout cache, and SJV metadata.
- Tests
  - `apps/web/src/store/persistence.test.ts`
  - `apps/web/src/store/layoutPersistence.test.ts`
  - `apps/web/src/store/useEditorStore.test.ts`
  - `apps/web/src/dsl-lite/parser.test.ts`

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/store/persistence.test.ts src/store/layoutPersistence.test.ts src/store/useEditorStore.test.ts src/dsl-lite/parser.test.ts src/dsl-lite/journeyDslSync.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - SJV Script spec upgraded to implementer-grade reference (EBNF + semantics)

### Scope

- Reworked `docs/SJV_SCRIPT_SPEC.md` from an overview into a reference-style language spec that external implementers can use to build parsers/validators/compilers.

### Changes

- `docs/SJV_SCRIPT_SPEC.md`
  - added lexical rules (whitespace, comments, identifiers, strings, escapes, numbers, color tokens),
  - added full EBNF grammar for workspace/view/node/note/edge/journey/`metadata ui-layout`,
  - documented semantic validation rules (uniqueness, reference resolution, drilldown consistency, note constraints),
  - documented parser tolerance vs strict validation behavior of the current reference parser,
  - documented defaults/clamping/normalization behavior used by the reference implementation,
  - documented SJV import/sync precedence rules (`metadata ui-layout` authority),
  - updated examples to include current `fill`/`text` metadata node styling support.

### Validation

- `git diff --check`

## 2026-02-22 - Window manager phase 3 completion: menu ownership cleanup (`Window` owns panels/layout; `Insert` stays content-focused)

### Scope

- Finished the remaining phase-3 menu cleanup by removing panel/window shortcuts from `Insert` and consolidating panel/layout actions under the `Window` menu.
- Kept `Insert` focused on showcase/tutorial content loading only.

### Changes

- `apps/web/src/App.tsx`
  - removed `Insert` menu quick-open entries for timeline, SJV Script, help/gallery, and dock-panel shell reveal,
  - left `Insert` with showcase/tutorial loading actions only (`Load Showcase`, `Load Tutorial`),
  - preserved existing `Window` menu ownership for panel/layout actions introduced earlier (no behavior changes to handlers).
- `apps/web/src/App.source.test.ts`
  - added regressions asserting `Window` contains `Open Timeline Panel` and `Open SJV Script Panel`,
  - added regressions asserting `Insert` no longer contains window/panel shortcut entries and remains focused on showcase/tutorial actions.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- App.source.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Guided tutorial phase 4 (slice 1): overlay tour engine with spotlight targets and Next/Back/Skip

### Scope

- Started the guided tutorial engine (Phase 4) with a real interactive UI tour:
  - spotlight overlay,
  - step definitions,
  - target resolution by selector,
  - `Next / Back / Skip` flow.
- Added a first tutorial path that explains the shell layout and managed windows (menu bar, Window menu, toolbar, panel shortcut strip, canvas, Palette/Inspector/SJV Script/Help).

### Changes

- `apps/web/src/tutorial/guidedTutorial.ts` (new)
  - added guided tutorial step definitions (`GUIDED_UI_TUTORIAL_STEPS`) for the initial UI walkthrough,
  - added reusable helpers for step index clamping, selector target resolution, and card positioning.
- `apps/web/src/components/tutorial/GuidedTutorialOverlay.tsx` (new)
  - added reusable overlay component with spotlight, keyboard shortcuts (`Left/Right/Enter/Esc`), and `Next/Back/Skip` actions.
- `apps/web/src/App.tsx`
  - integrated guided tutorial state and navigation (`start`, `next`, `back`, `skip`),
  - added step setup actions to auto-open managed windows for tutorial steps (`Palette`, `Inspector`, `SJV Script`, `Help`),
  - added `Help` menu entry: `Start Guided Tutorial`,
  - added guide-panel CTA buttons (`Start Guided Tutorial`, `Load Tutorial Workspace (...)`),
  - added stable `data-tutorial-id` hooks to menu/toolbar/canvas/managed hosts for selector targeting.
- `apps/web/src/App.css`
  - added guided tutorial overlay/spotlight/card styles,
  - added help guide CTA button styles (light/dark).
- `apps/web/src/tutorial/guidedTutorial.test.ts` (new)
  - tests for helper behavior (step clamp, target resolution, card placement).
- `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - regressions for tutorial overlay integration and styling hooks.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/tutorial/guidedTutorial.test.ts src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Guided tutorial phase 4 (slice 4): Window-menu panel action + real node selection and Inspector name edit steps

### Scope

- Added the next action-gated tutorial steps requested:
  - open a specific panel from the `Window` menu (`Open Inspector Panel`)
  - select a node on the canvas
  - edit the selected node name in the Inspector

### Changes

- `apps/web/src/tutorial/guidedTutorial.ts`
  - added `window-open-inspector-panel` step gated by `window-menu-open-panel:inspector`,
  - added `select-node` step gated by `node-select`,
  - added `edit-node-name` step gated by `inspector-node-name-edit`,
  - added missing-target hints for the Window-menu item and Inspector name field.
- `apps/web/src/App.tsx`
  - instrumented `Window > Open Inspector Panel` menu item with tutorial event tracking and stable target hook (`data-tutorial-id="window-menu-open-inspector-panel"`),
  - added node-selection tutorial event tracking (`node-select`) via `selectedNodeId` change observer,
  - added Inspector name edit tracking (`inspector-node-name-edit`) and stable field target hook (`data-tutorial-id="inspector-node-name"`),
  - Inspector name input/textarea now route through a small wrapper that records the tutorial event before calling the existing `setNodeName` action.
- `apps/web/src/App.source.test.ts`
  - regressions for the new tutorial event IDs and new tutorial target hooks.
- `apps/web/src/App.styles.test.ts`
  - kept spotlight cutout regression coverage from the previous slice.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/tutorial/guidedTutorial.test.ts src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Guided tutorial phase 4 (slice 3): real spotlight cutout + more action-gated steps (toolbar mode and canvas click)

### Scope

- Fixed the guided tutorial spotlight so the highlighted target remains visible (no blur/dim over the focus area).
- Continued Phase 4 by adding more action-gated tutorial steps for actual UI interaction:
  - toolbar mode selection (`Select` / `Connector`)
  - canvas click confirmation

### Changes

- `apps/web/src/components/tutorial/GuidedTutorialOverlay.tsx`
  - replaced the single fullscreen backdrop usage with segmented backdrop panes around the spotlight target,
  - spotlight now renders a border/glow only (no giant outer shadow that covered the target),
  - highlighted UI area remains visible while the surrounding UI stays dimmed/blurred.
- `apps/web/src/tutorial/guidedTutorial.ts`
  - added `resolveGuidedTutorialBackdropPanes(...)` helper for spotlight cutout geometry,
  - added `editing-mode` action-gated step targeting the toolbar editing group (`toolbar-mode-click`),
  - upgraded `canvas` step to require a real canvas click (`canvas-click`).
- `apps/web/src/App.tsx`
  - records tutorial events for toolbar mode button clicks,
  - records tutorial events for canvas clicks (`onPointerDownCapture` on the canvas panel container).
- `apps/web/src/tutorial/guidedTutorial.test.ts`
  - added coverage for backdrop pane geometry helper,
  - updated guided tutorial helper coverage.
- `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - regressions for new tutorial event hooks and segmented backdrop styles.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/tutorial/guidedTutorial.test.ts src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Guided tutorial phase 4 (slice 2): action-gated steps and non-blocking overlay interactions

### Scope

- Upgraded the guided tutorial to support steps that require a real UI action before `Next` can proceed.
- Added initial action-gated behavior for:
  - opening the `Window` menu,
  - clicking a panel shortcut in the topbar strip,
  - opening the `Help` window.

### Changes

- `apps/web/src/tutorial/guidedTutorial.ts`
  - added `completionRule` support for steps (`desktopMenuOpen`, `event`),
  - added `resolveGuidedTutorialStepCompletion(...)` helper to evaluate step completion from app state and event counters,
  - updated step definitions:
    - `window-menu` now waits for `Window` menu to be opened,
    - `panel-shortcuts` now waits for a panel shortcut click,
    - `help-window` now waits for the Help window to be opened (instead of auto-opening it).
- `apps/web/src/components/tutorial/GuidedTutorialOverlay.tsx`
  - added props for action-gated steps (`canAdvance`, `requiresAction`, `completionPrompt`),
  - disabled `Next` while required action is incomplete,
  - keyboard `Enter`/`Right` now respects the same gating,
  - shows inline requirement/completion status.
- `apps/web/src/App.tsx`
  - added guided tutorial event counters and per-step event baselines,
  - recorded tutorial events for managed-window opens and panel-shortcut clicks,
  - computed current step completion status from `openDesktopMenu` + tutorial event counters,
  - blocked tutorial advance when a required action has not been completed.
- `apps/web/src/App.css`
  - tutorial overlay is now non-blocking (`pointer-events: none` on overlay root, card remains interactive) so the highlighted UI can be clicked,
  - added requirement/completion status styles.
- `apps/web/src/tutorial/guidedTutorial.test.ts`, `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added regressions for completion-rule evaluation, event instrumentation hooks, and requirement styles.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/tutorial/guidedTutorial.test.ts src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager phase 1 completion: unified window-layout bootstrap + shell persistence/restore

### Scope

- Finished the remaining phase-1 foundation work by making window-layout persistence cover both:
  - managed windows (`hosts`, placements, floating rects), and
  - the current window shell state (`dock/workbench` visibility, dock placement, floating dock rect, dock widths, dock tab state).
- Added a unified startup bootstrap resolver so saved window layout is restored consistently without first-render overwrite races.
- Preserved compatibility with older persisted data that stored only the managed-window state.

### Changes

- `apps/web/src/App.tsx`
  - replaced the managed-window-only startup restore with a unified `WindowLayoutBootstrap` resolver,
  - added normalization/validation helpers for persisted window-layout payloads (dock position, floating dock rect, widths/heights, dock tab state),
  - startup now initializes managed windows and dock/workbench shell state from the same persisted snapshot,
  - window-layout persistence now stores an envelope (`version`, `managedWindows`, dock/workbench shell fields),
  - `Restore Window Layout` / `Reset Window Layout` now restore/reset the shell state as well (not only managed windows).
- `apps/web/src/App.source.test.ts`
  - updated the default-hidden regression to validate the new bootstrap-based initialization path.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager phase 3 (menu UX): dedicated Window menu for panels and window-layout actions

### Scope

- Continued phase 3 from the original window-manager plan by introducing a dedicated `Window` desktop menu.
- Moved panel/window/layout actions out of the overloaded `View` menu into `Window`.
- Kept behavior stable while improving menu organization and discoverability of window-specific actions.

### Changes

- `apps/web/src/App.tsx`
  - added `window` to `DesktopMenuId` and `DESKTOP_MENU_ORDER`,
  - added a new `Window` desktop menu containing:
    - panel open actions for all managed windows (`Palette`, `Inspector`, `Journeys`, `Timeline`, `SJV Script`, `Help`, `Preferences`),
    - show/hide actions for `Palette`, dock panel, and workbench,
    - legacy dock placement actions (`left/right/bottom/floating`) while the legacy dock shell still exists,
    - `Restore Window Layout`,
    - `Reset Window Layout`,
    - `Show Splash`,
  - removed those window/panel/layout entries from the `View` menu so `View` is focused on viewport/theme/mode actions.
- `apps/web/src/App.source.test.ts`
  - added regressions for the dedicated `Window` menu and its key actions.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager plan rebaseline: phase 2 completion (Palette migration) + phase 1 persistence closure (managed window layout)

### Scope

- Completed the remaining panel migration from the original window-manager plan by moving `Palette` into the managed-window system.
- Closed the remaining phase-1 persistence gap by adding managed-window layout persistence (`localStorage`) plus restore/reset actions for the managed window layout.
- Kept the legacy dock shell for compatibility (dock placement mechanics), but removed the legacy dedicated palette render path.

### Changes

- `apps/web/src/windowing/windowManager.ts` / `apps/web/src/windowing/windowManager.test.ts`
  - added `palette` to `ManagedWindowId` / `MANAGED_WINDOW_IDS`,
  - added `restoreManagedWindowsState(fallback, candidate)` to safely normalize persisted managed-window layout state,
  - added tests covering partial restore and host-membership normalization.
- `apps/web/src/windowing/windowUiConfig.ts`
  - added `palette` default dock host (`left`),
  - added floating window UI config for `Palette`,
  - added default floating rect for `Palette`.
- `apps/web/src/App.tsx`
  - `Palette` now renders through managed dock hosts / floating windows via the shared managed-window renderer,
  - startup now seeds the managed-window layout with `Palette` docked in the left host (preserving the previous default-visible palette behavior),
  - removed the legacy dedicated palette `<aside className=\"left-sidebar\">` render path and its splitter handlers,
  - toolbar/menu “Show/Hide Palette” controls now toggle the managed `palette` window,
  - `View` menu now includes `Panel: Palette`,
  - added managed-window layout local persistence (`sjv-managed-windows-layout-v1`) with:
    - startup restore,
    - `Restore Window Layout`,
    - `Reset Window Layout`.
- `apps/web/src/App.source.test.ts`
  - added regressions for `Palette` managed floating config and window-layout restore/reset actions.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Web source structure refactor (file atlas, component grouping, utility relocation, header-first readability)

### Scope

- Reorganized `apps/web/src` to better separate React UI components from pure diagram/layout/windowing utilities.
- Introduced a documented file taxonomy + naming/header conventions for future changes.
- Added top-of-file `Purpose:` headers across the web source tree to improve first-line comprehension for humans and AI-assisted edits.
- Kept behavior unchanged (refactor + comments only).

### Changes

- `apps/web/src/components/*`
  - grouped canvas React components under `src/components/canvas/`,
  - grouped windowing React components under `src/components/windowing/`.
- `apps/web/src/diagram/*`
  - moved non-React diagram helpers out of `src/components/` into:
    - `src/diagram/edges/`
    - `src/diagram/nodes/`
    - `src/diagram/player/`
- `apps/web/src/App.tsx`, `apps/web/src/export/animatedExport.ts`, `apps/web/src/components/canvas/*`
  - updated imports to the new folder layout.
- `apps/web/src/windowing/windowUiConfig.ts`
  - extracted managed-window floating UI metadata/default host mapping and default floating rects from `App.tsx` to reduce local monolith pressure.
- `apps/web/src/App.source.test.ts`
  - adjusted source-regression coverage to validate moved window config strings in `windowUiConfig.ts`.
- `docs/FILE_ATLAS.md`
  - added repository file atlas for `apps/web/src` (folder intent, naming conventions, header-first rule, placement checklist).
- `skills/sjv-file-atlas-and-header-conventions/SKILL.md`
  - added reusable skill for applying/maintaining file taxonomy and top-of-file purpose headers.
- `AGENTS.md`, `apps/web/AGENTS.md`
  - documented the new atlas/header conventions and linked the new skill.
- `apps/web/src/**/*.(ts|tsx|css|md)`
  - added `Purpose:` top-of-file comments (header-first readability pass).

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

## 2026-02-22 - Local skills expansion (showcase/tutorial curation + docs sync)

### Scope

- Added two more local agent skills to cover high-frequency project maintenance tasks:
  - showcase/tutorial curation,
  - documentation synchronization after feature/workflow changes.

### Changes

- `skills/sjv-showcase-tutorial-curation/SKILL.md` (new)
  - workflow for evolving built-in showcase/tutorial content, EN/PT parity, drilldowns, semantic naming, and demo coverage.
- `skills/sjv-docs-sync/SKILL.md` (new)
  - workflow for updating `WORKLOG`, `AI_STATE`, spec/help/README docs, and terminology consistency (`SJV Script` naming).
- `AGENTS.md`
  - moved the two skills from candidate list to implemented local skills.

### Validation

- `git diff --check`
- `find skills -maxdepth 2 -name SKILL.md | sort`
- `rg -n \"^---$|^name: |^description: \" skills/*/SKILL.md`

## 2026-02-22 - Local skills expansion (export validation + theme/palette accessibility)

### Scope

- Added two additional local skills for recurring product-maintenance workflows:
  - export pipeline validation,
  - theme/palette accessibility tuning.

### Changes

- `skills/sjv-export-pipeline-validation/SKILL.md` (new)
  - workflow for static/animated export changes, presentation/capture state restoration checks, and export-focused validation.
- `skills/sjv-theme-and-palette-accessibility/SKILL.md` (new)
  - workflow for theme tokens, node/text color presets, contrast/readability checks, and showcase demo coverage.
- `AGENTS.md`
  - moved both skills from candidate list to implemented local skills;
  - replaced now-empty candidate list with a generic note about adding skills after repeated patterns emerge.

### Validation

- `git diff --check`
- `find skills -maxdepth 2 -name SKILL.md | sort`
- `rg -n \"^---$|^name: |^description: \" skills/*/SKILL.md`

## 2026-02-22 - Local skills expansion (Playwright visual capture + persistence migrations)

### Scope

- Added two additional local skills for recurring operational workflows:
  - Playwright-based visual/demo capture,
  - local persistence migration safety for UI preferences/layout/snapshots.

### Changes

- `skills/sjv-playwright-visual-capture/SKILL.md` (new)
  - workflow for deterministic screenshot/demo capture with Playwright, local dev server setup, and asset validation.
- `skills/sjv-local-persistence-migrations/SKILL.md` (new)
  - workflow for evolving localStorage/snapshot persistence safely with compatibility strategy and tests.
- `AGENTS.md`
  - added both skills to the implemented local skills list.

### Validation

- `git diff --check`
- `find skills -maxdepth 2 -name SKILL.md | sort`
- `rg -n \"^---$|^name: |^description: \" skills/*/SKILL.md`

## 2026-02-22 - Topbar compaction (logo/menu row + reduced toolbar)

### Scope

- Reduced vertical topbar footprint in `apps/web` by removing non-essential header rows and trimming redundant toolbar controls now covered by main menus.

### Changes

- `apps/web/src/App.tsx`
  - removed `Back` from the toolbar navigation group (view hierarchy selector remains);
  - removed the toolbar viewport group (`Zoom`, `Auto layout`, `Grid`, `Snap`, `Theme`) so these actions stay in the main `View` menu only;
  - excluded deprecated `viewport` toolbar visibility preference from the toolbar visibility-empty calculation;
  - removed the `Viewport` checkbox from Preferences > Toolbar sections (toolbar group no longer exists).
- `apps/web/src/App.css`
  - compacted topbar meta layout to place logo and desktop menubar on the same row;
  - hid the brand title/breadcrumb text block in the topbar (logo-only branding in header);
  - hid the mode-pill row to reclaim vertical space;
  - kept toolbar row wrapping behavior for smaller widths.
- `apps/web/src/App.styles.test.ts`
  - added style regression assertions for compact topbar layout and hidden mode row.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

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

## 2026-02-22 - Topbar presentation compaction, startup hidden panels, SJV Script Codex UI removal

### Scope

- Applied a UX simplification pass requested after the desktop-shell rollout:
  - presentation mode topbar compacted to keep logo + presentation toolbar on one line,
  - app now starts with dock and bottom workbench hidden by default,
  - SJV Script panel no longer exposes Codex refinement controls (feature deferred).

### Changes

- `apps/web/src/App.tsx`
  - changed initial UI state defaults to `dockCollapsed = true` and `drawerCollapsed = true`,
  - removed Codex SJV Script integration from the app shell UI (`Refine with Codex`, `Clear Codex context`, related state/status handlers),
  - kept the SJV Script toolbar focused on `Sync with editor`, `Export workspace complete`, and `Import SJV Script`.
- `apps/web/src/App.css`
  - tightened presentation topbar grid so logo/meta and presentation toolbar share the first row,
  - renamed SJV Script status styling from Codex-specific classes to generic `.dsl-status-message`.
- `apps/web/src/App.styles.test.ts`
  - updated CSS regression expectations to match the generic SJV status class,
  - added presentation topbar layout assertions.
- `apps/web/src/App.source.test.ts` (new)
  - static regression checks for startup hidden dock/workbench defaults and absence of Codex action buttons in `App.tsx`.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Toolbar icon compaction and reusable floating Preferences window

### Scope

- Addressed toolbar wrapping on narrower desktop widths by reducing button footprint.
- Replaced the ad-hoc Preferences dialog block with a reusable React floating-window component (drag + resize + icon close), aligned with the desktop shell direction.

### Changes

- `apps/web/src/App.tsx`
  - toolbar editing/mode buttons (`Select`, `Connector`, `Focus`, `Presentation`) now render as icon-only buttons with tooltips/ARIA labels,
  - topbar dock tab strip now renders dock tabs as compact icon buttons with tooltips (still draggable to reorder),
  - `Preferences` now opens through a shared helper and renders via `FloatingWindow`,
  - added movable/resizable rect state for the preferences window.
- `apps/web/src/components/FloatingWindow.tsx` (new)
  - reusable floating dialog/window shell for desktop-like panels,
  - pointer-based drag from header,
  - resize handles on all edges/corners,
  - viewport clamping using existing floating-dock sizing helpers,
  - icon-only close button (desktop-style).
- `apps/web/src/App.css`
  - topbar toolbar row now stays single-line with horizontal scroll instead of wrapping,
  - icon-only toolbar button styles,
  - compact icon-only dock-tab styles for topbar strip,
  - generic floating window styles + preferences-specific skin/theme support.
- `apps/web/src/App.styles.test.ts`
  - updated topbar toolbar style regression expectations (`nowrap` + scroll),
  - added assertions for floating-window and compact toolbar styles.
- `apps/web/src/App.source.test.ts`
  - regression check ensuring `Preferences` uses the reusable `FloatingWindow`.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager foundation (phase 1 start): floating Help/Preferences + dock handoff

### Scope

- Started the window-system standardization requested for the desktop shell:
  - introduced a small window-manager state foundation (pure helpers + tests),
  - changed Help menu actions to open Help/Export/About in a floating window by default (avoids auto-opening left/bottom panels together),
  - added dock handoff actions to floating `Help` and `Preferences` windows,
  - added a menu action to replay the startup splash.

### Changes

- `apps/web/src/windowing/windowManager.ts` (new)
  - introduced managed-window primitives for `help` and `preferences`:
    - `open/close`,
    - placement (`floating|left|right|bottom`),
    - floating rect persistence in state.
- `apps/web/src/windowing/windowManager.test.ts` (new)
  - coverage for initialization, open/close, placement updates, and rect updates.
- `apps/web/src/App.tsx`
  - added managed window state for `help` + `preferences`,
  - `Help` menu and `Insert` quick actions now open Help/Export/About as floating windows via the shared window state,
  - `Preferences` and `Help` floating windows now expose dock controls in the header (float/left/right/bottom),
  - added `Preferences` as a dock tab (so dock handoff works),
  - added `Help > Show Splash` and `Preferences > Show splash now`,
  - normalized dock tab order to safely append new tabs for older snapshots.
- `apps/web/src/App.css`
  - styles for floating-window header dock actions,
  - styles for floating Help window body scrolling,
  - styles for the in-preferences splash action button.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager phase 2 kickoff: host-based managed window layout model

### Scope

- Started phase 2 by upgrading the managed-window foundation from a simple per-window placement state to a host-based layout model (`windows + hosts`), while preserving current UI behavior.
- This keeps phase 1 UX improvements working and prepares the app for real multi-host docking (`left/right/bottom`) without a full dock rewrite in one PR.

### Changes

- `apps/web/src/windowing/windowManager.ts`
  - evolved managed-window state to:
    - `windows` (open/placement/floatingRect),
    - `hosts` (`left/right/bottom` tab stacks + active tab),
  - added host-aware operations:
    - `dockManagedWindow`,
    - `floatManagedWindow`,
    - host membership normalization on open/close/placement changes,
    - `setManagedHostActiveTab`.
- `apps/web/src/windowing/windowManager.test.ts`
  - expanded coverage to host tabs/active-tab behavior, host moves, float/dock transitions, and close semantics.
- `apps/web/src/App.tsx`
  - migrated `managedWindows` state usage to the new host-based model,
  - managed `Help/Preferences` state now preserves host membership when opened from legacy dock tabs (`help` / `preferences`),
  - floating window dock controls now call explicit `float/dock` operations backed by the new model.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager phase 3 (transition slice): reusable DockHost + managed dock rendering for Help/Preferences

### Scope

- Started the phase-3 UI migration by introducing a reusable `DockHost` component and routing docked `Help`/`Preferences` rendering through the host model created in phase 2.
- Kept the legacy dock renderer for non-managed tabs (`Inspector`, `Journeys`, `Timeline`, `SJV Script`) to avoid a risky all-at-once panel rewrite.

### Changes

- `apps/web/src/components/DockHost.tsx` (new)
  - added a reusable dock-host shell (tab strip + actions slot + panel body) for future multi-window dock hosts.
- `apps/web/src/App.tsx`
  - integrated `DockHost` into the legacy dock panel when the active tab is a managed window (`help`/`preferences`) and the current dock host (`left/right/bottom`) contains managed host tabs,
  - added host-tab selection sync (`setManagedHostActiveTab`) so dock-host tab clicks keep managed state and legacy dock active tab aligned,
  - added dock-host actions for managed tabs: float active window and close active window with fallback to non-managed dock tabs.
- `apps/web/src/App.css`
  - added compact dock-host styles (`dock-host`, strip, tabs, body, empty state) reusing existing dock visual language.
- `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added regressions for `DockHost` usage and styles.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager phase 4 (layout hosts): dedicated left/right/bottom managed hosts in app grid

### Scope

- Added real in-layout managed window hosts for `left`, `right`, and `bottom` using the host-based state model from phases 2/3.
- Kept the legacy dock system for non-managed tabs, but stopped treating managed windows (`Help`, `Preferences`) as legacy dock tabs in the legacy dock strip to avoid duplicated content.

### Changes

- `apps/web/src/App.tsx`
  - app grid now reserves dedicated columns/row for managed hosts (`managedLeft`, `managedRight`, `managedBottom`) when host tabs exist,
  - floating `Help/Preferences` dock actions now dock into managed hosts directly (no longer move the legacy dock position),
  - added reusable managed-host panel renderer for all three managed hosts using `DockHost`,
  - managed host headers now support move left/right/bottom + float + close on the active hosted window,
  - legacy dock tab strip now hides managed-window tabs (`Help`, `Preferences`) and falls back to legacy tabs when a managed tab is currently docked, preventing duplicate rendering.
- `apps/web/src/layout/layoutGrid.ts` / `apps/web/src/layout/layoutGrid.test.ts`
  - grid rows now support an optional managed-bottom-host row between the canvas and the workbench drawer.
- `apps/web/src/App.css`
  - added styles for managed host sidebars and managed bottom host row,
  - added dark-theme styles for the new managed host surfaces.
- `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - regressions for dedicated managed host regions and styles.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Window manager phase 5 (core panel migration): dock tabs now use managed windows/hosts

### Scope

- Migrated the core dock-tab panels (`Inspector`, `Journeys`, `Timeline`, `SJV Script`) into the managed-window system used by `Help`/`Preferences`.
- Added generic floating-window rendering for all managed dock tabs so docked panels can be moved to floating mode from the host header.
- Kept the legacy dock shell as a compatibility surface (dock placement/floating-dock UI), but it no longer owns the core dock-tab content.

### Changes

- `apps/web/src/windowing/windowManager.ts`
  - expanded `ManagedWindowId` to cover all dock tabs:
    - `inspector`, `journeys`, `timeline`, `dsl`, `help`, `preferences`,
  - generalized `createManagedWindowsState` to initialize all managed windows from defaults,
  - exported `MANAGED_WINDOW_IDS` for generic UI rendering.
- `apps/web/src/windowing/windowManager.test.ts`
  - updated defaults/coverage to include the expanded managed-window set.
- `apps/web/src/App.tsx`
  - added floating defaults for `Inspector`, `Journeys`, `Timeline`, and `SJV Script`,
  - topbar panel shortcut strip now opens dock-tab panels as managed windows (default host per panel),
  - `View` menu panel actions and `Insert` quick-open actions for timeline/DSL now open managed windows instead of legacy dock tabs,
  - managed content renderer now covers all dock-tab panels,
  - floating windows for managed panels are rendered via a shared loop (`MANAGED_WINDOW_IDS`) and shared content mapper,
  - legacy dock fallback now shows a compatibility message when no legacy tabs remain instead of duplicating managed content.
- `apps/web/src/App.css`
  - added floating-window body wrappers for dock-style content (`floating-window-body-dock`, `floating-window-body-dsl`).
- `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added regressions for shared floating-window rendering and styles.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Guided tutorial phase 4 (slice 5) + shell UX polish (splash/window headers/managed host resize)

### Scope

- Continued the guided UI tutorial with more task-oriented steps around the `Window` menu and SJV Script sync.
- Fixed tutorial spotlight/menu behavior so highlighted menu regions remain visible (not blurred) and the tutorial card repositions when menus open.
- Polished shell/window UX:
  - reusable splash component with timeout + outside-click dismiss,
  - floating window title bar visual pass,
  - managed host resizing (`left/right/bottom`) with persistence,
  - dock-host tab strip redesign with arrow navigation (no native scrollbar strip).

### Changes

- `apps/web/src/tutorial/guidedTutorial.ts`, `apps/web/src/components/tutorial/GuidedTutorialOverlay.tsx`
  - added multi-selector spotlight targets (`selectors`) to highlight combined trigger + open menu content,
  - overlay now remeasures on DOM mutations / click / pointerup so menu-open steps can move the tutorial card away from the interaction,
  - added tutorial steps for `Window > Open SJV Script Panel` and `SJV Script` sync toggle.
- `apps/web/src/App.tsx`
  - added tutorial tracking hooks for `Window > Open SJV Script Panel` and `SJV Script` sync toggle,
  - replaced inline splash markup with reusable `SplashScreen`,
  - added managed host sizes (`left/right/bottom`) to window-layout bootstrap/persistence/restore/reset,
  - added splitters and pointer handlers for managed host resize.
- `apps/web/src/components/chrome/SplashScreen.tsx`
  - new reusable splash component with auto-dismiss (every time it opens), `Esc` support, and outside-click dismissal.
- `apps/web/src/components/windowing/DockHost.tsx`
  - host header split into actions row + tab row,
  - tab overflow now uses left/right arrow buttons and a hidden-overflow viewport instead of a native horizontal scrollbar.
- `apps/web/src/App.css`
  - splash visual refresh (larger card, animated accents, dismiss hint),
  - floating window title bar styling (clear title bar, thinner header, smaller controls),
  - managed-host splitter styles,
  - dock-host tab-row navigation styles.
- `apps/web/src/tutorial/guidedTutorial.test.ts`, `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - regressions for multi-selector targets, new tutorial hooks, managed host splitters/sizing fields, splash and dock-host styles.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/tutorial/guidedTutorial.test.ts src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Guided tutorial phase 4 (slice 6): edge editing workflow steps + more Window-menu action-gated coverage

### Scope

- Continued the guided tutorial with more action-gated steps for real editing workflows and additional `Window` menu panel actions.
- Added an edge-editing walkthrough in the Inspector (select edge, edit label, change protocol).

### Changes

- `apps/web/src/App.tsx`
  - added tutorial event tracking for:
    - edge selection (`edge-select`) via `selectedEdgeId` changes,
    - edge label edits (`inspector-edge-label-edit`),
    - edge protocol changes (`inspector-edge-protocol-edit`),
    - `Window > Open Timeline Panel` (`window-menu-open-panel:timeline`),
  - added tutorial hooks (`data-tutorial-id`) for:
    - `Window > Open Timeline Panel`,
    - Inspector edge label input,
    - Inspector edge protocol select,
  - routed Inspector edge label/protocol changes through tutorial-aware wrappers (no behavior change to the underlying editor store actions).
- `apps/web/src/tutorial/guidedTutorial.ts`
  - added action-gated steps for:
    - `Window > Open Timeline Panel`,
    - selecting an edge on the canvas,
    - editing edge label in Inspector,
    - changing edge protocol in Inspector.
- `apps/web/src/App.source.test.ts`
  - regressions for new tutorial event IDs and stable target hooks.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/tutorial/guidedTutorial.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Phase 5 groundwork + dock host UX density pass (overflow strip, tab reorder, compact SJV Script toolbar, legacy dock shell suppression)

### Scope

- Focused on Phase 5 groundwork (density/space efficiency) without blocking on remaining Phase 4 tutorial slices.
- Implemented requested UX improvements around dock-host tabs, SJV Script toolbar overflow behavior, and shell cleanup.
- Reduced duplicate legacy dock rendering effects while preserving compatibility paths.

### Changes

- `apps/web/src/components/chrome/OverflowStrip.tsx`
  - new reusable horizontal overflow component with:
    - left/right arrow navigation,
    - wheel-to-horizontal-scroll behavior,
    - hidden-overflow viewport,
    - resize-aware overflow state.
- `apps/web/src/components/windowing/DockHost.tsx`
  - migrated tab strip overflow handling to `OverflowStrip`,
  - added mouse drag-and-drop tab reordering (`onTabReorder`).
- `apps/web/src/windowing/windowManager.ts`
  - added `reorderManagedHostTab(...)` helper for deterministic host-tab reordering.
- `apps/web/src/windowing/windowManager.test.ts`
  - regression coverage for managed dock-host tab reorder behavior.
- `apps/web/src/App.tsx`
  - wired dock-host tab reorder to managed-window state in both managed host and legacy-compat host render paths,
  - SJV Script toolbar now uses `OverflowStrip`,
  - SJV Script toolbar adds compact labels before overflow (`Script`, `Sync`, `Export`, `Import`),
  - suppresses legacy dock-shell toggles/regions/actions when no legacy tabs exist (avoids duplicate empty side/bottom dock areas),
  - added icons to key `Window` menu actions for faster visual scanning.
- `apps/web/src/App.css`
  - generic `OverflowStrip` styles,
  - dock-host tab-row compatibility styles updated for new overflow component,
  - SJV Script toolbar compact-label container-query styling,
  - menu item icon styles,
  - non-stretching layout tweaks for `Preferences` / `Help` floating content so controls do not expand vertically on taller windows.
- `apps/web/src/App.styles.test.ts`
  - updated CSS regression expectations for generic overflow nav selectors and menu item icon styling.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/windowing/windowManager.test.ts src/App.styles.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Phase 5 slice: formal UI density preference + complete desktop-menu item icons

### Scope

- Continued Phase 5 with a formal density system (not just isolated compaction tweaks).
- Completed menu item icons beyond `Window` so the desktop menus are visually consistent across the shell.

### Changes

- `apps/web/src/App.tsx`
  - added persisted `UiDensity` preference (`comfortable | compact`) to `UiPreferences`,
  - applied root layout density class (`app-layout-density-*`) so shell density can be token-driven,
  - added `UI density` control in `Preferences`,
  - added `Settings` menu quick actions for `UI Density: Comfortable/Compact`,
  - expanded desktop menu item icon usage across `File`, `Edit`, `View`, `Journey`, `Insert`, `Settings`, and `Help`,
  - introduced a reusable `renderDesktopMenuItem(...)` helper for icon + label + optional shortcut rendering.
- `apps/web/src/App.css`
  - added density tokens on `.app-layout` and a `.app-layout-density-compact` override,
  - applied density tokens to topbar/menu shell controls, toolbar buttons, dock tabs, drawer tabs, floating window headers, and panel paddings/gaps,
  - kept canvas behavior unchanged while tightening shell chrome in compact mode.
- `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - regressions for persisted density preference and root density class,
  - regressions for density CSS tokens / compact density class.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/App.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-22 - Phase 5 slice: compact default, palette visual polish, drilldown back UX, and optional node depth effects

### Scope

- Continued Phase 5 with density/visual refinements that do not change core modeling behavior.
- Fixed a drilldown usability regression after creating a child view from a parent node.
- Added optional 3D-style node lighting effects with a user-facing preference toggle.

### Changes

- `apps/web/src/App.tsx`
  - changed default `UiDensity` to `compact`,
  - added persisted `nodeDepthEffectsEnabled` preference (default `true`) and `Settings`/`Preferences` toggles,
  - restored a `Back` control as a subtle inline canvas overlay arrow (top-left, outside the toolbar),
  - removed the previous drilldown instructional hint text from the canvas header area,
  - added palette preset icons in the Palette panel list,
  - passed `nodeDepthEffectsEnabled` through to `DiagramCanvas`.
- `apps/web/src/components/canvas/DiagramCanvas.tsx`
  - added a boundary-node drilldown interior hit-area so double-click navigation still works after creating a drilldown (when the parent node becomes a boundary),
  - added optional node depth overlay layers (fill/sheen/rim/outline) for rect/hex/queue/db shapes,
  - removed rear/background detail lines that reduced the 3D effect readability on queue/database shapes,
  - added SVG gradients and depth-effect root class toggle (`diagram-canvas-depth-on/off`).
- `apps/web/src/App.css`
  - added subtle themed scrollbar styling for dock/panel areas (including the Palette list),
  - styled the new canvas back-arrow overlay and drilldown hit-area,
  - added node depth-effect layer styles and dark-theme variants,
  - extended density-token usage to Inspector and journey-side forms/controls,
  - upgraded Palette list rows to icon + label cards.
- `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - regressions for compact density default, node depth-effects preference wiring, back-arrow CSS hooks, and depth-layer CSS hooks.
- `apps/web/src/components/canvas/DiagramCanvas.source.test.ts`
  - source regressions for boundary drilldown hit-area and depth-effect prop/class support.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run -- src/App.source.test.ts src/App.styles.test.ts src/components/canvas/DiagramCanvas.source.test.ts`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-23 - Experimental local branch: SJV parallel journey thread syntax (parser/spec slice)

### Scope

- Started a local-only exploration branch (`tmp/ai/20260223-threads-parallel-journeys`) for parallel journey execution syntax.
- Implemented parser/AST/spec support for `thread` blocks inside `journey` declarations without changing runtime playback yet.
- Added an explicit runtime compiler guard so unsupported parsed threads fail loudly instead of being silently ignored.

### Changes

- `apps/web/src/dsl-lite/types.ts`
  - extended `LiteJourneyStep` with optional `threads`,
  - added `LiteJourneyThread` to model top-level thread blocks attached to a main journey step.
- `apps/web/src/dsl-lite/parser.ts`
  - added `thread <id> { ... }` parsing inside `journey`,
  - attaches thread blocks to the previous main step (fork anchor semantics for V1),
  - rejects nested `thread` blocks and invalid thread body lines,
  - closes thread blocks correctly on `}` before closing the parent `journey`.
- `apps/web/src/dsl-lite/convert.ts`
  - added explicit `liteToFullWorkspace(...)` guard that throws when a parsed journey contains thread blocks, documenting runtime/player support as pending.
- `apps/web/src/dsl-lite/parser.test.ts`
  - added tests for thread parsing, nested-thread rejection, and explicit compiler failure before runtime support exists.
- `apps/web/src/dsl-lite/monacoJourneyScript.ts`
  - added `thread` keyword highlighting.
- `docs/SJV_SCRIPT_SPEC.md`
  - extended EBNF and semantics to document `journey-thread` blocks (top-level only, no nested threads in V1).

### Validation

- `npm --workspace @sjv/web run test:run -- src/dsl-lite/parser.test.ts src/dsl-lite/journeyDslSync.test.ts src/dsl-lite/sync.test.ts`
- `npm --workspace @sjv/web run lint`

### Notes

- This is intentionally parser/spec-first and local-only for now (no PR/merge yet).
- Next slices (if approved) should implement runtime player/timeline support before removing the compiler guard.

## 2026-02-23 - Experimental local branch: SJV parallel journey threads (runtime/player scheduler slice)

### Scope

- Continued the local `thread` exploration on `tmp/ai/20260223-threads-parallel-journeys`.
- Enabled runtime compilation of top-level journey threads and introduced a playback scheduler that advances by execution ticks (main lane + active thread lanes).
- Kept canvas animation/timeline rendering backward-compatible for now (primary lane animation only; multi-lane visuals remain pending).

### Changes

- `apps/web/src/model/types.ts`, `apps/web/src/model/schema.ts`
  - added runtime `JourneyThread` support (`JourneyStep.threads?`) and schema validation coverage.
- `apps/web/src/journeys/playbackPlan.ts`, `apps/web/src/journeys/playbackPlan.test.ts`
  - added pure helpers to compute playback ticks, playback length, primary tick step, and thread detection for linear + top-level-thread journeys.
- `apps/web/src/store/useEditorStore.ts`
  - player navigation (`stepPlayer`, `prevPlayerStep`, sync/clamp logic) now uses playback tick length instead of raw main-step length,
  - final-step confetti resolves from the final playback tick primary lane,
  - edge removal now also removes steps inside top-level thread blocks and renormalizes thread step numbering.
- `apps/web/src/store/useEditorStore.test.ts`
  - added regression test proving threaded journeys advance by playback ticks.
- `apps/web/src/journeys/playerStepLabel.ts`
  - playback labels now resolve from the current playback tick and indicate parallel edges (`(+N parallel)`).
- `apps/web/src/journeys/focus.ts`
  - journey focus scope now includes edges/highlights from top-level thread steps.
- `apps/web/src/dsl-lite/convert.ts`
  - removed the temporary compiler guard,
  - compiles parsed thread blocks into runtime journey step metadata,
  - exports thread blocks back to SJV Script for roundtrip support.
- `apps/web/src/dsl-lite/parser.test.ts`
  - replaced the temporary “compiler fails” assertion with compile + re-export thread roundtrip assertions.
- `apps/web/src/components/canvas/DiagramCanvas.tsx`
  - player state now resolves the current playback tick (including thread edges) for highlighting/edge activation,
  - canvas animation remains primary-lane only for now (multi-lane marker animation pending).
- `apps/web/src/App.tsx`
  - player step counters now use playback tick length,
  - animated export now rejects threaded journeys explicitly until multi-lane export playback exists.
- `docs/SJV_SCRIPT_SPEC.md`
  - updated thread support status (compiler + basic player scheduler available; timeline/animation multi-lane pending).

### Validation

- `npm --workspace @sjv/web run test:run -- src/journeys/playbackPlan.test.ts src/dsl-lite/parser.test.ts src/store/useEditorStore.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

### Notes

- This branch still has no PR/merge (intentionally local for UX validation first).
- Next slices should add timeline multi-lane rendering and canvas marker shapes for parallel execution (`orb` / `square` / `triangle` behavior).

## 2026-02-23 - Experimental local branch: SJV parallel journey threads (timeline multi-lane slice)

### Scope

- Continued the local parallel-thread exploration by rendering playback ticks as multi-lane timeline rows in the Journey Timeline panel.
- Kept journey authoring actions constrained to main-lane steps (thread rows are view-only / script-managed in V1).

### Changes

- `apps/web/src/journeys/timelineRows.ts`, `apps/web/src/journeys/timelineRows.test.ts`
  - added pure timeline-row generation grouped by playback tick (main + thread lanes),
  - added deterministic thread color-derivation helper for visual differentiation from the parent journey color.
- `apps/web/src/App.tsx`
  - Journey Timeline panel now renders playback-based rows instead of only `journey.steps`,
  - thread rows are indented and shown after main rows in the same tick,
  - tick badge indicates grouped playback steps; current player tick is highlighted,
  - drag/reorder/remove remains enabled only for main-lane rows (thread rows are labeled `Script-managed`).
- `apps/web/src/App.css`
  - added timeline tick badge, thread lane, current-tick highlight, and thread-pill styles (light/dark themes).
- `docs/SJV_SCRIPT_SPEC.md`
  - clarified current support split: timeline panel multi-lane is available, while canvas animation/export multi-lane rendering is still pending.

### Validation

- `npm --workspace @sjv/web run test:run -- src/journeys/playbackPlan.test.ts src/journeys/timelineRows.test.ts src/store/useEditorStore.test.ts src/dsl-lite/parser.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

### Notes

- Next slice should target canvas marker shapes + multi-lane animation tracks (orb/square/triangle) to match the new scheduler and timeline semantics.

## 2026-02-23 - Experimental local branch: SJV parallel journey threads (canvas multi-lane animation slice)

### Scope

- Continued the local parallel-thread exploration by adding multi-lane playback animation on the canvas.
- Implemented marker-shape switching based on active parallel thread count (`orb` / `square` / `triangle`) and simultaneous lane-colored tracks/trails.

### Changes

- `apps/web/src/components/canvas/DiagramCanvas.tsx`
  - replaced single-lane player animation state with lane-based refs/maps (`playerMarkerPositionsRef`, `lastTrailPositionByLaneRef`),
  - animates all playback lanes in the current tick simultaneously (main + active threads),
  - draws lane-colored tracks/trails for each active lane,
  - adds marker shape logic:
    - no active thread => `orb`,
    - one active thread => `square`,
    - two or more active threads => `triangle`,
  - derives thread lane colors from the journey color via the timeline color helper for visual consistency.
- `apps/web/src/components/canvas/DiagramCanvas.source.test.ts`
  - added source regression coverage for multi-lane markers/shapes path.
- `docs/SJV_SCRIPT_SPEC.md`
  - updated support status: canvas playback multi-lane rendering is now available; animated export multi-lane remains pending.

### Validation

- `npm --workspace @sjv/web run test:run -- src/components/canvas/DiagramCanvas.source.test.ts`
- `npm --workspace @sjv/web run test:run -- src/journeys/playbackPlan.test.ts src/journeys/timelineRows.test.ts src/store/useEditorStore.test.ts src/dsl-lite/parser.test.ts src/components/canvas/DiagramCanvas.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

### Notes

- Animated export still rejects threaded journeys until export playback is upgraded to multi-lane rendering.

## 2026-02-23 - Experimental local branch: threaded showcase tuning (longer parallel continuity)

### Scope

- Tuned the showcase parallel-thread journey so the main lane and both threads stay active for longer, making the fork behavior easier to observe during playback.
- Added a small timeline badge to make parallel ticks more explicit to users (`Parallel xN`).

### Changes

- `apps/web/src/model/showcaseWorkspace.ts`
  - expanded `j_c_parallel_threads` with additional main-lane steps after the fork anchor and longer thread sequences in both demo threads.
- `apps/web/src/model/showcaseWorkspace.test.ts`
  - updated regression coverage for the longer threaded showcase journey (main + both thread sequences).
- `apps/web/src/App.tsx`, `apps/web/src/App.css`
  - timeline main rows in parallel ticks now show a `Parallel xN` pill for quicker visual interpretation.

### Validation

- `npm --workspace @sjv/web run test:run -- src/model/showcaseWorkspace.test.ts src/store/useEditorStore.test.ts src/components/canvas/DiagramCanvas.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

## 2026-02-23 - Experimental local branch: threaded showcase semantics clarity (same-anchor vs staggered)

### Scope

- Improved threaded journey readability in the timeline and extended the showcase with a second scenario to demonstrate delayed thread start from a later main-step anchor.
- Added unit-test coverage for staggered thread-anchor semantics in playback scheduling.

### Changes

- `apps/web/src/model/showcaseWorkspace.ts`
  - added a second threaded container-view journey demo (`j_c_parallel_staggered`) showing a later thread fork anchor (staggered start),
  - kept the existing `j_c_parallel_threads` demo for same-anchor simultaneous thread starts,
  - extended showcase journey ordering so both demos are easy to discover near `j_c_1`.
- `apps/web/src/model/showcaseWorkspace.test.ts`
  - regressions for both threaded showcase demos and their anchor/thread shapes.
- `apps/web/src/journeys/playbackPlan.test.ts`
  - added a scheduler test proving threads attached to later main steps start later (while same-anchor threads still start together).
- `apps/web/src/journeys/timelineRows.ts`
  - strengthened thread color derivation to increase visual contrast between main lane and thread lanes.
- `apps/web/src/App.tsx`, `apps/web/src/App.css`
  - timeline thread rows now show an explicit `Tick N` pill (for parallel ticks),
  - `Parallel xN` pill now appears on the first row of any parallel tick (including ticks where the main lane is already finished),
  - thread pills are tinted using the row lane color for easier tracking.

### Validation

- `npm --workspace @sjv/web run test:run -- src/journeys/playbackPlan.test.ts src/model/showcaseWorkspace.test.ts src/store/useEditorStore.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

## 2026-02-23 - Experimental local branch: threaded playback visual semantics fix (lane identity markers)

### Scope

- Corrected the visual semantics of parallel playback markers so each lane keeps its own identity during concurrent execution.
- Clarified tick presentation in the timeline to reduce the impression that future thread steps are already running.

### Changes

- `apps/web/src/components/canvas/DiagramCanvas.tsx`
  - marker shapes are now assigned **per lane** instead of globally per tick:
    - main lane = `orb`
    - first thread lane = `square`
    - second+ thread lanes = `triangle`
  - concurrent ticks now render mixed marker shapes at the same time (instead of all markers inheriting the same shape).
- `apps/web/src/App.tsx`, `apps/web/src/App.css`
  - timeline now renders a `Tick N` group header with `Current` and `Parallel xN` indicators,
  - row-level parallel pills were reduced to avoid implying future steps are already active.

### Validation

- `npm --workspace @sjv/web run test:run -- src/components/canvas/DiagramCanvas.source.test.ts src/store/useEditorStore.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

## 2026-02-23 - Experimental local branch: showcase parallel demo main-tail extension

### Scope

- Extended the main lane of the primary threaded showcase demo so it remains visible for extra ticks after thread lanes finish.

### Changes

- `apps/web/src/model/showcaseWorkspace.ts`
  - appended two semantic read-after-write verification steps to `j_c_parallel_threads` (`GET /orders/{id}` then `select order`) after the existing threaded overlap window.
- `apps/web/src/model/showcaseWorkspace.test.ts`
  - updated step-count regression and added assertion for the final two main-lane edges.

### Validation

- `npm --workspace @sjv/web run test:run -- src/model/showcaseWorkspace.test.ts src/store/useEditorStore.test.ts`
- `npm --workspace @sjv/web run build`

## 2026-02-24 - Experimental local branch: animated export support for threaded journeys + help markdown comment sanitization

### Scope

- Enabled animated export flows for journeys that use top-level parallel `thread` blocks.
- Verified thread work does not regress persisted UI/editor state flows or guided tutorial/help surfaces.
- Fixed help-guide markdown comments leaking into the rendered Help tab.

### Changes

- `apps/web/src/export/animatedExport.ts`
  - animated SVG export now builds marker animations per playback lane (main + thread lanes) using the same tick-based playback plan as the player/timeline,
  - lane colors/shapes follow runtime semantics (`main=orb`, `thread1=square`, `thread2+=triangle`),
  - thread lanes respect global tick timing, including delayed start and early finish visibility windows.
- `apps/web/src/App.tsx`
  - removed the animated-export guard that blocked parallel-thread journeys,
  - help-guide markdown is sanitized to strip HTML comments before `ReactMarkdown` renders it (prevents top-of-file `Purpose` comments from appearing in Help).
- `apps/web/src/export/animatedExport.test.ts`
  - added regression coverage for threaded animated-SVG lane resolution (tick order + lane shapes).
- `apps/web/src/App.source.test.ts`
  - added regression coverage for help markdown comment sanitization.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/export/animatedExport.test.ts src/App.source.test.ts src/tutorial/guidedTutorial.test.ts src/store/persistence.test.ts src/store/layoutPersistence.test.ts src/store/useEditorStore.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-02-24 - Animated export readability normalization (auto-fit + raster resolution box)

### Scope

- Improve animated GIF/MP4 readability across different monitor sizes by decoupling output framing from the author’s screen size.

### Changes

- `apps/web/src/App.tsx`
  - animated export now temporarily fits the selected journey to the visible canvas before capture (using journey edges + highlight nodes across main/thread playback ticks),
  - viewport is restored after export (including error paths and invalid original player-journey restore paths),
  - GIF/MP4 exports now pass normalized raster output dimensions to the export pipeline.
- `apps/web/src/export/animatedExport.ts`
  - added raster output dimension normalization helper (`resolveAnimatedExportRasterOutputDimensions`) that preserves aspect ratio inside a default `1280x720` box,
  - raster exporters (`GIF`, `MP4`) now accept `outputDimensions`,
  - SVG serialization now injects a `viewBox` fallback when missing so resized export dimensions scale content instead of shrinking it within a larger viewport.
- `apps/web/src/export/animatedExport.test.ts`
  - added regression coverage for raster dimension normalization.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/export/animatedExport.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`

## 2026-02-25 - Presentation sequence diagram preview (inferred journey renderer, static exports)

### Scope

- Added a non-editing sequence-diagram presentation surface inferred from the current SJV journey + C4-like view entities.
- Kept the feature internal/native (no PlantUML/server dependency) and prepared the architecture for future PlantUML export by introducing a sequence IR.

### Changes

- `apps/web/src/sequence/types.ts`, `apps/web/src/sequence/deriveSequenceScene.ts`, `apps/web/src/sequence/deriveSequenceScene.test.ts`
  - added a sequence-diagram IR (`participants`, `message/parallel/note/section` rows),
  - added inference from the current view + selected journey (participants, sync/async arrows, self-calls, thread-based parallel ticks, attached canvas notes).
- `apps/web/src/components/sequence/SequenceDiagramView.tsx`
  - added a branded static SVG renderer for the inferred sequence IR (lifelines, participant headers, notes, message arrows, parallel tick groups).
- `apps/web/src/App.tsx`, `apps/web/src/App.css`, `apps/web/src/App.source.test.ts`
  - presentation toolbar now supports a `Surface` selector (`Journey animation` / `Sequence diagram`),
  - sequence surface renders inside the main presentation area,
  - static export actions (`SVG/PNG/PDF`) now target the sequence SVG when that surface is active,
  - added source regression coverage for the presentation sequence integration.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/sequence/deriveSequenceScene.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

### Notes

- Current sequence rendering is intentionally inferred/read-only (not a sequence editor) and does not yet model explicit semantic blocks like `alt/opt/loop` because those semantics are not first-class in SJV journeys yet.
- The new IR is the intended seam for future manual enrichment and/or PlantUML export generation without coupling renderer and DSL parsing logic.

## 2026-02-25 - Sequence presentation activation semantics hotfix (continuous activation bars)

### Scope

- Corrected the inferred sequence renderer so participant activation is represented as a continuous activation bar across adjacent message activity instead of only highlighting the message target row.
- Improved arrow anchoring so messages visually connect to activation bars (more formal sequence-diagram semantics).

### Changes

- `apps/web/src/sequence/activationBars.ts`, `apps/web/src/sequence/activationBars.test.ts`
  - added pure activation-bar segment inference from rendered message placements (source + target participation, self-message dedupe, gap-based merge).
- `apps/web/src/components/sequence/SequenceDiagramView.tsx`
  - renderer now infers participant activation segments and paints activation bars per row slice (including parallel groups),
  - row-slice rendering now adds controlled vertical bleed to prevent visible activation gaps between adjacent timeline rows,
  - message arrows now anchor to activation-bar edges for non-actor participants,
  - removed per-message target-only activation rectangles to avoid inconsistent semantics.

### Validation

- `git diff --check`
- `npm --workspace @sjv/web run test:run -- src/sequence/activationBars.test.ts src/sequence/deriveSequenceScene.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-01 - Supabase cloud workspace bootstrap (manual auth + save/load)

### Scope

- Added a first optional cloud-persistence slice for `apps/web` using Supabase browser auth and Postgres-backed workspace snapshots.
- Kept existing local browser persistence as the default behavior and exposed cloud actions manually through `Preferences` and `File`.
- Added setup docs so the project can be wired to a fresh Supabase project without server-side secrets in the browser.

### Changes

- `apps/web/src/integrations/supabase/config.ts`, `apps/web/src/integrations/supabase/config.test.ts`
  - added public env resolution for Supabase with support for standard `VITE_*` vars and safe Vite build-time shims fed from Vercel/Supabase public values.
- `apps/web/src/integrations/supabase/workspaceCloudStore.ts`, `apps/web/src/integrations/supabase/workspaceCloudStore.test.ts`
  - added a small client-side Supabase adapter for:
    - email/password sign-in/sign-out,
    - auth observation,
    - manual save/load of `EditorSnapshot` rows in `public.workspaces`.
- `apps/web/src/App.tsx`, `apps/web/src/App.css`, `apps/web/src/App.source.test.ts`
  - added a `Supabase Cloud` section in `Preferences`,
  - added `Save to Supabase Cloud` and `Load from Supabase Cloud` actions in the `File` menu,
  - wired manual cloud save/load to the current workspace id while preserving local autosave.
- `apps/web/vite.config.ts`, `apps/web/src/vite-env.d.ts`, `apps/web/.env.example`
  - added safe build-time bridging for `SUPABASE_URL` / `SUPABASE_ANON_KEY` into browser-safe constants without exposing secret Supabase integration vars,
  - documented local env file shape.
- `docs/SUPABASE_SETUP.md`, `docs/FILE_ATLAS.md`
  - added a repo-local Supabase bootstrap guide (console steps + SQL for `public.workspaces`),
  - registered `src/integrations/` in the file taxonomy.

### Validation

- `npm --workspace @sjv/web run test:run -- src/integrations/supabase/config.test.ts src/integrations/supabase/workspaceCloudStore.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`
- `npm --workspace @sjv/web run test:run`

## 2026-03-01 - Supabase cloud follow-up (generated scripts + private gallery bucket)

### Scope

- Extended the optional Supabase integration beyond workspace snapshots so the app can also store generated SJV scripts and user-owned gallery media.
- Kept the flow manual and user-scoped, avoiding background sync while enabling immediate upload/download workflows for private assets.

### Changes

- `apps/web/src/integrations/supabase/workspaceCloudStore.ts`, `apps/web/src/integrations/supabase/workspaceCloudStore.test.ts`
  - expanded the client-side adapter with:
    - `scripts` table save/load for the generated workspace DSL,
    - `gallery_assets` metadata support,
    - private `gallery` bucket upload/list/download helpers.
- `apps/web/src/App.tsx`, `apps/web/src/App.css`, `apps/web/src/App.source.test.ts`
  - `Preferences > Supabase Cloud` now supports:
    - save/load generated SJV Script,
    - upload local PNG/GIF/MP4 files,
    - list and download recent gallery assets,
  - `File` menu now includes:
    - `Save Script to Supabase Cloud`,
    - `Load Script from Supabase Cloud`,
    - `Upload Media to Supabase Gallery`.
- `docs/SUPABASE_SETUP.md`
  - expanded SQL bootstrap to include `scripts` and `gallery_assets`,
  - documented the required private `gallery` bucket and storage-object policies.

### Validation

- `npm --workspace @sjv/web run test:run -- src/integrations/supabase/workspaceCloudStore.test.ts src/App.source.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run build`
- `npm --workspace @sjv/web run test:run`

## 2026-03-01 - Supabase cloud UI promotion (topbar badge + direct export + live gallery)

### Scope

- Promoted the optional Supabase flow out of `Preferences` into the main desktop chrome so sign-in and gallery actions feel native to the app shell.
- Added direct `PNG` / `GIF` / `MP4` export into the private Supabase gallery and replaced the static Help gallery with live private-media previews.

### Changes

- `apps/web/src/export/exporters.ts`, `apps/web/src/export/exporters.test.ts`
  - added reusable export-blob helpers (`SVG`, `PNG`, `PDF`) plus a shared save helper so exports can be uploaded without forcing a browser download first.
- `apps/web/src/export/animatedExport.ts`, `apps/web/src/export/animatedExport.test.ts`
  - added reusable animated export blob helpers (`GIF`, `MP4`, animated `SVG`) and a filename normalizer shared by upload/download flows.
- `apps/web/src/integrations/supabase/workspaceCloudStore.ts`, `apps/web/src/integrations/supabase/workspaceCloudStore.test.ts`
  - added direct blob upload support for generated exports,
  - added signed preview URL support for the private `gallery` bucket.
- `apps/web/src/App.tsx`, `apps/web/src/App.css`, `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added a top-right Supabase cloud badge with inline sign-in and quick actions,
  - added `Export PNG/GIF/MP4 to Supabase Gallery` actions,
  - switched `Help > Export Gallery` from static bundled samples to the signed-in user’s live gallery previews.
- `apps/web/src/help/help.md`, `docs/SUPABASE_SETUP.md`, `docs/AI_STATE.md`, `docs/DECISIONS.md`
  - updated help/setup/state docs to match the new cloud workflow and gallery behavior.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-01 - Supabase export auto-upload in the normal export flow

### Scope

- Removed the separate cloud-only export buttons and moved Supabase media sync into the normal local export flow.
- Kept local downloads intact while automatically uploading signed-in `PNG`, `GIF`, and `MP4` exports to the private gallery after the file is generated.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`
  - added post-export auto-upload for standard `PNG` / `GIF` / `MP4` flows,
  - removed redundant `Export * to Supabase Gallery` actions from the file menu, help gallery, and top-right cloud panel,
  - updated UI copy to explain the new automatic upload behavior.
- `apps/web/src/help/help.md`, `docs/SUPABASE_SETUP.md`, `docs/AI_STATE.md`, `docs/DECISIONS.md`
  - updated docs/help text to describe automatic upload after the normal export workflow instead of separate cloud-only export commands.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-01 - Animated export background hotfix (full-frame theme fill)

### Scope

- Fixed raster and animated-SVG export background coverage so wide scenes no longer leave transparent regions that show up as black in MP4 playback.
- Kept the change limited to the animated export compositor and added regression coverage for SVG background framing.

### Changes

- `apps/web/src/export/animatedExport.ts`
  - added `resolveSvgThemeBackgroundFrame` so export background layers use the SVG `viewBox` coordinate space when present, with source-dimension fallback when absent,
  - applied the same background-frame logic to the animated SVG exporter and the raster (`GIF`/`MP4`) serializer,
  - now pre-fills the composition canvas with the theme fallback color before drawing the rasterized SVG frame so residual transparency no longer becomes black in video output.
- `apps/web/src/export/animatedExport.test.ts`
  - added regression tests for `viewBox`-aware background framing and the no-`viewBox` source-dimension fallback.
- `docs/AI_STATE.md`
  - recorded the export hotfix in the current snapshot and export flow summary.

### Validation

- `npm --workspace @sjv/web run test:run -- src/export/animatedExport.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-01 - Canvas port affordance hotfix (select-mode direct drag)

### Scope

- Improved the node-port connection affordance so users get an explicit visual cue when the pointer is exactly over a port.
- Added direct port-drag connection starts from `Select` mode without removing the existing `Connector` mode or `Ctrl` gesture.

### Changes

- `apps/web/src/components/canvas/DiagramCanvas.tsx`, `apps/web/src/components/canvas/DiagramCanvas.source.test.ts`
  - added explicit hovered-port state,
  - ports now show a dedicated hover affordance,
  - dragging directly from an exact port hover in `Select` mode now starts a connection just like connector mode,
  - added source regression coverage so this select-mode port drag path stays wired.
- `apps/web/src/diagram/nodes/nodePortClassName.ts`, `apps/web/src/diagram/nodes/nodePortClassName.test.ts`
  - extracted a pure helper for node-port class resolution,
  - added unit tests for idle, hover, and connection-target styling combinations.
- `apps/web/src/App.css`
  - added a blue hover glow + subtle grow animation for ports,
  - kept a stronger grow state for active connection targets.
- `apps/web/src/help/help.md`, `docs/UI_JOURNEYS_CAPABILITIES.md`, `docs/AI_STATE.md`
  - updated help and capability docs to describe direct port-drag from `Select` mode.

### Validation

- `npm --workspace @sjv/web run test:run -- src/diagram/nodes/nodePortClassName.test.ts src/components/canvas/DiagramCanvas.source.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-01 - Canvas port affordance refinement (pulse halo cue)

### Scope

- Refined the new port affordance so the cue behaves like a visible blue pulse halo behind the port, instead of mainly scaling the port itself.

### Changes

- `apps/web/src/components/canvas/DiagramCanvas.tsx`, `apps/web/src/components/canvas/DiagramCanvas.source.test.ts`
  - port hover/connection target now renders an explicit affordance circle behind the port,
  - the source regression now checks for the dedicated affordance rendering path.
- `apps/web/src/App.css`, `apps/web/src/App.styles.test.ts`
  - replaced the prior port-grow emphasis with a pulsing blue halo animation,
  - kept the inner port readable while preserving a stronger active-target state.
- `apps/web/src/help/help.md`, `docs/UI_JOURNEYS_CAPABILITIES.md`, `docs/AI_STATE.md`
  - updated wording to describe the blue pulse cue.

### Validation

- `npm --workspace @sjv/web run test:run -- src/components/canvas/DiagramCanvas.source.test.ts src/App.styles.test.ts src/diagram/nodes/nodePortClassName.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-01 - Edge selection hit-area hotfix

### Scope

- Made dashed edges easier to select without changing automatic edge routing or visual stroke thickness.

### Changes

- `apps/web/src/components/canvas/JourneyEdge.tsx`, `apps/web/src/components/canvas/JourneyEdge.source.test.ts`
  - added an invisible path ahead of the visible edge stroke so pointer events can be captured on a wider target area,
  - added source regression coverage for the dedicated hit-area path.
- `apps/web/src/App.css`, `apps/web/src/App.styles.test.ts`
  - added `.edge-hitarea` with transparent stroke and `pointer-events: stroke` for wider edge targeting,
  - updated style regression coverage to keep the wider hit area present.
- `docs/AI_STATE.md`
  - recorded the edge-selection targeting refinement in the current snapshot.

### Validation

- `npm --workspace @sjv/web run test:run -- src/components/canvas/JourneyEdge.source.test.ts src/components/canvas/JourneyEdge.test.ts src/App.styles.test.ts`
- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## 2026-03-01 - Mobile shell route and desktop panel UX refinement

### Scope

- Added a dedicated mobile-first shell at `/m` with touch-first auto-open and pinch zoom support on the shared canvas.
- Refined desktop panel defaults and panel affordances without changing the existing desktop workbench architecture.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`, `apps/web/src/App.styles.test.ts`
  - added a route-aware alternate mobile shell that keeps the same store/domain logic but swaps in a touch-first chrome,
  - auto-opens `/m` for narrow touch-first devices while keeping desktop as the default shell elsewhere,
  - moved the shared Supabase cloud badge into a reusable UI block used by both shells,
  - added reusable `PanelGroup` usage across `Journeys`, `Preferences`, `Palette`, and `Inspector`,
  - made `Journeys` groups collapsible with only the list open by default, and collapsed `Supabase Cloud` by default in Settings,
  - strengthened journey sidebar row layout, right-aligned filter affordance, and clearer edge-drag drop targeting.
- `apps/web/src/components/chrome/PanelGroup.tsx`, `apps/web/src/components/chrome/PanelGroup.test.tsx`
  - added a reusable collapsible panel-group component for tab/dock content with an interaction test.
- `apps/web/src/layout/mobileShellRoute.ts`, `apps/web/src/layout/mobileShellRoute.test.ts`
  - extracted the pure route + touch heuristic helpers that decide when `/m` should render.
- `apps/web/src/components/canvas/DiagramCanvas.tsx`, `apps/web/src/components/canvas/DiagramCanvas.source.test.ts`, `apps/web/src/diagram/canvas/pinchZoom.ts`, `apps/web/src/diagram/canvas/pinchZoom.test.ts`
  - added two-finger pinch zoom using touch events on the shared canvas shell,
  - kept touch gestures isolated to the canvas target via `targetTouches`,
  - added a dedicated drag-state prop so the currently dragged edge gets a stronger journey-drop highlight.
- `apps/web/src/components/canvas/JourneyEdge.tsx`, `apps/web/src/components/canvas/JourneyEdge.test.ts`, `apps/web/src/diagram/edges/journeyEdgeClassName.ts`
  - added an explicit `edge-journey-dragging` class while dragging an edge into a journey,
  - strengthened selected-edge styling so it reads closer to the hover treatment.
- `apps/web/src/windowing/windowUiConfig.ts`
  - changed the default dock host for `Journey Timeline` and `SJV Script` from `bottom` to `right`.
- `apps/web/src/App.css`
  - added mobile shell styling, reusable panel-group styling, pinch-safe canvas touch handling, clearer edge/journey drop visuals, and stronger filter-button hover feedback.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`
- `git diff --check`

## 2026-03-01 - Mobile shell polish pass

### Scope

- Tightened the touch-first mobile shell so the chrome feels denser and the bottom panel takes less vertical space on phones.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`
  - added short mobile tab labels (`Inspect`, `Steps`, `Script`, `Prefs`) while keeping the full panel names in `aria-label`,
  - added a compact meta row (`View`, current tool, active journey) under the mobile title bar,
  - shortened the panel toggle copy for smaller screens and added a compact mobile panel heading above the active panel body.
- `apps/web/src/App.css`, `apps/web/src/App.styles.test.ts`
  - reduced mobile topbar spacing, toolbar/button density, and panel-tab density,
  - lowered the expanded bottom panel height cap so the canvas keeps more vertical room,
  - added styling for the new mobile meta pills and panel heading.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`
- `git diff --check`

## 2026-03-01 - Mobile shell frame alignment fix

### Scope

- Fixed the `/m` shell layout so it stays structurally aligned instead of stretching awkwardly across wide desktop viewports.

### Changes

- `apps/web/src/App.tsx`, `apps/web/src/App.source.test.ts`
  - wrapped the mobile shell in a dedicated `mobile-shell-frame` so header, canvas, and bottom panel share the same column and sizing context,
  - kept the mobile panel tabs and canvas inside that shared frame to prevent the previously split/offset layout.
- `apps/web/src/App.css`, `apps/web/src/App.styles.test.ts`
  - added a centered constrained mobile frame on wider screens with rounded-shell containment,
  - kept the mobile shell full-width on narrow screens,
  - tuned the dark-mode frame styling to match the mobile chrome instead of leaving the shell visually detached.

### Validation

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`
- `git diff --check`
