-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- It creates the tables and the photo bucket for the Site Pin Logger.
--
-- Access model: anyone who has the website link can read, add, change and delete pins and photos.
-- That is what lets any crew member log from their own phone with no login. Keep the link private.

create table if not exists public.pins (
  id          text primary key,
  type        text not null check (type in ('brush','trash','tires')),
  lat         double precision not null,
  lng         double precision not null,
  acc         integer,
  logged_at   timestamptz not null default now(),
  address     text not null default '',
  addr_kind   text,
  edited      boolean not null default false,
  tire_count  integer,
  photo_path  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.tracks (
  id          text primary key,
  points      jsonb not null,
  miles       double precision,
  started_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- New Supabase projects don't give the public key access to new tables by default, so grant it.
-- (Row level security below is what decides what it may actually do.)
grant usage on schema public to anon;
grant select, insert, update, delete on public.pins, public.tracks to anon;

alter table public.pins   enable row level security;
alter table public.tracks enable row level security;

drop policy if exists "pins read"   on public.pins;
drop policy if exists "pins add"    on public.pins;
drop policy if exists "pins edit"   on public.pins;
drop policy if exists "pins remove" on public.pins;
create policy "pins read"   on public.pins for select to anon using (true);
create policy "pins add"    on public.pins for insert to anon with check (true);
create policy "pins edit"   on public.pins for update to anon using (true) with check (true);
create policy "pins remove" on public.pins for delete to anon using (true);

drop policy if exists "tracks read"   on public.tracks;
drop policy if exists "tracks add"    on public.tracks;
drop policy if exists "tracks edit"   on public.tracks;
drop policy if exists "tracks remove" on public.tracks;
create policy "tracks read"   on public.tracks for select to anon using (true);
create policy "tracks add"    on public.tracks for insert to anon with check (true);
create policy "tracks edit"   on public.tracks for update to anon using (true) with check (true);
create policy "tracks remove" on public.tracks for delete to anon using (true);

-- Photos: a public bucket, JPEG only, 10 MB max per photo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg'];

drop policy if exists "photos read"   on storage.objects;
drop policy if exists "photos add"    on storage.objects;
drop policy if exists "photos edit"   on storage.objects;
drop policy if exists "photos remove" on storage.objects;
create policy "photos read"   on storage.objects for select to anon using (bucket_id = 'photos');
create policy "photos add"    on storage.objects for insert to anon with check (bucket_id = 'photos');
create policy "photos edit"   on storage.objects for update to anon using (bucket_id = 'photos') with check (bucket_id = 'photos');
create policy "photos remove" on storage.objects for delete to anon using (bucket_id = 'photos');
