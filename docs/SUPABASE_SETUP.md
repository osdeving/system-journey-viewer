# Supabase Setup

Purpose: bootstrap the current `apps/web` Supabase integration for manual auth plus cloud workspace save/load.

## What the app expects

- A Supabase project with:
  - `Authentication` enabled for email/password
  - a `workspaces` table in Postgres
- Public browser variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

The Vite build in this repo also bridges the safe Vercel integration values (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_*` public aliases) into the browser bundle, so you do not need to expose secret keys.

## Supabase Console Steps

1. Create or open your project.
2. In `Authentication > Providers`, enable `Email`.
3. In `Authentication > URL Configuration`, add:
   - your local URL (`http://localhost:5173`)
   - your Vercel production URL
   - your Vercel preview URL pattern if you use previews
4. In `Authentication > Users`, create your own user (and any invited testers) manually for now.
5. Open `SQL Editor`, paste the SQL below, and run it once.

## SQL Bootstrap

```sql
create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id text not null,
  name text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_user_workspace_unique unique (user_id, workspace_id)
);

alter table public.workspaces enable row level security;

drop policy if exists "Users manage their own workspaces" on public.workspaces;

create policy "Users manage their own workspaces"
on public.workspaces
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## Local Environment

Create `apps/web/.env.local` from `apps/web/.env.example` and fill:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

## Vercel Environment

For Vercel, either:

1. set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` directly, or
2. use the Supabase integration and let this repo’s Vite config bridge the safe public values automatically.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Current App Surface

The current integration is intentionally small:

- `Preferences > Supabase Cloud`
  - sign in / sign out
  - save current workspace snapshot to cloud
  - load the cloud copy of the current workspace id
- `File` menu
  - `Save to Supabase Cloud`
  - `Load from Supabase Cloud`

This first slice stores one cloud record per `(user_id, workspace_id)` and keeps local browser persistence as the primary fallback.
