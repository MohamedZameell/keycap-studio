-- Custom (user-authored) colorways — cloud persistence for signed-in users.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- The anon key the app ships with can't run DDL, so this is a manual one-time step.
--
-- Row shape mirrors the client colorway JSON used everywhere else
-- (src/data/customColorways.js): { id, label, manufacturer, swatches, override }.
-- `id` is the client-generated, globally-unique "custom_<base36ts>_<rand>" — it
-- is the primary key so the same colorway upserts (not duplicates) across devices.

create table if not exists public.custom_colorways (
  id           text        primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  label        text        not null default 'My Colorway',
  manufacturer text        not null default '',
  swatches     jsonb       not null,
  override     jsonb       not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Fast "all my colorways" reads.
create index if not exists custom_colorways_user_id_idx
  on public.custom_colorways (user_id);

-- Each user sees and writes only their own rows.
alter table public.custom_colorways enable row level security;

drop policy if exists "own colorways - select" on public.custom_colorways;
create policy "own colorways - select" on public.custom_colorways
  for select using (auth.uid() = user_id);

drop policy if exists "own colorways - insert" on public.custom_colorways;
create policy "own colorways - insert" on public.custom_colorways
  for insert with check (auth.uid() = user_id);

drop policy if exists "own colorways - update" on public.custom_colorways;
create policy "own colorways - update" on public.custom_colorways
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own colorways - delete" on public.custom_colorways;
create policy "own colorways - delete" on public.custom_colorways
  for delete using (auth.uid() = user_id);
