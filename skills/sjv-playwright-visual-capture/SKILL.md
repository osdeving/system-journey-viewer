---
name: sjv-playwright-visual-capture
description: Use when capturing or regenerating System Journey Viewer visual demos and screenshots with Playwright, including local dev server setup, deterministic showcase loading, presentation/journey playback automation, and media artifact validation for README/docs/help gallery.
---

# SJV Playwright Visual Capture

Use this skill when generating screenshots/videos/GIF-friendly source captures for demos, README assets, or regression evidence.

## Scope

Typical files and tools:

- `scripts/capture-readme-demo.mjs`
- `docs/*` media assets (GIF/MP4/webm/png)
- `apps/web/public/gallery/*` (in-app export gallery assets)
- Playwright + local `apps/web` dev server

## Default workflow

1. Clarify the capture target:
   - README demo, gallery asset, bug/regression screenshot, tutorial material.
2. Start the app deterministically:
   - `npm --workspace @sjv/web run dev -- --host 127.0.0.1 --port <port>`
3. Use a stable seed/input where possible:
   - load showcase/tutorial preset,
   - set intended theme/view/journey/presentation mode,
   - minimize incidental UI state differences (menus/tooltips/docks).
4. Capture using existing automation when available:
   - prefer `scripts/capture-readme-demo.mjs` and adapt params/env before creating new scripts.
5. Validate output artifacts:
   - file generated at expected path,
   - dimensions/visibility are sane,
   - no obvious clipped menus/toolbars or loading overlays in final frame(s).
6. If artifact replaces a documented asset:
   - update references in `README.md`, `help.md`, or gallery paths if filenames changed.
7. Record exact commands in `docs/WORKLOG.md` when part of a feature/task delivery.

## Commands (common)

```bash
npm --workspace @sjv/web run dev -- --host 127.0.0.1 --port 4173
npm install --no-save playwright
npm exec playwright install chromium
DEMO_URL=http://127.0.0.1:4173 node scripts/capture-readme-demo.mjs
```

## Determinism tips

- Prefer localhost with fixed host/port.
- Hide transient menus/popovers before final capture unless they are the subject.
- Trigger presentation mode or focus mode consistently if the goal is clean export visuals.
- Capture after animations stabilize unless showing animation is the goal.

## Common pitfalls

- Capturing while splash screen or loading state is still visible.
- Using a random/local edited workspace instead of showcase/tutorial.
- Updating media assets without updating README/help/gallery references.
- Creating new capture scripts when an existing script only needs small parameterization.
