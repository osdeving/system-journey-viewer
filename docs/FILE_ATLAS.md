# File Atlas (apps/web)

Purpose: define a stable folder taxonomy, naming conventions, and file-header convention so humans and AI agents can classify files quickly before editing.

## Read First Rule (Header-First)

Before reading implementation details, read the file header comment.

- Every code file in `apps/web/src` should start with a short `Purpose:` header.
- The header explains the file's role (component, pure helper, state, config, test, etc.).
- This is intentionally optimized for fast triage by maintainers and AI agents.

## Folder Taxonomy

### `src/components/`

React UI components only (PascalCase files).

- `src/components/canvas/`
  - Canvas-rendered React components and SVG UI composition pieces.
- `src/components/windowing/`
  - Reusable window/dock UI shells (`FloatingWindow`, `DockHost`, etc.).
- Future groups should follow the same pattern:
  - `src/components/<feature-or-surface>/ComponentName.tsx`

Rule:

- If a file exports pure math/formatting/geometry/state helpers and no React component, it does **not** belong in `components/`.

### `src/diagram/`

Canvas/diagram domain helpers (non-React modules), grouped by concern.

- `src/diagram/edges/`
  - edge geometry, label placement, badge selection, interaction helpers.
- `src/diagram/nodes/`
  - node shape/path helpers and node-role classification helpers.
- `src/diagram/player/`
  - animation/timeline/trail/confetti helpers for journey playback.

Rule:

- Prefer pure functions and colocated tests (`*.test.ts`) in the same folder.

### `src/layout/`

Pure layout sizing/grid/resize helpers used by the desktop shell and windowing behavior.

### `src/windowing/`

Managed window state, host layout helpers, and window UI configuration metadata.

### Other existing folders (stay domain-oriented)

- `src/dsl-lite/`: SJV Script parsing/import/export/sync/editor integration
- `src/store/`: editor state and persistence integration
- `src/model/`: core workspace model types and fixtures/defaults
- `src/export/`: static/animated export pipeline
- `src/file/`: file import/export and recent files support
- `src/integrations/`: external service adapters (for example Supabase browser auth/cloud persistence)
- `src/journeys/`: journey focus/player helpers
- `src/engine/`: low-level geometry/curve engine primitives

## Naming Conventions

### Components (React)

- File names: `PascalCase.tsx`
- Export names: match file name when practical
- Examples:
  - `DiagramCanvas.tsx`
  - `FloatingWindow.tsx`

### Non-UI helpers / config / state helpers

- File names: `camelCase.ts`
- Export names:
  - `camelCase` for functions/constants
  - `PascalCase` only for types/interfaces when natural
- Examples:
  - `edgePresentation.ts`
  - `windowManager.ts`
  - `layoutGrid.ts`

### Tests

- Colocate tests with the file under test whenever practical.
- File name: `<module>.test.ts` or `<module>.test.tsx`

## Header Comment Convention

### TypeScript / TSX

Use a short top-of-file docblock:

```ts
/**
 * Purpose: <one-sentence reason this file exists>.
 */
```

### CSS

Use a short top-of-file comment:

```css
/* Purpose: <one-sentence reason this stylesheet exists>. */
```

### Header quality rules

- Describe the file's role, not line-by-line behavior.
- Keep it short (1 sentence, occasionally 2).
- Prefer domain language used in this repo (`SJV Script`, `managed window hosts`, `diagram edge helpers`, etc.).

## Classification Checklist (for new files)

1. Is it a React component?
   - Yes -> `src/components/<group>/PascalCase.tsx`
2. Is it pure diagram/canvas logic (no React)?
   - Yes -> `src/diagram/<edges|nodes|player>/camelCase.ts`
3. Is it shell/layout/windowing logic?
   - `src/layout/*` or `src/windowing/*`
4. Is it a test?
   - colocate with the module when possible
5. Add/update the top header comment
6. Update imports and targeted tests

## Refactor Guidance (no behavior change)

When moving files for structure only:

- prefer `git mv` to preserve history
- move tests with their modules when practical
- update imports mechanically first
- run `lint`, `test:run`, and `build`
- update `docs/WORKLOG.md` and `docs/AI_STATE.md`
