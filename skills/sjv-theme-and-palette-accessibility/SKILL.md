---
name: sjv-theme-and-palette-accessibility
description: Use when tuning System Journey Viewer light/dark themes, node/text color presets, palette defaults, and visual contrast/readability in canvas, inspector, showcase/tutorial examples, or desktop shell UI.
---

# SJV Theme And Palette Accessibility

Use this skill when adjusting colors, theme palettes, text colors, or contrast/readability in the app UI or showcased examples.

## Scope

Common files:

- `apps/web/src/App.tsx` (preset arrays, inspector color options, theme toggles)
- `apps/web/src/App.css` (theme tokens, shell colors, contrast-sensitive UI)
- `apps/web/src/model/defaultWorkspace.ts` / `showcaseWorkspace.ts` (showcase color examples)
- `apps/web/src/components/*` (node/edge label rendering if text color logic changed)
- tests like `App.styles.test.ts` or feature-specific tests if behavior is deterministic

## Goal

Improve visual quality without sacrificing readability, especially in dark mode and demo/showcase scenarios.

## Default workflow

1. Identify what is changing:
   - theme tokens,
   - node fill presets,
   - text color presets,
   - per-node text color support/rendering,
   - showcase/tutorial example palettes.
2. Preserve contrast first:
   - check white/light text against dark fills,
   - check dark text against light fills,
   - avoid “pretty but unreadable” combinations in defaults.
3. Keep preset intent clear:
   - distinct palettes for light and dark themes,
   - predictable ordering (common/recommended colors first),
   - avoid duplicate colors unless intentionally recent-history driven.
4. If showcase/tutorial acts as feature demo, ensure it visibly demonstrates:
   - node fill colors,
   - text color customization,
   - notes/colors in both themes when relevant.
5. Add/update tests when possible:
   - deterministic preset arrays/helpers,
   - style-token presence in CSS,
   - theme-preservation behavior in store/import flows if touched.
6. Validate:
   - `npm --workspace @sjv/web run lint`
   - `npm --workspace @sjv/web run test:run`
   - `npm --workspace @sjv/web run build`

## Manual visual checklist

1. Inspect in dark theme and light theme.
2. Verify selected presets remain readable with default node labels/subtitles.
3. Verify custom text color changes render on canvas and persist/export as expected.
4. Verify shell UI controls (menus/toolbars/preferences) remain readable after theme changes.
5. Verify showcase/tutorial examples still look intentional and not random.

## Common pitfalls

- Choosing palettes that look good on fills but fail with white text.
- Updating inspector presets without updating showcase examples (feature exists but not demonstrated).
- Changing theme tokens and unintentionally lowering contrast in menu/toolbars.
- Regressing import/theme-preservation behavior while testing color changes.
