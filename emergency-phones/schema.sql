-- UCAPS Emergency Phone Testing — Supabase schema
-- Requires the shared ucaps_users table and ucaps_private helpers (see register-tracker/schema.sql).
--
-- The phone roster lives ONLY in these tables — never in the repo or in page source.
-- Seed it through the Admin Console (Roster → Import) or a one-off SQL script kept outside git.
--
-- Two tables on purpose: Postgres can't hide individual columns with RLS, so
--   ep_phones         → what a field tester needs (where the phone is)   : any approved tester can read
--   ep_phone_details  → extension, brand, model, connectivity, notes      : admins only

-- ───────────── Part 1: tables + row level security ─────────────

create table if not exists public.ep_phones (
  id         text primary key,
  ord        integer,                         -- testing order (null = last)
  loc        text not null,
  campus     text,
  building   text,
  floor      text,
  intext     text check (intext in ('Interior','Exterior')),
  lat        double precision check (lat between -90 and 90),
  lng        double precision check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- belt and braces: no network addresses in anything a tester can read
  constraint ep_phones_no_addr check (
    concat_ws(' ', loc, campus, building, floor)
      !~ '([0-9]{1,3}\.){3}[0-9]{1,3}|([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}')
);

create table if not exists public.ep_phone_details (
  id         text primary key references public.ep_phones(id) on delete cascade,
  ext        text,
  brand      text,
  model      text,
  conn       text,
  mount      text,
  buttons    text,
  cameras    text,
  speakers   text,
  notes      text,
  updated_at timestamptz not null default now(),
  -- IP / MAC addresses are never stored, even in admin notes
  constraint ep_details_no_addr check (
    concat_ws(' ', ext, brand, model, conn, mount, notes)
      !~ '([0-9]{1,3}\.){3}[0-9]{1,3}|([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}')
);

create or replace function public.ep_touch() returns trigger language plpgsql
set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function public.ep_touch() from public, anon, authenticated;
drop trigger if exists ep_phones_touch on public.ep_phones;
create trigger ep_phones_touch before update on public.ep_phones for each row execute function public.ep_touch();
drop trigger if exists ep_details_touch on public.ep_phone_details;
create trigger ep_details_touch before update on public.ep_phone_details for each row execute function public.ep_touch();

alter table public.ep_phones        enable row level security;
alter table public.ep_phone_details enable row level security;

drop policy if exists "approved read phones" on public.ep_phones;
drop policy if exists "admins add phones"    on public.ep_phones;
drop policy if exists "admins edit phones"   on public.ep_phones;
drop policy if exists "admins remove phones" on public.ep_phones;
create policy "approved read phones" on public.ep_phones for select to authenticated using ((select ucaps_private.is_approved()));
create policy "admins add phones"    on public.ep_phones for insert to authenticated with check ((select ucaps_private.is_admin()));
create policy "admins edit phones"   on public.ep_phones for update to authenticated using ((select ucaps_private.is_admin())) with check ((select ucaps_private.is_admin()));
create policy "admins remove phones" on public.ep_phones for delete to authenticated using ((select ucaps_private.is_admin()));

drop policy if exists "admins only" on public.ep_phone_details;
create policy "admins only" on public.ep_phone_details for all to authenticated
  using ((select ucaps_private.is_admin())) with check ((select ucaps_private.is_admin()));

revoke all on public.ep_phones, public.ep_phone_details from anon;

-- ───────────── Part 2 (optional): tester-only accounts ─────────────
-- Today ucaps_users is one list for every UCAPS tool, so anyone approved to test phones can also
-- read budget / payroll / RMA data stored in ucaps_store. This adds an optional `tools` list:
--   tools IS NULL                    → full access (every existing user keeps working unchanged)
--   tools = '{emergency-phones}'     → can sign in, but only reaches emergency-phone data
-- Apply only when you're ready to add field testers to the approved list.

-- alter table public.ucaps_users add column if not exists tools text[];
--
-- -- "approved" now means full access (existing behaviour for all current users, whose tools is null)
-- create or replace function ucaps_private.is_approved()
-- returns boolean language sql stable security definer set search_path = '' as $$
--   select exists (select 1 from public.ucaps_users u
--                  where u.email = lower(coalesce(auth.jwt() ->> 'email', '')) and u.tools is null);
-- $$;
-- -- can use the phone-testing tool (full-access users + tester-only users)
-- create or replace function ucaps_private.is_ep_user()
-- returns boolean language sql stable security definer set search_path = '' as $$
--   select exists (select 1 from public.ucaps_users u
--                  where u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
--                    and (u.tools is null or 'emergency-phones' = any(u.tools)));
-- $$;
-- revoke all on function ucaps_private.is_ep_user() from public, anon;
-- grant execute on function ucaps_private.is_ep_user() to authenticated;
--
-- -- everyone can read their own row (the sign-in gate needs it)
-- drop policy if exists "approved users read users" on public.ucaps_users;
-- create policy "approved users read users" on public.ucaps_users for select to authenticated
--   using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or (select ucaps_private.is_approved()));
--
-- -- testers may touch only the phone-testing keys in the shared store
-- drop policy if exists "approved users" on public.ucaps_store;
-- create policy "approved users" on public.ucaps_store for all to authenticated
--   using  ((select ucaps_private.is_approved()) or ((select ucaps_private.is_ep_user()) and key like 'ucaps\_ep\_%'))
--   with check ((select ucaps_private.is_approved()) or ((select ucaps_private.is_ep_user()) and key like 'ucaps\_ep\_%'));
--
-- -- testers can read the roster (ep_phones), still not the details
-- drop policy if exists "approved read phones" on public.ep_phones;
-- create policy "approved read phones" on public.ep_phones for select to authenticated using ((select ucaps_private.is_ep_user()));
