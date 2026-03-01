# Decisions

## 2026-03-01 - Client-Side Supabase as the First Cloud Persistence Slice

- Context: the web app needed a low-friction hosted option for personal/tester auth plus cloud storage of workspace snapshots without introducing a custom backend.
- Decision: add an optional browser-side Supabase integration for manual email/password auth and per-user `EditorSnapshot` persistence, while keeping local browser persistence as the default offline-safe path.
- Consequence: cloud save/load can be enabled with only public Supabase config in Vercel/Vite, but the current slice intentionally remains manual (not autosynced) and depends on RLS-protected Supabase tables.

## 2026-02-20 - SJV Script v2 (Breaking) for Deterministic Edges and Ordered Journeys

- Context: the previous script format relied on source/target matching and numeric journey indices, which became ambiguous with parallel edges and prone to authoring errors.
- Decision: adopt a breaking SJV Script update with:
  - explicit edge IDs in edge declarations (`edgeId: from -> to : protocol "label"`),
  - journey steps defined only by edge IDs in file order (no numeric prefixes),
  - first-class `note` nodes attached by alias (`note note_id on target "text"`),
  - metadata edge layout keyed by edge ID.
- Consequence: parsing/import becomes deterministic for duplicate `A -> B` edges, journey authoring is less error-prone, and note semantics are explicitly modeled.

## 2026-02-12 - SVG Engine Adapter (Option A)

- Context: the roadmap required a draw.io-like editor with full control over rendering/animation and no paid lock-in.
- Decision: implement an in-house SVG engine centered on `DiagramCanvas` plus a domain store.
- Consequence: higher flexibility for journey player, drill-down, and export; higher interaction-maintenance cost.

## 2026-02-12 - FULL Model as Source of Truth + Derived SJV Script

- Context: the product needs persistent geometry and human-editable text.
- Decision: keep `WorkspaceModel` (FULL) as canonical state and convert SJV Script at runtime.
- Consequence: simpler migration/versioning plus text import/export without coupling the editor core.

## 2026-02-12 - Journey Player in Global State

- Context: edge/node highlighting must stay synchronized with journey filters and drill-down navigation.
- Decision: keep player state in `useEditorStore`.
- Consequence: single reactive render pipeline with decoupled UI controls.

## 2026-02-13 - Codex Integration Through Server-Side Gateway

- Context: SJV Script assist was needed without exposing API keys in the browser.
- Decision: introduce `apps/codex-gateway` with `/api/codex/dsl-assist`.
- Consequence: secure and stateful integration (`threadId`) with slight operational overhead (two local processes).

## 2026-02-15 - Unified Multi-View SJV Script with Hierarchy

- Context: previous script format represented one view at a time and did not preserve explicit parent-child links or boundary grouping.
- Decision: evolve SJV Script to a single multi-view file with:
  - `view <id> <kind>`
  - `parent <viewId> via <alias>`
  - `drilldown <viewId>` in node declarations
  - `contains a,b,c` for boundaries
- Consequence: visual and textual editing now preserve drill-down hierarchy and grouped boundaries with less semantic loss.

## 2026-02-16 - GitHub/Vercel Open-Source Readiness

- Context: project needed publication readiness for GitHub and deployment readiness for Vercel.
- Decision: add OSS governance docs (`CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `SUPPORT`, `LICENSE`), GitHub templates/workflows, and `vercel.json`.
- Consequence: clearer community onboarding, CI baseline for pull requests, and a documented deployment path.
