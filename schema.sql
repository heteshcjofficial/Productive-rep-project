-- ChronoSync API schema for Supabase PostgreSQL.
-- Run this in the Supabase SQL Editor before starting the API.
--
-- SECURITY WARNING:
-- The anon policies below intentionally match the requested public-anon
-- deployment mode. They allow anyone with the public anon key to read and
-- modify all rows, including personal reflections. This is suitable only for
-- a disposable demo with non-sensitive data. Before using real accounts or
-- personal data, remove these policies and add Supabase Auth user_id columns
-- plus auth.uid()-scoped policies. CORS is not an access-control mechanism.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  phase text not null check (phase in ('dawn', 'peak', 'twilight', 'nocturne')),
  strain text not null default 'med' check (strain in ('low', 'med', 'high')),
  duration text not null default '15m' check (duration ~ '^[0-9]{1,3}m$'),
  completed boolean not null default false,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_phase_created_at_idx on public.tasks (phase, created_at);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  category text not null default 'General',
  icon text not null default '🎯',
  streak integer not null default 0 check (streak >= 0),
  days boolean[] not null default array[false, false, false, false, false, false, false]::boolean[]
    check (array_length(days, 1) = 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retrospectives (
  id uuid primary key default gen_random_uuid(),
  date date not null unique default current_date,
  text text not null default '' check (char_length(text) <= 10000),
  mood integer check (mood between 1 and 100),
  energy integer check (energy between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retrospectives_date_idx on public.retrospectives (date desc);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  preset text not null check (preset in ('gamma', 'alpha', 'theta')),
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  completed boolean not null default true,
  started_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists focus_sessions_started_at_idx on public.focus_sessions (started_at desc);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'manual' check (provider in ('google', 'outlook', 'apple', 'manual')),
  provider_name text,
  title text not null check (char_length(title) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time text,
  is_protected boolean not null default false,
  cost text not null default 'med' check (cost in ('low', 'med', 'high')),
  attendees integer not null default 1 check (attendees >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists calendar_events_starts_at_idx on public.calendar_events (starts_at);
create index if not exists calendar_events_protected_time_idx on public.calendar_events (is_protected, starts_at, ends_at);

create table if not exists public.access_limits (
  singleton boolean primary key default true check (singleton = true),
  mode text not null default 'lifetime' check (mode in ('lifetime', 'custom')),
  days_limit integer not null default 99999 check (days_limit between 1 and 36500 or days_limit = 99999),
  start_date timestamptz not null default now(),
  unlocked_features text[] not null default array['all', 'multi-calendar', 'focus-studio', 'analytics']::text[],
  updated_at timestamptz not null default now()
);

insert into public.access_limits (singleton, mode, days_limit)
values (true, 'lifetime', 99999)
on conflict (singleton) do nothing;

-- Keep updated_at current for edits made through Supabase or SQL directly.
create or replace function public.chronosync_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.chronosync_set_updated_at();

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits
for each row execute function public.chronosync_set_updated_at();

drop trigger if exists retrospectives_set_updated_at on public.retrospectives;
create trigger retrospectives_set_updated_at before update on public.retrospectives
for each row execute function public.chronosync_set_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at before update on public.calendar_events
for each row execute function public.chronosync_set_updated_at();

drop trigger if exists access_limits_set_updated_at on public.access_limits;
create trigger access_limits_set_updated_at before update on public.access_limits
for each row execute function public.chronosync_set_updated_at();

-- Required by Supabase/PostgREST for requests made with the public anon key.
grant usage on schema public to anon;
grant select, insert, update, delete on public.tasks, public.habits, public.retrospectives,
  public.focus_sessions, public.calendar_events, public.access_limits to anon;

alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.retrospectives enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.access_limits enable row level security;

drop policy if exists "public anon access tasks" on public.tasks;
create policy "public anon access tasks" on public.tasks for all to anon using (true) with check (true);

drop policy if exists "public anon access habits" on public.habits;
create policy "public anon access habits" on public.habits for all to anon using (true) with check (true);

drop policy if exists "public anon access retrospectives" on public.retrospectives;
create policy "public anon access retrospectives" on public.retrospectives for all to anon using (true) with check (true);

drop policy if exists "public anon access focus sessions" on public.focus_sessions;
create policy "public anon access focus sessions" on public.focus_sessions for all to anon using (true) with check (true);

drop policy if exists "public anon access calendar events" on public.calendar_events;
create policy "public anon access calendar events" on public.calendar_events for all to anon using (true) with check (true);

drop policy if exists "public anon access access limits" on public.access_limits;
create policy "public anon access access limits" on public.access_limits for all to anon using (true) with check (true);
