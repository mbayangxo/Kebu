-- Real security-signal log for the Kebu Record admin portal (/admin/record).
-- Written by server-side enforcement points (CSRF rejection, auth rate-limit
-- trips, admin login failures) via lib/platform/security-events.ts, never by
-- a client. No anon/authenticated policies exist on purpose — only the
-- service-role key (used by the admin API and crons) can read or write this
-- table; RLS stays enabled with zero grants as a fail-closed default.

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'csrf_rejected',
    'auth_rate_limited',
    'admin_login_failed'
  )),
  source text not null, -- request path or route identifier, not free text from the client
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_at_idx on public.security_events (created_at desc);
create index if not exists security_events_type_idx on public.security_events (event_type, created_at desc);

alter table public.security_events enable row level security;
-- Intentionally no policies: service_role bypasses RLS; anon/authenticated get zero access.
