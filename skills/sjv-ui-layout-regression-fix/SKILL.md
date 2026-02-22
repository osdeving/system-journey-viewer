---
name: sjv-ui-layout-regression-fix
description: Use when fixing System Journey Viewer frontend layout regressions in apps/web, especially menubar, toolbar rows, topbar sizing, dock/workbench clipping, overflow, wrapping, and viewport-dependent UI shell issues.
---

# SJV UI Layout Regression Fix

Use this skill for desktop shell layout bugs in `apps/web` such as:

- menu dropdowns clipped or hidden,
- toolbar labels/buttons cut off,
- topbar height mis-sizing,
- dock/workbench overlap or clipping,
- canvas area shifted by incorrect shell row sizing.

## Default workflow

1. Reproduce the symptom from screenshot/report.
2. Identify whether the root cause is:
   - CSS overflow/wrapping,
   - fixed grid row sizing,
   - content measurement (e.g., `scrollHeight` vs rendered height),
   - persisted UI state interaction.
3. Inspect likely hotspots:
   - `apps/web/src/App.tsx`
   - `apps/web/src/App.css`
   - `apps/web/src/layout/*`
   - `apps/web/src/App.styles.test.ts`
4. Prefer the smallest root-cause fix over visual masking.
5. Add regression coverage:
   - CSS style assertion in `App.styles.test.ts` for deterministic style contracts, and/or
   - extract a small layout helper into `src/layout/*` and unit test it.
6. Run validations:
   - `npm --workspace @sjv/web run lint`
   - `npm --workspace @sjv/web run test:run`
   - `npm --workspace @sjv/web run build`
7. Update `docs/WORKLOG.md` and `docs/AI_STATE.md` when behavior/workflow changed.

## Common pitfalls

- Fixing dropdown clipping by changing only child z-index when the parent has `overflow: hidden`.
- Measuring topbar height with `getBoundingClientRect()` only when content can wrap.
- Using fixed grid row heights for shells with dynamic menubar/toolbar rows.
- Restoring horizontal scrolling while breaking menu dropdown visibility.

## Done criteria (layout fix)

- Menubar dropdowns visible.
- Toolbar text/buttons fully readable at narrow and wide widths.
- Dock/workbench still functional in all positions.
- Regression test added for the actual root cause when feasible.
