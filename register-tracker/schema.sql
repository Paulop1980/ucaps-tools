-- UCAPS Register Tracker — Supabase schema
-- Every table is locked to signed-in users whose email is in ucaps_users.
-- The public (anon) key alone can read nothing.

-- Permission checks live in a private schema so they aren't exposed as API endpoints.
create schema if not exists ucaps_private;
revoke all on schema ucaps_private from public, anon;
grant usage on schema ucaps_private to authenticated;

-- ---------- approved users (shared by every UCAPS tool) ----------
create table if not exists public.ucaps_users (
  email      text primary key check (email = lower(email)),
  name       text,
  is_admin   boolean not null default false,
  added_at   timestamptz not null default now()
);

create or replace function ucaps_private.is_approved()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ucaps_users u
                 where u.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function ucaps_private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ucaps_users u
                 where u.email = lower(coalesce(auth.jwt() ->> 'email', '')) and u.is_admin);
$$;

revoke all on function ucaps_private.is_approved() from public, anon;
revoke all on function ucaps_private.is_admin()   from public, anon;
grant execute on function ucaps_private.is_approved() to authenticated;
grant execute on function ucaps_private.is_admin()   to authenticated;

-- ---------- devices (fields keyed by the source CSV column names) ----------
create table if not exists public.reg_devices (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'pos' check (type in ('pos','otc','terminal','printer')),
  active     boolean not null default true,
  fields     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reg_tests (
  id         uuid primary key default gen_random_uuid(),
  device_id  uuid not null references public.reg_devices(id) on delete cascade,
  tested_at  timestamptz not null default now(),
  tested_by  text,
  result     text not null check (result in ('pass','fail')),
  items      jsonb not null default '[]'::jsonb,
  notes      text
);
create index if not exists reg_tests_device_idx on public.reg_tests(device_id);

create table if not exists public.reg_issues (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid not null references public.reg_devices(id) on delete cascade,
  test_id     uuid references public.reg_tests(id) on delete set null,
  opened_at   timestamptz not null default now(),
  opened_by   text,
  title       text not null,
  detail      text,
  priority    text not null default 'normal' check (priority in ('high','normal','low')),
  ticket      text,
  status      text not null default 'open' check (status in ('open','waiting','resolved')),
  resolved_at timestamptz,
  log         jsonb not null default '[]'::jsonb
);
create index if not exists reg_issues_device_idx on public.reg_issues(device_id);
create index if not exists reg_issues_test_idx on public.reg_issues(test_id);

create table if not exists public.reg_history (
  id        uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.reg_devices(id) on delete cascade,
  at        timestamptz not null default now(),
  by        text,
  kind      text,
  note      text,
  changes   jsonb
);
create index if not exists reg_history_device_idx on public.reg_history(device_id);

create table if not exists public.reg_settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.reg_rounds (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  scope      jsonb not null default '{}'::jsonb,
  summary    jsonb
);

-- ---------- row level security ----------
alter table public.ucaps_users    enable row level security;
alter table public.reg_devices  enable row level security;
alter table public.reg_tests    enable row level security;
alter table public.reg_issues   enable row level security;
alter table public.reg_history  enable row level security;
alter table public.reg_settings enable row level security;
alter table public.reg_rounds   enable row level security;

create policy "approved users read users"  on public.ucaps_users for select to authenticated using ((select ucaps_private.is_approved()));
create policy "admins add users"           on public.ucaps_users for insert to authenticated with check ((select ucaps_private.is_admin()));
create policy "admins update users"        on public.ucaps_users for update to authenticated using ((select ucaps_private.is_admin())) with check ((select ucaps_private.is_admin()));
create policy "admins remove users"        on public.ucaps_users for delete to authenticated using ((select ucaps_private.is_admin()));

create policy "approved users" on public.reg_devices  for all to authenticated using ((select ucaps_private.is_approved())) with check ((select ucaps_private.is_approved()));
create policy "approved users" on public.reg_tests    for all to authenticated using ((select ucaps_private.is_approved())) with check ((select ucaps_private.is_approved()));
create policy "approved users" on public.reg_issues   for all to authenticated using ((select ucaps_private.is_approved())) with check ((select ucaps_private.is_approved()));
create policy "approved users" on public.reg_history  for all to authenticated using ((select ucaps_private.is_approved())) with check ((select ucaps_private.is_approved()));
create policy "approved users" on public.reg_rounds   for all to authenticated using ((select ucaps_private.is_approved())) with check ((select ucaps_private.is_approved()));
create policy "approved users read settings" on public.reg_settings for select to authenticated using ((select ucaps_private.is_approved()));
create policy "admins add settings"    on public.reg_settings for insert to authenticated with check ((select ucaps_private.is_admin()));
create policy "admins update settings" on public.reg_settings for update to authenticated using ((select ucaps_private.is_admin())) with check ((select ucaps_private.is_admin()));

revoke all on public.ucaps_users, public.reg_devices, public.reg_tests, public.reg_issues,
              public.reg_history, public.reg_settings, public.reg_rounds from anon;

-- ---------- live updates ----------
alter publication supabase_realtime add table
  public.reg_devices, public.reg_tests, public.reg_issues, public.reg_history,
  public.reg_settings, public.reg_rounds, public.ucaps_users;

-- First admin (edit before running on a fresh project). Register data is loaded
-- through the app's CSV import, never committed to this public repo.
-- insert into public.ucaps_users(email, name, is_admin) values ('you@uml.edu', 'Your Name', true);
