create table if not exists public.mail_platform_domains (
  domain text primary key,
  purpose text not null default 'personal_mail' check (purpose in ('personal_mail','transactional','system')),
  provider text not null default 'resend',
  provider_domain_id text,
  status text not null default 'pending' check (status in ('pending','verified','failed')),
  sending_enabled boolean not null default false,
  inbound_enabled boolean not null default false,
  reputation_status text not null default 'warming' check (reputation_status in ('warming','healthy','watch','paused')),
  dns_records jsonb not null default '[]'::jsonb,
  last_error text,
  delivered_count bigint not null default 0,
  hard_bounce_count bigint not null default 0,
  complaint_count bigint not null default 0,
  delayed_count bigint not null default 0,
  suppressed_count bigint not null default 0,
  last_provider_event_at timestamptz,
  last_health_check_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_platform_domains_lower check (domain=lower(domain))
);
insert into public.mail_platform_domains(domain,purpose,provider,status,sending_enabled,inbound_enabled)
values ('kebu.africa','personal_mail','resend','pending',false,false) on conflict(domain) do nothing;

create table if not exists public.mail_operational_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info','warning','critical')),
  alert_type text not null,
  provider text,
  mailbox_id uuid references public.mailboxes(id) on delete cascade,
  domain text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists mail_operational_alerts_open_idx on public.mail_operational_alerts(severity,created_at desc) where resolved_at is null;
alter table public.mail_platform_domains enable row level security;
alter table public.mail_operational_alerts enable row level security;
revoke all on public.mail_platform_domains, public.mail_operational_alerts from anon,authenticated;
grant all on public.mail_platform_domains, public.mail_operational_alerts to service_role;
