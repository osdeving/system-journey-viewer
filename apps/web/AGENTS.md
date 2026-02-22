# AGENTS.md (apps/web)

Frontend-specific guardrails for System Journey Viewer.

## Scope

- React + TypeScript + Vite app under `apps/web`
- Desktop-style shell UI (menubar, toolbar rows, dock, workbench)
- Canvas editor, journeys/player, SJV Script editor/import/export/sync

Root `AGENTS.md` still applies. This file narrows frontend-specific expectations.

## High-risk areas (treat regressions seriously)

- `src/App.tsx` + `src/App.css` (desktop shell layout, menus, toolbars, dock/workbench)
- `src/components/DiagramCanvas.tsx` (interaction, handles, hit areas)
- `src/dsl-lite/*` (SJV Script parser/sync/import/export semantics)
- `src/store/*` (workspace/theme/persistence behavior)
- `src/model/showcaseWorkspace.ts` and `src/model/defaultWorkspace.ts` (showcase/tutorial integrity)

## Frontend behavior-change testing rules

- UI shell/layout regressions:
  - add/update deterministic tests (`src/App.styles.test.ts` or helper unit tests under `src/layout/*`).
- Interaction behavior changes:
  - add focused tests in `src/components/*`, `src/engine/*`, or extracted helpers.
- SJV Script changes:
  - update parser/sync/roundtrip tests (`src/dsl-lite/*.test.ts`),
  - update docs (`docs/SJV_SCRIPT_SPEC.md`) and showcase/tutorial examples when applicable.

## Manual smoke checklist (when touching layout/menus/toolbars)

1. Menubar dropdown opens and is not clipped.
2. Toolbar rows remain readable on narrow and wide viewport widths.
3. Dock positions (`left/right/bottom/floating`) still work.
4. Workbench (bottom drawer) still resizes and tabs switch.
5. Presentation/focus modes still hide/show shell correctly.

## Manual smoke checklist (when touching SJV Script)

1. Export SJV Script from current view/workspace.
2. Import back and verify theme preservation + entry view selection.
3. Enable editor sync and type a valid change; canvas updates immediately.
4. Verify invalid script shows error but does not corrupt workspace.

## Validation commands (default for most `apps/web` work)

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

## Content language

- Keep UI/help/showcase text in English unless the user explicitly asks for a localized variant.
