---
name: sjv-showcase-tutorial-curation
description: Use when updating the System Journey Viewer showcase or tutorial workspaces, including EN/PT variants, notes, drilldowns, semantic edge/journey naming, demo coverage of features, and corresponding tests/help menu entry behavior.
---

# SJV Showcase/Tutorial Curation

Use this skill when the user asks to improve, expand, or localize the built-in showcase/tutorial experience.

## Scope

- `apps/web/src/model/defaultWorkspace.ts`
- `apps/web/src/model/showcaseWorkspace.ts`
- `apps/web/src/model/showcaseWorkspace.test.ts`
- `apps/web/src/store/useEditorStore.ts` and tests (if load behavior/theme preservation changes)
- `apps/web/src/App.tsx` / `apps/web/src/help/help.md` (if menus/help entries or UX flows change)

## Goal

Keep showcase/tutorial content as a serious product demo that visibly exercises current features, not just a sample diagram.

## Default workflow

1. Clarify the requested demo purpose:
   - showcase vs tutorial,
   - language variants (`EN`, `PT`),
   - feature emphasis (notes, drilldowns, colors, journeys, exports, etc.).
2. Update the model factories/workspaces:
   - use semantic names for nodes, edges, journeys,
   - ensure feature coverage is intentional,
   - avoid placeholder tokens unless the test explicitly needs them.
3. Keep localization parity:
   - if a feature/note is added to EN and PT variants exist, update both or document why one differs.
4. Verify drilldown integrity:
   - referenced drilldown views exist,
   - entry views and navigation remain coherent.
5. Add/update tests:
   - `showcaseWorkspace.test.ts` for variant coverage,
   - store tests if load/theme/locale behavior changes.
6. If UI entry points changed, update help/menu text and related docs.
7. Validate:
   - `npm --workspace @sjv/web run lint`
   - `npm --workspace @sjv/web run test:run`
   - `npm --workspace @sjv/web run build`

## Curation checklist

- Feature coverage is obvious from the canvas (not hidden in obscure views only).
- Names are semantic (good examples for users copying the pattern).
- Notes explain features or behaviors, not jokes/slang.
- Colors remain readable in dark theme and support text contrast.
- Journeys reflect realistic step names/order references.

## Common pitfalls

- Updating showcase content but forgetting tutorial parity.
- Adding drilldown refs without creating the target view.
- Breaking locale-specific loaders by only changing one variant.
- Reintroducing placeholder IDs/names that weaken the product demo.
