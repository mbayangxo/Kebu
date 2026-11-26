create table if not exists public.platform_staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('support','operations','admin','security')),
  active boolean not null default true,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, role)
);

create table if not exists public.support_access_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references auth.users(id),
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_role text not null check (staff_role in ('support','operations','admin','security')),
  reason text not null check (char_length(btrim(reason)) between 5 and 240),
  status text not null default 'active' check (status in ('active','ended','revoked','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  revoked_by uuid references auth.users(id),
  revoke_reason text
);

create index if not exists support_access_sessions_active_staff_project_idx
  on public.support_access_sessions(staff_user_id, project_id, expires_at)
  where status = 'active';

create table if not exists public.privileged_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_role text,
  action text not null,
  project_id uuid references public.projects(id) on delete set null,
  support_session_id uuid references public.support_access_sessions(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists privileged_audit_events_project_created_idx
  on public.privileged_audit_events(project_id, created_at desc);
create index if not exists privileged_audit_events_actor_created_idx
  on public.privileged_audit_events(actor_user_id, created_at desc);

alter table public.platform_staff_roles enable row level security;
alter table public.support_access_sessions enable row level security;
alter table public.privileged_audit_events enable row level security;

revoke all on public.platform_staff_roles from public, anon, authenticated;
revoke all on public.support_access_sessions from public, anon, authenticated;
revoke all on public.privileged_audit_events from public, anon, authenticated;
grant all on public.platform_staff_roles to service_role;
grant all on public.support_access_sessions to service_role;
grant all on public.privileged_audit_events to service_role;
