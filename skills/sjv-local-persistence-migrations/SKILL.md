---
name: sjv-local-persistence-migrations
description: Use when changing System Journey Viewer local persistence shape or semantics (localStorage UI preferences, layout persistence, snapshots, recents), including backward compatibility, storage key versioning/migration logic, tests, and user-facing behavior safeguards.
---

# SJV Local Persistence Migrations

Use this skill when modifying persisted client-side state such as UI preferences, layout persistence, recents, or snapshot formats.

## Scope

Common files:

- `apps/web/src/App.tsx` (UI preferences/localStorage keys)
- `apps/web/src/store/persistence*`
- `apps/web/src/store/layoutPersistence*`
- `apps/web/src/file/recentWorkspaces*`
- `apps/web/src/file/workspaceFile*`
- tests for the above modules

## Goal

Evolve persistence safely without breaking existing users' stored state or causing confusing resets.

## Default workflow

1. Classify the persistence change:
   - additive field,
   - renamed field,
   - semantic change,
   - key split/merge,
   - snapshot/schema format change.
2. Decide compatibility strategy:
   - backward-compatible defaulting,
   - explicit migration transform,
   - storage key version bump (when migration cost/risk is too high).
3. Implement parsing/hydration defensively:
   - guard invalid JSON/shape,
   - default missing fields,
   - preserve unaffected persisted values.
4. Add/update tests:
   - old-shape hydration still works,
   - invalid payloads fail safely,
   - new writes persist expected shape,
   - key version behavior (if bumped).
5. Validate runtime behavior manually when user-visible:
   - existing preferences still load,
   - no broken menus/toolbars/layout due to stale state,
   - imports/recents/snapshots still function.
6. Update docs:
   - `docs/WORKLOG.md` and `docs/AI_STATE.md`
   - mention migration/key versioning rationale when relevant.
7. Validate:
   - `npm --workspace @sjv/web run lint`
   - `npm --workspace @sjv/web run test:run`
   - `npm --workspace @sjv/web run build`

## Migration strategy heuristics

- Additive field with safe default -> keep key, add fallback parsing.
- Small rename/shape tweak -> migrate in parser/hydrator + tests.
- Broad semantic rewrite or ambiguous old data -> bump key version and document.

## Common pitfalls

- Changing stored shape but forgetting hydration defaults.
- Bumping storage key without documenting behavior (users think data is “lost”).
- Migrating UI prefs but not layout persistence (or vice versa), causing mixed-state bugs.
- Treating malformed localStorage as impossible.
