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

