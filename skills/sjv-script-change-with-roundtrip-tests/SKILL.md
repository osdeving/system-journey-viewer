---
name: sjv-script-change-with-roundtrip-tests
description: Use when changing SJV Script syntax or semantics in System Journey Viewer, including parser, import/export, editor sync, conversion, metadata, drilldown, notes, and documentation/showcase alignment with roundtrip test coverage.
---

# SJV Script Change With Roundtrip Tests

Use this skill when modifying the product scripting language (SJV Script) or its conversion pipeline.

## Scope

- Parser and syntax rules: `apps/web/src/dsl-lite/parser*`
- Import/export/sync/conversion: `apps/web/src/dsl-lite/*`
- Workspace mapping and semantics: `apps/web/src/model/*`, `apps/web/src/store/*`
- Showcase/tutorial examples that demonstrate language features
- Spec/docs: `docs/SJV_SCRIPT_SPEC.md`, help content if needed

## Required mindset

SJV Script changes are behavior changes. Treat them like a contract update, not a UI tweak.

## Default workflow

1. Clarify the language change:
   - syntax,
   - semantics,
   - inference rules,
   - compatibility expectation (breaking vs non-breaking).
2. Update parser / AST / conversion / sync logic.
3. Update import/export behavior and ensure theme/persistence expectations still hold.
4. Add or update tests (minimum set depends on change):
   - parser tests (`parser.test.ts`)
   - sync/import-export tests (`sync.test.ts`, `journeyDslSync.test.ts`)
   - store integration tests (`useEditorStore.test.ts`) if theme/workspace loading behavior changes
   - focused helper tests if new inference logic is extracted
5. Update docs/spec and examples:
   - `docs/SJV_SCRIPT_SPEC.md`
   - showcase/tutorial workspace examples if they are used as feature demonstrations
   - UI labels/help text to use "SJV Script" consistently (not generic "DSL")
6. Validate:
   - `npm --workspace @sjv/web run lint`
   - `npm --workspace @sjv/web run test:run`
   - `npm --workspace @sjv/web run build`
7. Update `docs/WORKLOG.md` and `docs/AI_STATE.md`.

## Roundtrip checklist

For language feature changes, verify at least one realistic sample can:

1. parse -> workspace
2. export -> SJV Script
3. re-import -> equivalent behavior/structure

If exact text roundtrip is not expected, document what is normalized.

## Common pitfalls

- Updating parser syntax without updating exporter or docs.
- Changing semantics but leaving showcase examples ambiguous.
- Forgetting theme-preservation or entry-view behavior during import.
- Fixing sync behavior in UI but not in `dsl-lite` tests.
