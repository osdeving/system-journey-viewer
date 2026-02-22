# AGENTS.md

Engineering constitution for the System Journey Viewer monorepo.

## Repository scope (current reality)

- Primary product app: `apps/web` (`React + TypeScript + Vite + Vitest`)
- Optional backend helper: `apps/codex-gateway` (Node.js ESM service for Codex assistance)
- Product docs and session memory: `docs/`
- Local reusable agent workflows (skills): `skills/`

Do not assume Java/Spring for this repository unless the user explicitly introduces a new backend service with that stack.

## Default stack and style

- Frontend-first repository: most tasks affect `apps/web`.
- UI shell is desktop-like (menubar + toolbars + dock/workbench); layout regressions are high-priority.
- SJV Script (the product scripting language) is a first-class feature:
  - parser/import/export/sync changes must be treated as behavior changes,
  - docs and showcase examples must stay aligned.
- Gateway (`apps/codex-gateway`) is a lightweight Node service:
  - keep interfaces simple,
  - test behavior with standalone node tests.
- Local infrastructure and external integrations should be validated against current docs when non-trivial.

## Non-negotiable rule 1: temporary sandbox branch

Before changing any file:

1. Create a temporary branch from the current branch:
   `git checkout -b tmp/ai/<YYYYMMDD-HHMM>-<slug>`
2. Work and validate in that branch.
3. Promote to target branch without a merge commit:
   - use `cherry-pick` or `rebase`, always fast-forward.
4. Remove the temporary branch at the end.

Even if the current branch is already a feature branch, the temporary branch is still mandatory.

## Non-negotiable rule 2: no behavior change without tests

If behavior changes, there must be coverage:

- unit tests and/or focused integration tests for the touched app,
- regression tests when the change fixes a previously observed bug.

Examples in this repo:

- UI interaction/layout behavior change -> add or update `Vitest` tests (`App.styles.test.ts`, focused helpers, parser/sync tests, etc.).
- SJV Script syntax/semantics/import/export/sync change -> parser/sync/roundtrip tests are required.
- Gateway behavior change -> update `apps/codex-gateway` node tests.

If full testing is not possible:

1. explain the objective technical reason,
2. deliver the smallest meaningful coverage,
3. register a follow-up plan in `docs/WORKLOG.md`.

## Non-negotiable rule 3: standalone by default

- Tests must run without relying on a manually running local stack.
- Avoid fragile tests (no arbitrary `sleep`; prefer deterministic polling/timeouts).
- For browser/UI regressions, prefer small pure helpers extracted from UI code plus unit tests when practical.

## Non-negotiable rule 4: docs and session memory

At the start of each session:

1. Read `docs/AI_STATE.md`.
2. Read the most recent entries in `docs/WORKLOG.md`.

At the end of each task:

1. Update `docs/WORKLOG.md`.
2. Update `docs/AI_STATE.md` if context, flows, workflows, or commands changed.
3. Update architecture docs when system behavior/architecture changed (`docs/DECISIONS.md`, Mermaid files).

## Non-negotiable rule 5: validate docs in real time

Before implementing non-trivial configurations or external APIs:

- validate current documentation via tools/MCP,
- if Context7 is available, use it for current contracts/examples.

Apply especially to:

- OpenAI/Codex SDK usage,
- Monaco/editor integration quirks,
- export/media tooling expectations,
- browser APIs (File System Access, media capture),
- deployment config (Vercel),
- any new third-party library APIs.

## Non-negotiable rule 6: product language consistency

- UI text, help content, examples, and documentation in the repository must be in English unless the user explicitly requests a localized artifact.
- User prompts may be in Portuguese; repository output should remain English by default.

## Non-negotiable rule 7: UI regression discipline (desktop shell)

When touching `apps/web/src/App.tsx`, `apps/web/src/App.css`, dock/layout logic, or canvas shell composition:

1. Verify menubar dropdowns are visible (no clipping by overflow).
2. Verify toolbar rows do not clip labels/buttons in at least one narrow and one wide viewport.
3. Verify dock/workbench visibility states (`left/right/bottom/floating`) still render.
4. Add a regression test when the bug is caused by a deterministic CSS or helper rule.

Screenshots are strongly recommended for visual regressions.

## Non-negotiable rule 8: persisted UI state changes need migration awareness

- This project persists UI preferences/layout in localStorage.
- When changing persisted shape or semantics:
  - preserve backward compatibility, or
  - version the key / add migration logic, and
  - document the change in `docs/AI_STATE.md` or `docs/WORKLOG.md`.

## Standard workflow

1. Plan (short): steps + affected files.
2. Implement the smallest correct change.
3. Create/update tests when behavior changes.
4. Run validations relevant to touched areas.
5. Update docs (`WORKLOG`, `AI_STATE`, and architecture docs if applicable).
6. Deliver summary with exact validation commands.
7. If requested, create PR and merge with `gh` after checks pass.

## Validation matrix (use what applies)

### Docs / skills only

- `git diff --check`
- sanity-check new file paths/content (`rg`, `sed`, `ls`)

### `apps/web` changes

- `npm --workspace @sjv/web run lint`
- `npm --workspace @sjv/web run test:run`
- `npm --workspace @sjv/web run build`

### `apps/codex-gateway` changes

- `npm --workspace @sjv/codex-gateway run test:run`

### Cross-app / release confidence

- `npm run ci`

## Definition of Done

- [ ] Branch `tmp/ai/*` created and used.
- [ ] Behavior changes have tests (or explicit documented exception).
- [ ] Validations for touched areas executed and green.
- [ ] `docs/WORKLOG.md` updated.
- [ ] `docs/AI_STATE.md` updated if workflow/context/architecture changed.
- [ ] Output language is English for repo-facing UI/docs/examples unless explicitly requested otherwise.
- [ ] Change promoted without merge commit.

## Local skills (implemented in `skills/`)

Prefer these when the task matches:

- `sjv-ui-layout-regression-fix`
  - Menubar/toolbar/dock/workbench layout clipping, overflow, wrapping, and topbar sizing regressions.
- `sjv-script-change-with-roundtrip-tests`
  - SJV Script syntax/parser/import/export/sync changes with docs/showcase/test alignment.
- `sjv-pr-and-merge-gh`
  - Standardized branch -> validate -> PR -> checks -> merge flow using `gh`.
- `sjv-showcase-tutorial-curation`
  - Curating built-in showcase/tutorial content, localization parity, drilldowns, and demo coverage.
- `sjv-docs-sync`
  - Syncing docs/worklog/state/spec/help terminology and change summaries after feature/workflow updates.
- `sjv-export-pipeline-validation`
  - Export and presentation/capture validation workflow for static and animated outputs.
- `sjv-theme-and-palette-accessibility`
  - Theme/palette/text-color tuning with readability and showcase/demo coverage checks.

## Candidate next skills (not yet implemented)

- Add more domain-specific skills only after repeated use patterns emerge.
