# Decisions

## 2026-02-12 - SVG Engine Adapter (Option A)

- Context: the roadmap required a draw.io-like editor with full control over rendering/animation and no paid lock-in.
- Decision: implement an in-house SVG engine centered on `DiagramCanvas` plus a domain store.
- Consequence: higher flexibility for journey player, drill-down, and export; higher interaction-maintenance cost.

## 2026-02-12 - FULL Model as Source of Truth + Derived DSL LITE

- Context: the product needs persistent geometry and human-editable text.
- Decision: keep `WorkspaceModel` (FULL) as canonical state and convert DSL LITE at runtime.
- Consequence: simpler migration/versioning plus text import/export without coupling the editor core.

## 2026-02-12 - Journey Player in Global State

- Context: edge/node highlighting must stay synchronized with journey filters and drill-down navigation.
- Decision: keep player state in `useEditorStore`.
- Consequence: single reactive render pipeline with decoupled UI controls.

## 2026-02-13 - Codex Integration Through Server-Side Gateway

- Context: DSL assist was needed without exposing API keys in the browser.
- Decision: introduce `apps/codex-gateway` with `/api/codex/dsl-assist`.
- Consequence: secure and stateful integration (`threadId`) with slight operational overhead (two local processes).

## 2026-02-15 - Unified Multi-View DSL LITE with Hierarchy

- Context: previous DSL represented one view at a time and did not preserve explicit parent-child links or boundary grouping.
- Decision: evolve DSL LITE to a single multi-view file with:
  - `view <id> <kind>`
  - `parent <viewId> via <alias>`
  - `drilldown <viewId>` in node declarations
  - `contains a,b,c` for boundaries
- Consequence: visual and textual editing now preserve drill-down hierarchy and grouped boundaries with less semantic loss.

## 2026-02-16 - GitHub/Vercel Open-Source Readiness

- Context: project needed publication readiness for GitHub and deployment readiness for Vercel.
- Decision: add OSS governance docs (`CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `SUPPORT`, `LICENSE`), GitHub templates/workflows, and `vercel.json`.
- Consequence: clearer community onboarding, CI baseline for pull requests, and a documented deployment path.
