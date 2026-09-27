-- DATUM cloud schema for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, and Run. Safe to run again.
--
-- Invite only: an account can only be created for an email on public.invites (admins add them from the
-- app's Team screen). This applies to email/password and Google sign-in alike.
--
-- Roles (profiles.role):
--   viewer   - sees only projects shared with them: view, tick off rows, export PDFs.
--   editor   - can also create, edit, delete and share their own projects.
--   admin    - an editor who can also invite people and change roles (Team screen).
--   disabled - access removed; sees nothing.
-- Sharing is by email address. Done marks are never stored here; they stay on each device.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- invites
create table if not exists public.invites (
  email      text primary key check (email = lower(email) and position('@' in email) > 1),
  role       text not null default 'viewer' check (role in ('viewer','editor','admin')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- The first admin. Change this email if the admin changes.
insert into public.invites (email, role) values ('dane@vektorprojects.com', 'admin')
  on conflict (email) do update set role = 'admin';

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'viewer',
  created_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('viewer','editor','admin','disabled'));

-- Refuse to create an account for an email that has not been invited
create or replace function public.check_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.invites where email = lower(new.email)) then
    raise exception 'DATUM_NOT_INVITED: % has not been invited', new.email;
  end if;
  return new;
end $$;

drop trigger if exists before_auth_user_created on auth.users;
create trigger before_auth_user_created before insert on auth.users
  for each row execute function public.check_invite();

-- New accounts get the role they were invited with
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
    values (new.id, lower(new.email), coalesce((select role from public.invites where email = lower(new.email)), 'viewer'))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this script ran
insert into public.profiles (id, email)
  select id, lower(email) from auth.users where email is not null
  on conflict (id) do nothing;
update public.profiles p set role = 'admin' from public.invites i where i.email = p.email and i.role = 'admin' and p.role <> 'admin';

-- ---------------------------------------------------------------- helpers
-- security definer so policies can use them without recursing through each other's row security
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'disabled')
$$;

create or replace function public.my_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.can_author() returns boolean
language sql stable as $$ select public.my_role() in ('editor','admin') $$;

create or replace function public.has_access() returns boolean
language sql stable as $$ select public.my_role() in ('viewer','editor','admin') $$;

-- Lets editors check whether someone they share with can sign in yet
create or replace function public.is_invited(e text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_access() and exists (select 1 from public.invites where email = lower(e))
$$;

-- ---------------------------------------------------------------- projects
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  name        text not null default 'Untitled',
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects(owner);

create or replace function public.projects_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.owner := old.owner; new.owner_email := old.owner_email; new.created_at := old.created_at; end if;
  return new;
end $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before insert or update on public.projects
  for each row execute function public.projects_touch();

-- ---------------------------------------------------------------- shares
create table if not exists public.project_shares (
  project_id uuid not null references public.projects(id) on delete cascade,
  email      text not null check (email = lower(email) and position('@' in email) > 1),
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);
create index if not exists project_shares_email_idx on public.project_shares(email);

create or replace function public.owns_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = pid and owner = auth.uid())
$$;

create or replace function public.shared_with_me(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_shares where project_id = pid and email = public.my_email())
$$;

-- ---------------------------------------------------------------- row level security
alter table public.invites        enable row level security;
alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.project_shares enable row level security;

drop policy if exists "invites: admins manage" on public.invites;
create policy "invites: admins manage" on public.invites for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "profiles: read own, admins read all" on public.profiles;
create policy "profiles: read own, admins read all" on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "profiles: admins change roles" on public.profiles;
create policy "profiles: admins change roles" on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "projects: owner or shared can read" on public.projects;
create policy "projects: owner or shared can read" on public.projects for select to authenticated
  using (public.has_access() and (owner = auth.uid() or public.shared_with_me(id)));
drop policy if exists "projects: editors create their own" on public.projects;
create policy "projects: editors create their own" on public.projects for insert to authenticated
  with check (owner = auth.uid() and public.can_author());
drop policy if exists "projects: editors update their own" on public.projects;
create policy "projects: editors update their own" on public.projects for update to authenticated
  using (owner = auth.uid() and public.can_author()) with check (owner = auth.uid());
drop policy if exists "projects: editors delete their own" on public.projects;
create policy "projects: editors delete their own" on public.projects for delete to authenticated
  using (owner = auth.uid() and public.can_author());

drop policy if exists "shares: owner or recipient can read" on public.project_shares;
create policy "shares: owner or recipient can read" on public.project_shares for select to authenticated
  using (public.has_access() and (public.owns_project(project_id) or email = public.my_email()));
drop policy if exists "shares: editors share their own projects" on public.project_shares;
create policy "shares: editors share their own projects" on public.project_shares for insert to authenticated
  with check (public.owns_project(project_id) and public.can_author());
drop policy if exists "shares: owner removes, recipient leaves" on public.project_shares;
create policy "shares: owner removes, recipient leaves" on public.project_shares for delete to authenticated
  using (public.owns_project(project_id) or email = public.my_email());
