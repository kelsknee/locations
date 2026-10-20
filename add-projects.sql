-- Adds projects (runs) to an existing setup. Safe to run more than once.
-- Run in Supabase: SQL Editor > New query > paste ALL of this > Run.

create table if not exists public.projects (
  id          text primary key,
  name        text not null,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.pins   add column if not exists project_id text;
alter table public.tracks add column if not exists project_id text;
create index if not exists pins_project_idx   on public.pins   (project_id);
create index if not exists tracks_project_idx on public.tracks (project_id);

grant select, insert, update, delete on public.projects to anon;
alter table public.projects enable row level security;

drop policy if exists "projects read"   on public.projects;
drop policy if exists "projects add"    on public.projects;
drop policy if exists "projects edit"   on public.projects;
drop policy if exists "projects remove" on public.projects;
create policy "projects read"   on public.projects for select to anon using (true);
create policy "projects add"    on public.projects for insert to anon with check (true);
create policy "projects edit"   on public.projects for update to anon using (true) with check (true);
create policy "projects remove" on public.projects for delete to anon using (true);
