-- Standalone consumer broadcasts; no links to workspace Rooms or team membership.
create table public.kebu_live_broadcasts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  ended_at timestamptz
);
create unique index kebu_live_one_open_broadcast
  on public.kebu_live_broadcasts(host_id) where ended_at is null;
create index kebu_live_discovery on public.kebu_live_broadcasts(created_at desc)
  where ended_at is null;
create table public.kebu_live_reports (
  broadcast_id uuid not null references public.kebu_live_broadcasts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('harassment','sexual_content','violence','spam','other')),
  created_at timestamptz not null default now(),
  primary key (broadcast_id, reporter_id)
);
alter table public.kebu_live_broadcasts enable row level security;
alter table public.kebu_live_reports enable row level security;
revoke all on public.kebu_live_broadcasts, public.kebu_live_reports from public, anon, authenticated;
grant select, insert, update on public.kebu_live_broadcasts to service_role;
grant select, insert on public.kebu_live_reports to service_role;
