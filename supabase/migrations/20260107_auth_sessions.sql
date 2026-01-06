create extension if not exists pgcrypto;
create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked boolean not null default false
);

alter table public.auth_sessions enable row level security;

create index if not exists idx_auth_sessions_user_id on public.auth_sessions (user_id);
create unique index if not exists idx_auth_sessions_token_hash on public.auth_sessions (token_hash);

drop policy if exists "allow read own sessions" on public.auth_sessions;
drop policy if exists "allow insert service" on public.auth_sessions;
drop policy if exists "allow update service" on public.auth_sessions;

create policy "allow read own sessions"
on public.auth_sessions
for select
to authenticated
using (auth.uid() = user_id);

create policy "allow insert service"
on public.auth_sessions
for insert
to service_role
with check (true);

create policy "allow update service"
on public.auth_sessions
for update
to service_role
using (true);

create or replace function public.add_auth_session(p_user_id uuid, p_token_hash text, p_expires_at timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.auth_sessions (user_id, token_hash, expires_at, revoked)
  values (p_user_id, p_token_hash, p_expires_at, false);
$$;
grant execute on function public.add_auth_session(uuid, text, timestamptz) to anon, authenticated;

create or replace function public.rotate_auth_session(p_old_token_hash text, p_user_id uuid, p_new_token_hash text, p_expires_at timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.auth_sessions set revoked = true, last_seen_at = now() where token_hash = p_old_token_hash;
  insert into public.auth_sessions (user_id, token_hash, expires_at, revoked)
  values (p_user_id, p_new_token_hash, p_expires_at, false);
$$;
grant execute on function public.rotate_auth_session(text, uuid, text, timestamptz) to anon, authenticated;

create or replace function public.revoke_auth_session(p_token_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.auth_sessions set revoked = true where token_hash = p_token_hash;
$$;
grant execute on function public.revoke_auth_session(text) to anon, authenticated;

create or replace function public.revoke_all_sessions_for_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.auth_sessions set revoked = true where user_id = p_user_id;
$$;
grant execute on function public.revoke_all_sessions_for_user(uuid) to anon, authenticated;

create or replace function public.get_session_by_token(p_token_hash text)
returns table(user_id uuid, created_at timestamptz, last_seen_at timestamptz, expires_at timestamptz, revoked boolean, token_hash text)
language sql
security definer
set search_path = public
as $$
  select s.user_id, s.created_at, s.last_seen_at, s.expires_at, s.revoked, s.token_hash
  from public.auth_sessions s
  where s.token_hash = p_token_hash
  limit 1;
$$;
grant execute on function public.get_session_by_token(text) to anon, authenticated;
