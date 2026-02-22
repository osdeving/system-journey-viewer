---
name: sjv-docs-sync
description: Use when syncing System Journey Viewer documentation after feature or workflow changes, covering WORKLOG, AI_STATE, SJV Script spec, help content, README, and naming consistency (especially SJV Script terminology and English UI/docs text).
---

# SJV Docs Sync

Use this skill when code or workflow changes require repository documentation updates.

## Scope

Primary docs commonly affected:

- `docs/WORKLOG.md`
- `docs/AI_STATE.md`
- `docs/SJV_SCRIPT_SPEC.md`
- `docs/UI_JOURNEYS_CAPABILITIES.md`
- `README.md`
- `apps/web/src/help/help.md`
- `AGENTS.md` and app-level `AGENTS.md` files (workflow changes)

## Core rules

- Keep repository-facing docs/examples/UI text in English unless explicitly requested otherwise.
- Use product terminology consistently: prefer `SJV Script` over generic `DSL` in docs/UI unless describing legacy concepts.
- Do not claim validations you did not run.
- Keep entries factual and specific (what changed, where, and why).

## Default workflow

1. Identify documentation impact from the code change:
   - feature behavior,
   - terminology/naming,
   - workflows/commands,
   - screenshots/media references.
2. Update `docs/WORKLOG.md`:
   - add dated scope/changes/validation entry,
   - list exact touched files or areas.
3. Update `docs/AI_STATE.md` if needed:
   - feature snapshot changed,
   - workflow/commands changed,
   - new recurring patterns or local skills were added.
4. Update user-facing docs when applicable:
   - `SJV_SCRIPT_SPEC.md` for language changes,
   - `help.md`/`README.md` for UX/menu/workflow changes.
5. Run lightweight validation for docs-only work:
   - `git diff --check`
   - targeted sanity scans (`rg`, `find`, `sed`) for naming/frontmatter/paths
6. If docs depend on unverified runtime behavior, mark that clearly.

## What to include in WORKLOG entries

- Scope (what request/task was addressed)
- Concrete changes (by file/area)
- Validation commands executed

## Common pitfalls

- Forgetting `AI_STATE.md` after changing team workflow (AGENTS/skills/commands).
- Leaving Portuguese strings in repo docs/UI after English-only cleanup work.
- Mixing historical terms (`DSL Lite`, `DSL`) after migrating to `SJV Script`.
- Adding vague worklog entries without validation commands.
