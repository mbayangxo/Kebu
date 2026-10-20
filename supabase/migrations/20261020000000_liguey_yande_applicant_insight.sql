-- Kebu Liguey (K066) — Yande applicant insight (employer-side decision support).
--
-- Mapped before coding: confirmed via grep that Liguey had zero AI
-- integration anywhere (no reference to Anthropic, Yande, or any model
-- call in app/liguey, app/components/liguey, lib/liguey, app/api/liguey).
-- Deliberately does NOT build a numeric "match score" or percentage —
-- the recovered scope addendum explicitly lists a fabricated "70%
-- qualified" explanation as a prior proposal that is NOT automatically
-- approved. This stores a qualitative, clearly-AI-labeled note instead:
-- real strengths/questions grounded in the applicant's own real profile
-- and the listing's own real requirements, never a score.
--
-- One cached insight per application (unique on application_id);
-- regenerate overwrites in place rather than accumulating a history —
-- this is decision support for the current review, not an audit log.
-- Deliberately NOT visible to the applicant: unlike job_applications
-- itself (applicant-visible for their own row), this is an internal
-- employer note, closer to interview notes than to application status.
--
-- Generation is manager-gated (same ['founder','administrator',
-- 'store_manager'] list as every other Liguey employer-write check, for
-- the same confirmed DB-constraint-consistency reason given in
-- lib/liguey/assert-employer-manager.ts) because it costs a real model
-- call; reading a previously-generated insight is open to any active
-- business member, matching job_applications' own read policy.

create table public.liguey_applicant_insights (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  generated_by uuid not null references auth.users(id) on delete restrict,
  model text not null,
  summary text not null check (char_length(summary) between 1 and 4000),
  strengths text[] not null default '{}',
  questions_to_ask text[] not null default '{}',
  caution text not null default '' check (char_length(caution) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id)
);

create index liguey_applicant_insights_business_idx on public.liguey_applicant_insights (business_id, created_at desc);

drop trigger if exists liguey_applicant_insights_set_updated_at on public.liguey_applicant_insights;
create trigger liguey_applicant_insights_set_updated_at
  before update on public.liguey_applicant_insights
  for each row execute function public.set_updated_at();

alter table public.liguey_applicant_insights enable row level security;

create policy "Business members read applicant insights"
  on public.liguey_applicant_insights for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid() and m.status = 'active'
  ));

create policy "Business managers generate applicant insights"
  on public.liguey_applicant_insights for insert to authenticated
  with check (
    generated_by = auth.uid()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = liguey_applicant_insights.application_id and ja.business_id = liguey_applicant_insights.business_id
    )
    and exists (
      select 1 from public.business_members m
      where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

create policy "Business managers regenerate applicant insights"
  on public.liguey_applicant_insights for update to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ))
  with check (
    generated_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

revoke all on public.liguey_applicant_insights from anon;
grant select, insert, update on public.liguey_applicant_insights to authenticated;

-- Self-contained usage tracking, deliberately NOT depending on
-- account_ai_usage_events / reserve_account_ai_generation: confirmed
-- that the shared metering migration (20261010134141_atomic_account_ai_
-- reservations.sql) revokes privileges on a table no migration in this
-- repository's applied chain ever creates (it only exists in an
-- unapplied legacy script), so it cannot be relied on to even apply
-- cleanly on a fresh database, let alone meter correctly. That is a
-- pre-existing, cross-cutting bug outside Liguey's scope to fix here.
-- This mirrors Liguey's own existing self-contained pattern instead
-- (e.g. job_applications' own constraints) rather than the shop/
-- mail-style per-minute/day bucket tables, since this is a monthly
-- per-business cap, not a burst-rate limiter.
create table public.liguey_ai_usage (
  business_id uuid not null references public.businesses(id) on delete cascade,
  month_start date not null,
  generation_count integer not null default 0 check (generation_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, month_start)
);

alter table public.liguey_ai_usage enable row level security;

create policy "Business members read their AI usage"
  on public.liguey_ai_usage for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = liguey_ai_usage.business_id and m.user_id = auth.uid() and m.status = 'active'
  ));

revoke all on public.liguey_ai_usage from anon, authenticated;
grant select on public.liguey_ai_usage to authenticated;
grant all on public.liguey_ai_usage to service_role;

create or replace function public.liguey_reserve_ai_generation(p_business_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_month date := date_trunc('month', now() at time zone 'utc')::date;
  v_count integer;
begin
  insert into public.liguey_ai_usage(business_id, month_start, generation_count)
  values (p_business_id, v_month, 0)
  on conflict (business_id, month_start) do nothing;

  update public.liguey_ai_usage
  set generation_count = generation_count + 1, updated_at = now()
  where business_id = p_business_id and month_start = v_month and generation_count < p_limit
  returning generation_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.liguey_reserve_ai_generation(uuid, integer) from public, anon, authenticated;
grant execute on function public.liguey_reserve_ai_generation(uuid, integer) to service_role;
