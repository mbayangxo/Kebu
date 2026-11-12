-- Production mail delivery queue, retries, suppressions, quotas, routing, and provider health.

alter table public.mail_domains
  add column if not exists sending_enabled boolean not null default false,
  add column if not exists inbound_enabled boolean not null default false,
  add column if not exists reputation_status text not null default 'warming',
  add column if not exists delivered_count bigint not null default 0,
  add column if not exists hard_bounce_count bigint not null default 0,
  add column if not exists complaint_count bigint not null default 0,
  add column if not exists delayed_count bigint not null default 0,
  add column if not exists suppressed_count bigint not null default 0,
  add column if not exists last_provider_event_at timestamptz,
  add column if not exists last_health_check_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.mail_domains'::regclass
      and conname='mail_domains_reputation_status_check'
  ) then
    alter table public.mail_domains
      add constraint mail_domains_reputation_status_check
      check (reputation_status in ('warming','healthy','watch','paused'));
  end if;
end $$;

alter table public.mail_messages drop constraint if exists mail_messages_status_check;
alter table public.mail_messages add constraint mail_messages_status_check
  check (status in ('draft','queued','sent','received','failed','bounced','delivered','delivery_delayed','complained','suppressed'));

create table if not exists public.mail_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.mail_messages(id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  provider text not null default 'resend',
  status text not null default 'queued' check (status in ('queued','processing','retry','sent','failed','suppressed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 8 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  provider_message_id text,
  idempotency_key text not null unique,
  last_error_code text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mail_delivery_jobs_message_unique on public.mail_delivery_jobs(message_id) where status <> 'failed';
create index if not exists mail_delivery_jobs_ready_idx on public.mail_delivery_jobs(status,next_attempt_at,created_at) where status in ('queued','retry');
create index if not exists mail_delivery_jobs_provider_message_idx on public.mail_delivery_jobs(provider_message_id) where provider_message_id is not null;

create table if not exists public.mail_delivery_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  provider_message_id text,
  message_id uuid references public.mail_messages(id) on delete set null,
  event_type text not null,
  recipient text,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);
create index if not exists mail_delivery_events_provider_message_idx on public.mail_delivery_events(provider_message_id,occurred_at desc);
create index if not exists mail_delivery_events_message_idx on public.mail_delivery_events(message_id,occurred_at desc);

create table if not exists public.mail_suppressions (
  address text primary key,
  reason text not null check (reason in ('hard_bounce','complaint','manual','provider_suppressed')),
  source text not null default 'kebu',
  active boolean not null default true,
  event_count integer not null default 1 check (event_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint mail_suppressions_address_lower check (address = lower(address))
);
create index if not exists mail_suppressions_active_idx on public.mail_suppressions(address) where active=true;

create table if not exists public.mail_inbound_routes (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  address text not null unique,
  route_type text not null default 'alias' check (route_type in ('primary','alias')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_inbound_routes_address_lower check (address=lower(address))
);
create index if not exists mail_inbound_routes_mailbox_idx on public.mail_inbound_routes(mailbox_id,is_active);

create table if not exists public.mail_send_usage (
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  bucket_kind text not null check (bucket_kind in ('minute','day')),
  bucket_start timestamptz not null,
  message_count integer not null default 0,
  recipient_count integer not null default 0,
  byte_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key(mailbox_id,bucket_kind,bucket_start)
);
create index if not exists mail_send_usage_cleanup_idx on public.mail_send_usage(bucket_start);

create table if not exists public.mail_provider_health (
  provider text primary key,
  is_enabled boolean not null default true,
  priority integer not null default 100,
  consecutive_failures integer not null default 0,
  cooldown_until timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
insert into public.mail_provider_health(provider,is_enabled,priority) values ('resend',true,10) on conflict(provider) do nothing;

alter table public.mail_delivery_jobs enable row level security;
alter table public.mail_delivery_events enable row level security;
alter table public.mail_suppressions enable row level security;
alter table public.mail_inbound_routes enable row level security;
alter table public.mail_send_usage enable row level security;
alter table public.mail_provider_health enable row level security;

revoke all on public.mail_delivery_jobs, public.mail_delivery_events, public.mail_suppressions, public.mail_inbound_routes, public.mail_send_usage, public.mail_provider_health from anon, authenticated;
grant all on public.mail_delivery_jobs, public.mail_delivery_events, public.mail_suppressions, public.mail_inbound_routes, public.mail_send_usage, public.mail_provider_health to service_role;

create or replace function public.mail_reserve_send_quota(p_mailbox_id uuid,p_recipient_count integer,p_estimated_bytes bigint default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_type text; v_minute_message_limit integer; v_minute_recipient_limit integer;
  v_day_message_limit integer; v_day_recipient_limit integer;
  v_minute timestamptz:=date_trunc('minute',now()); v_day timestamptz:=date_trunc('day',now());
  v_row public.mail_send_usage%rowtype;
begin
  if p_recipient_count < 1 or p_recipient_count > 100 then raise exception 'MAIL_RECIPIENT_LIMIT'; end if;
  select mailbox_type into v_type from public.mailboxes where id=p_mailbox_id and is_active=true;
  if v_type is null then raise exception 'MAILBOX_NOT_ACTIVE'; end if;
  if v_type='personal' then
    v_minute_message_limit:=20; v_minute_recipient_limit:=50; v_day_message_limit:=500; v_day_recipient_limit:=1000;
  else
    v_minute_message_limit:=60; v_minute_recipient_limit:=250; v_day_message_limit:=5000; v_day_recipient_limit:=15000;
  end if;
  insert into public.mail_send_usage values (p_mailbox_id,'minute',v_minute,1,p_recipient_count,greatest(p_estimated_bytes,0),now())
  on conflict(mailbox_id,bucket_kind,bucket_start) do update set
    message_count=public.mail_send_usage.message_count+1,
    recipient_count=public.mail_send_usage.recipient_count+excluded.recipient_count,
    byte_count=public.mail_send_usage.byte_count+excluded.byte_count,
    updated_at=now()
  where public.mail_send_usage.message_count+1<=v_minute_message_limit
    and public.mail_send_usage.recipient_count+excluded.recipient_count<=v_minute_recipient_limit
  returning * into v_row;
  if not found then raise exception 'MAIL_RATE_LIMIT_MINUTE'; end if;
  insert into public.mail_send_usage values (p_mailbox_id,'day',v_day,1,p_recipient_count,greatest(p_estimated_bytes,0),now())
  on conflict(mailbox_id,bucket_kind,bucket_start) do update set
    message_count=public.mail_send_usage.message_count+1,
    recipient_count=public.mail_send_usage.recipient_count+excluded.recipient_count,
    byte_count=public.mail_send_usage.byte_count+excluded.byte_count,
    updated_at=now()
  where public.mail_send_usage.message_count+1<=v_day_message_limit
    and public.mail_send_usage.recipient_count+excluded.recipient_count<=v_day_recipient_limit
  returning * into v_row;
  if not found then raise exception 'MAIL_RATE_LIMIT_DAY'; end if;
  return jsonb_build_object('ok',true,'mailboxType',v_type,'minuteMessageLimit',v_minute_message_limit,'dayMessageLimit',v_day_message_limit);
end $$;
revoke all on function public.mail_reserve_send_quota(uuid,integer,bigint) from public,anon,authenticated;
grant execute on function public.mail_reserve_send_quota(uuid,integer,bigint) to service_role;

create or replace function public.claim_mail_delivery_jobs(p_worker_id text,p_limit integer default 25)
returns setof public.mail_delivery_jobs language plpgsql security definer set search_path=public,pg_temp as $$
begin
  return query
  with candidates as (
    select j.id from public.mail_delivery_jobs j
    where j.status in ('queued','retry') and j.next_attempt_at<=now()
      and (j.locked_at is null or j.locked_at<now()-interval '10 minutes')
    order by j.next_attempt_at,j.created_at
    for update skip locked
    limit least(greatest(p_limit,1),100)
  )
  update public.mail_delivery_jobs j
  set status='processing',locked_at=now(),locked_by=p_worker_id,attempt_count=j.attempt_count+1,updated_at=now()
  from candidates c where j.id=c.id returning j.*;
end $$;
revoke all on function public.claim_mail_delivery_jobs(text,integer) from public,anon,authenticated;
grant execute on function public.claim_mail_delivery_jobs(text,integer) to service_role;

create or replace function public.cleanup_mail_operational_data()
returns void language sql security definer set search_path=public,pg_temp as $$
  delete from public.mail_send_usage where bucket_start<now()-interval '8 days';
$$;
revoke all on function public.cleanup_mail_operational_data() from public,anon,authenticated;
grant execute on function public.cleanup_mail_operational_data() to service_role;
