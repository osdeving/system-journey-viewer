---
name: sjv-export-pipeline-validation
description: Use when changing System Journey Viewer export behavior (SVG, PNG, PDF, GIF, MP4, animated SVG) or presentation/player capture flows, including validation of export tests, capture state restoration, format-specific constraints, and demo-gallery impacts.
---

# SJV Export Pipeline Validation

Use this skill when a change touches export behavior or export-adjacent playback/presentation flows.

## Scope

Typical files/areas:

- `apps/web/src/export/*`
- `apps/web/src/App.tsx` (export actions, presentation mode, player state during capture)
- `apps/web/src/components/*` (rendered geometry used by exports)
- `apps/web/src/journeys/*` (timing/step sequencing affecting animated exports)
- `apps/web/public/gallery/*` and `docs/*` (if media references/examples are updated)

## Export modes to think about

- Static: `SVG`, `PNG`, `PDF`
- Animated: `GIF`, `MP4`, animated `SVG`
- Presentation mode / focused render behavior during capture

## Default workflow

1. Identify impacted export paths:
   - static rendering,
   - animated capture timing,
   - codec/media format support,
   - temporary UI state overrides/restoration.
2. Inspect existing tests first:
   - `apps/web/src/export/exporters.test.ts`
   - `apps/web/src/export/animatedExport.test.ts`
   - related player/journey tests if timing changed.
3. Implement the smallest change and preserve state restoration semantics.
4. Add/update tests for the changed behavior:
   - format support checks,
   - duration/timing assumptions,
   - export state restoration/fallback behavior.
5. If UI-triggered export flow changed, do a manual smoke pass:
   - start export from canvas/presentation,
   - verify export completes,
   - verify editor state returns to the prior mode/layout.
6. Validate:
   - `npm --workspace @sjv/web run lint`
   - `npm --workspace @sjv/web run test:run`
   - `npm --workspace @sjv/web run build`
7. Update docs/help/gallery references if user-visible behavior changed.

## Manual smoke checklist (export-focused)

1. Static export works for current view (`SVG` or `PNG` minimum).
2. Animated export starts and completes (`GIF` or `MP4` minimum, depending on change).
3. Export does not leave the app stuck in focused/presentation/export state.
4. Grid/edit-only overlays are omitted from output when expected.
5. Theme/background in exported output matches current expected behavior.

## Common pitfalls

- Fixing export output but forgetting to restore user UI state after capture.
- Changing player timing and breaking animated export duration assumptions.
- Silent codec fallback behavior for MP4.
- Updating gallery/help docs with stale filenames or formats.
