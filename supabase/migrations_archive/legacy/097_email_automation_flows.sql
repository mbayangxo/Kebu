-- E1: Email automation flows — Klaviyo-style triggered sequences
-- Triggers: subscribe, order_placed, cart_abandoned
-- Each flow has ordered steps with delay_hours between them.
-- The cron job /api/cron/process-email-flows processes due enrollments every hour.

-- ── Flows ────────────────────────────────────────────────────────────────────
create table if not exists public.email_flows (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  trigger_type  text not null check (trigger_type in ('subscribe', 'order_placed', 'cart_abandoned')),
  status        text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  from_email    text not null default '' check (char_length(from_email) <= 254),
  from_name     text not null default '' check (char_length(from_name) <= 120),
  reply_to      text check (reply_to is null or char_length(reply_to) <= 254),
  created_by    uuid not null references auth.users(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists email_flows_business_idx
  on public.email_flows (business_id, trigger_type, status);

-- ── Steps ────────────────────────────────────────────────────────────────────
create table if not exists public.email_flow_steps (
  id           uuid primary key default gen_random_uuid(),
  flow_id      uuid not null references public.email_flows(id) on delete cascade,
  sort_order   integer not null default 0,
  -- Hours to wait after previous step (or enrollment for step 0)
  delay_hours  integer not null default 0 check (delay_hours >= 0 and delay_hours <= 8760),
  subject      text not null default '' check (char_length(subject) <= 200),
  body_html    text not null default '' check (char_length(body_html) <= 50000),
  body_text    text not null default '' check (char_length(body_text) <= 20000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists email_flow_steps_flow_idx
  on public.email_flow_steps (flow_id, sort_order);

-- ── Enrollments ──────────────────────────────────────────────────────────────
create table if not exists public.email_flow_enrollments (
  id               uuid primary key default gen_random_uuid(),
  flow_id          uuid not null references public.email_flows(id) on delete cascade,
  business_id      uuid not null,
  subscriber_email text not null check (char_length(subscriber_email) between 3 and 254),
  subscriber_name  text check (subscriber_name is null or char_length(subscriber_name) <= 120),
  subscriber_id    uuid references public.business_email_subscribers(id) on delete set null,
  next_step_index  integer not null default 0,
  next_step_at     timestamptz not null default now(),
  status           text not null default 'active'
                    check (status in ('active', 'completed', 'unsubscribed', 'failed')),
  context          jsonb not null default '{}',
  enrolled_at      timestamptz not null default now(),
  unique (flow_id, subscriber_email)
);

create index if not exists email_flow_enrollments_due_idx
  on public.email_flow_enrollments (status, next_step_at)
  where status = 'active';

create index if not exists email_flow_enrollments_business_idx
  on public.email_flow_enrollments (business_id, flow_id, status);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.email_flows enable row level security;
alter table public.email_flow_steps enable row level security;
alter table public.email_flow_enrollments enable row level security;

drop policy if exists "Business members manage email_flows" on public.email_flows;
create policy "Business members manage email_flows"
  on public.email_flows for all
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = email_flows.business_id
        and bm.user_id = auth.uid()
    )
  );

drop policy if exists "Business members manage email_flow_steps" on public.email_flow_steps;
create policy "Business members manage email_flow_steps"
  on public.email_flow_steps for all
  using (
    exists (
      select 1 from public.email_flows f
      join public.business_members bm on bm.business_id = f.business_id
      where f.id = email_flow_steps.flow_id
        and bm.user_id = auth.uid()
    )
  );

drop policy if exists "Business members manage email_flow_enrollments" on public.email_flow_enrollments;
create policy "Business members manage email_flow_enrollments"
  on public.email_flow_enrollments for all
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = email_flow_enrollments.business_id
        and bm.user_id = auth.uid()
    )
  );
