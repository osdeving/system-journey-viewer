# Supabase Setup

Purpose: bootstrap the current `apps/web` Supabase integration for manual auth plus cloud save/load for workspaces, generated scripts, and gallery files.

## What the app expects

- A Supabase project with:
  - `Authentication` enabled for email/password
  - `workspaces`, `scripts`, and `gallery_assets` tables in Postgres
  - a private Storage bucket named `gallery`
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
5. In `Storage`, create a new bucket named `gallery` and keep it `Private`.
6. Open `SQL Editor`, paste the SQL below, and run it once.

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

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scripts_user_workspace_unique unique (user_id, workspace_id)
);

create table if not exists public.gallery_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  file_name text not null,
  storage_path text not null,
  content_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.scripts enable row level security;
alter table public.gallery_assets enable row level security;

drop policy if exists "Users manage their own workspaces" on public.workspaces;
drop policy if exists "Users manage their own scripts" on public.scripts;
drop policy if exists "Users manage their own gallery metadata" on public.gallery_assets;

create policy "Users manage their own workspaces"
on public.workspaces
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their own scripts"
on public.scripts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their own gallery metadata"
on public.gallery_assets
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Gallery users insert into own folder" on storage.objects;
drop policy if exists "Gallery users read from own folder" on storage.objects;
drop policy if exists "Gallery users update own folder" on storage.objects;
drop policy if exists "Gallery users delete from own folder" on storage.objects;

create policy "Gallery users insert into own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery' and
  (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Gallery users read from own folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'gallery' and
  (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Gallery users update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'gallery' and
  (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'gallery' and
  (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Gallery users delete from own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gallery' and
  (storage.foldername(name))[1] = (select auth.uid()::text)
);
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

- top-right cloud badge
  - sign in / sign out without opening `Preferences`
  - quick save/load for the current workspace
  - shows auto-upload status for standard local `PNG` / `GIF` / `MP4` exports
  - local upload, refresh, and a shortcut into `Help > Export Gallery`
- `Preferences > Supabase Cloud`
  - the same manual auth/save/load controls remain available as a fallback
  - save/load the current workspace snapshot
  - save the generated SJV Script into a cloud row (and keep reusing that same row for later saves)
  - load from a numbered list of saved SJV Scripts for the signed-in user, replacing the current workspace just like `Open File`
  - upload local PNG/GIF/MP4 files into the private `gallery` bucket
  - list and download your recent gallery assets
- `Help > Export Gallery`
  - shows your live private gallery when signed in (using signed preview URLs for the private bucket)
  - focuses on viewing uploaded assets plus local upload / refresh actions
- `File` menu
  - `Save to Supabase Cloud`
  - `Load from Supabase Cloud`
  - `Save Script to Supabase Cloud`
  - `Load Script from Supabase Cloud`
  - `Upload Media to Supabase Gallery`
  - standard `Export PNG`, `Export GIF`, and `Export MP4` now auto-upload after the local file is generated when you are signed in

This slice stores one cloud record per `(user_id, workspace_id)` for both `workspaces` and `scripts`, keeps `gallery_assets` metadata in Postgres, and stores the file binaries in the private `gallery` bucket. Local browser persistence remains the primary fallback.
