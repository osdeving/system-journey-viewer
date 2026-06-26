# Database Providers

Purpose: document the provider-neutral persistence contract used by workspace cloud features.

## Contract

The app persists the same feature set through every provider:

- account session for manual sign-in/sign-out,
- workspace snapshots keyed by `(user, workspace id)`,
- generated `SJV Script` rows keyed by `(user, workspace id)`,
- private gallery assets with metadata plus `PNG`, `GIF`, and `MP4` blobs,
- preview/download/delete operations used by `Help > Export Gallery` and export auto-upload.

The UI consumes `WorkspaceCloudStore`; providers implement the storage details behind that interface.

## Local Browser Database

Use a local IndexedDB database with:

```bash
VITE_SJV_DB_URL=indexeddb://sjv-local
```

Changing the URL database name creates or opens another local database:

```bash
VITE_SJV_DB_URL=indexeddb://feature-lab
```

When Supabase env vars are absent, the app falls back to `indexeddb://sjv-local` automatically so cloud-dependent features can be tested without a Supabase account. Local sign-in is a lightweight browser-only account gate; it uses the email to scope records and requires a non-empty password to keep the same UI contract.

## Supabase

Supabase remains the hosted provider. Configure:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

If `VITE_SJV_DB_URL` is present, it takes precedence over Supabase so local feature testing is explicit and reversible.

## Remote Database URLs

Do not put raw `postgres://`, `mysql://`, or service-role URLs in the browser bundle. The resolver intentionally disables unsupported direct database URLs. A future remote provider should add a backend/gateway adapter that preserves the `WorkspaceCloudStore` contract and accepts a server-side database URL outside the browser.
