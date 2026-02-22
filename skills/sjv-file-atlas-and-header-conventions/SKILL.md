---
name: sjv-file-atlas-and-header-conventions
description: Use when reorganizing frontend files in apps/web, classifying components vs non-components, applying folder/naming conventions, and adding top-of-file Purpose headers for faster human/AI navigation.
---

# SJV File Atlas And Header Conventions

Use this skill when a task involves structural refactors, file moves, naming consistency, or readability conventions in `apps/web`.

## Source of truth

- Read `docs/FILE_ATLAS.md` first.
- Follow the folder taxonomy and naming conventions defined there.

## Goals

- Keep `components/` React-only.
- Move pure helpers to domain folders (`diagram/*`, `layout/*`, `windowing/*`, etc.).
- Make file roles immediately obvious via top-of-file `Purpose:` headers.
- Preserve behavior (structure-only refactors require no behavior changes).

## Default workflow

1. Classify touched files:
   - React UI component,
   - pure helper/utility,
   - state/config helper,
   - test.
2. Move files with `git mv` (preserve history).
3. Colocate tests with the moved module when practical.
4. Update imports mechanically.
5. Add/update top-of-file `Purpose:` headers on touched files.
6. If the refactor establishes a reusable pattern, update `docs/FILE_ATLAS.md`.
7. Run validations:
   - `npm --workspace @sjv/web run lint`
   - `npm --workspace @sjv/web run test:run`
   - `npm --workspace @sjv/web run build`
8. Update `docs/WORKLOG.md` and `docs/AI_STATE.md`.

## Classification rules (quick)

- React component -> `src/components/<group>/PascalCase.tsx`
- Pure diagram logic -> `src/diagram/<edges|nodes|player>/camelCase.ts`
- Shell/layout helpers -> `src/layout/*`
- Window manager state/config -> `src/windowing/*`
- Tests -> colocated `*.test.ts[x]`

## Header comment rules

- Start with `Purpose:`.
- One sentence explaining why the file exists.
- Prefer domain language (managed windows, SJV Script, diagram edge helpers, etc.).
- Do not restate obvious syntax (`imports`, `exports`, etc.).

## Common pitfalls

- Leaving pure helpers in `components/` because they were originally created near UI code.
- Moving files without colocating/updating tests.
- Refactor-only moves that accidentally change behavior due to import path mistakes.
- Inconsistent naming (`PascalCase` utility modules or camelCase React components).
