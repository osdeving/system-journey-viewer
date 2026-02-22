<!-- Purpose: Map persistent state domains, source-of-truth ownership, and synchronization rules across the app shell, canvas workspace, and SJV Script metadata. -->

# State Persistence Map

This project persists state in multiple domains. They are intentionally separate, but must stay synchronized through clear ownership rules.

## 1) Source-of-truth domains

### A. Editor Workspace Snapshot (JSON / browser autosave)

Primary source for canvas + editor session state in browser storage.

- Storage module: `apps/web/src/store/persistence.ts`
- Schema: `apps/web/src/model/schema.ts` (`editorSnapshotSchema`)
- Store serializer: `apps/web/src/store/useEditorStore.ts` (`toSnapshot`)

Includes:

- `workspace` (nodes, edges, journeys, views, workspace settings)
- `currentViewId`
- `viewport`
- `viewHistory`
- selection (`selectedNodeId`, `selectedNodeIds`, `selectedEdgeId`)
- tool mode (`activeTool`)
- pending connection state
- journey/player session state (`activeJourneyId`, `journeyFilterId`, `player*`)

Rules:

- `saveSnapshot(...)` writes the **global latest snapshot** key (reliable restore source).
- A legacy per-view key is still written for backward compatibility.
- `hydrate()` restores from the latest global snapshot, not only the default view key.

### B. Workspace UI Layout Metadata (per-workspace local cache)

Secondary source used to reapply visual layout to imported/generated workspaces when needed.

- Storage module: `apps/web/src/store/layoutPersistence.ts`
- Scope: per `workspaceId`

Includes (per view):

- node bounds (`x`, `y`, `w`, `h`)
- node colors (`fillColor`, `textColor`)
- edge label UI (`position`, `side`, `fontSize`, `angle`)

Rules:

- This is a visual metadata cache, not the main workspace snapshot.
- On SJV import, local layout metadata is applied **only when the script does not contain `metadata ui-layout`**.
- If `metadata ui-layout` exists in the SJV Script, the script is authoritative.

### C. App Shell UI Layout / Windowing (browser localStorage)

Source for desktop-shell/window arrangement and shell session UI state.

- Owner: `apps/web/src/App.tsx` (window layout bootstrap)
- Storage key: `MANAGED_WINDOWS_LAYOUT_STORAGE_KEY`

Includes:

- managed windows host placements + floating rects
- dock placement/collapsed state
- managed host sizes and legacy dock sizes
- journey/workbench heights
- dock tab order + active dock tab
- shell session UI: `drawerTab`, `dslMaximized`, `focusMode`, `presentationMode`, `helpSection`, `journeyDraftName`, `leftSidebarWidth`

Rules:

- Autosaved whenever these values change.
- Restored at app startup through `resolveInitialWindowLayoutBootstrap(...)`.
- `Restore/Reset Window Layout` now restores/resets both the shell layout and related shell session UI fields above.

### D. UI Preferences (browser localStorage)

Persistent user preferences, independent of workspace content.

- Owner: `apps/web/src/App.tsx`
- Storage key: `UI_PREFERENCES_STORAGE_KEY`

Includes:

- tooltips enabled
- splash enabled
- node depth effects enabled
- showcase locale
- UI density
- toolbar section visibility

## 2) SJV Script synchronization model

### SJV Script -> Workspace (sync/import)

- Parser/convert modules:
  - `apps/web/src/dsl-lite/parser.ts`
  - `apps/web/src/dsl-lite/convert.ts`
  - `apps/web/src/dsl-lite/sync.ts`
- `App.tsx` resolves imports through `resolveWorkspaceFromDslText(...)`

Rules:

- When SJV sync is enabled, valid text changes replace the current workspace.
- The app theme is preserved on import.
- If the SJV script contains `metadata ui-layout`, local cached layout metadata is not overlaid.

### Workspace -> SJV Script (while sync is enabled)

Rules:

- With SJV sync enabled, non-DSL workspace changes (Inspector/canvas operations) regenerate the SJV text.
- Loop guards prevent `workspace -> text -> workspace` feedback loops.
- This keeps Inspector/canvas visual changes (including node colors) reflected in the script metadata.

## 3) `metadata ui-layout` coverage (SJV Script)

Current metadata coverage includes:

- node bounds (`at`, `size`)
- node visual colors (`fill`, `text`)
- edge label visual placement (`label`, `side`, `font`, `angle`)

Example:

```sjv
metadata ui-layout {
  view v_main {
    node api at 560 220 size 300 130 fill #0f172a text #e2e8f0
    edge e_app_api label 0.72 side right font 13 angle -18
  }
}
```

## 4) Synchronization precedence summary

1. `workspace` state drives canvas + inspector rendering.
2. SJV sync (when enabled) can replace the workspace from text input.
3. Non-DSL editor changes regenerate SJV text (while sync is enabled).
4. Local per-workspace layout cache only overlays imported SJV workspaces when the script omits `metadata ui-layout`.

