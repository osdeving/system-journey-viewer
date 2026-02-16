# @sjv/web

Web editor for System Journey Viewer.

## Stack

- React 19
- TypeScript
- Vite
- Zustand
- Monaco Editor (`JourneyScript` DSL)

## Development

From repository root:

```bash
npm install
npm --workspace @sjv/web run dev
```

Or use the root shortcut:

```bash
npm run dev
```

## Build

```bash
npm --workspace @sjv/web run build
```

## Test

```bash
npm --workspace @sjv/web run test:run
```

## Lint

```bash
npm --workspace @sjv/web run lint
```

## Vercel

The project is configured for Vercel in the repository root (`vercel.json`).
The output directory is `apps/web/dist`.

## Related Docs

- `../../README.md`
- `../../docs/UI_JOURNEYS_CAPABILITIES.md`
- `../../docs/DSL_LITE_SPEC.md`
