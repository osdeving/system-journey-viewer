# Contributing to System Journey Viewer

Thanks for contributing. This guide keeps contributions predictable and reviewable.

## Code of Conduct

By participating, you agree to follow `CODE_OF_CONDUCT.md`.

## Ways to Contribute

- Report bugs
- Propose features
- Improve docs and examples
- Submit fixes and tests

## Prerequisites

- Node.js 20+
- npm 10+

## Local Setup

```bash
npm install
npm run dev
```

Optional gateway for SJV Script assist:

```bash
npm run dev:gateway
```

## Branch Workflow

This repository uses temporary working branches for AI/assisted changes and structured development flows.

1. Create a branch from your target branch:

```bash
git checkout -b tmp/ai/<YYYYMMDD-HHMM>-<short-slug>
```

2. Implement and validate changes in that branch.
3. Promote changes to target branch via `cherry-pick` or `rebase` (no merge commit).
4. Remove temporary branch after promotion.

## Development Rules

- Keep changes small and focused.
- Prefer clear, explicit behavior over implicit magic.
- Add or update tests for behavior changes.
- Update docs when behavior or UX changes.

## Validation Checklist

Run before opening a pull request:

```bash
npm run lint
npm run test:run
npm run test:run:gateway
npm run build
```

## Pull Request Process

1. Ensure your branch is up to date.
2. Fill in the PR template completely.
3. Describe:
- what changed,
- why it changed,
- how it was validated,
- screenshots/GIFs for UI changes.
4. Keep PRs reviewable (prefer smaller PRs over very large mixed changes).

## Commit Message Guidance

Use clear, scoped messages, for example:

- `feat(web): add journey export speed controls`
- `fix(player): gate next step by visual arrival`
- `docs: rewrite SJV Script spec in English`

## Documentation Expectations

If you change product behavior or workflows, update:

- `README.md`
- `docs/UI_JOURNEYS_CAPABILITIES.md`
- `docs/SJV_SCRIPT_SPEC.md` (if SJV Script semantics changed)
- `docs/DECISIONS.md` (if architecture decisions changed)
- `docs/WORKLOG.md`
- `docs/AI_STATE.md` (if implementation state changed)

## Need Help?

Open a GitHub issue using the available templates.
