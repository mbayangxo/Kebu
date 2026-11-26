-- Kebu Reach S10a: campaign drafts + tracked promote links (not ad delivery network)
-- Depends on: auth.users · optional create_designs · projects · businesses

create table if not exists public.reach_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  design_id uuid references public.create_designs(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  public_slug text not null unique
    check (public_slug ~ '^[a-z0-9-]{6,32}$'),
  destination_url text not null check (char_length(trim(destination_url)) between 8 and 500),
  creative_note text check (creative_note is null or char_length(creative_note) <= 500),
  budget_note text check (budget_note is null or char_length(budget_note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reach_campaigns_owner_idx
  on public.reach_campaigns (owner_id, updated_at desc);

create index if not exists reach_campaigns_slug_idx
  on public.reach_campaigns (public_slug);

create table if not exists public.reach_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.reach_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('open', 'click', 'share')),
  referrer text,
  device text check (device is null or device in ('desktop', 'tablet', 'mobile')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reach_campaign_events_campaign_idx
  on public.reach_campaign_events (campaign_id, created_at desc);

create index if not exists reach_campaign_events_type_idx
  on public.reach_campaign_events (campaign_id, event_type, created_at desc);

alter table public.reach_campaigns enable row level security;
alter table public.reach_campaign_events enable row level security;

drop policy if exists "Owners manage reach campaigns" on public.reach_campaigns;
create policy "Owners manage reach campaigns"
  on public.reach_campaigns for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners read reach campaign events" on public.reach_campaign_events;
create policy "Owners read reach campaign events"
  on public.reach_campaign_events for select
  using (
    exists (
      select 1 from public.reach_campaigns c
      where c.id = reach_campaign_events.campaign_id
        and c.owner_id = auth.uid()
    )
  );

-- Ingest events via service role API only (no client insert).

grant select, insert, update, delete on public.reach_campaigns to authenticated;
grant select on public.reach_campaign_events to authenticated;
grant all on public.reach_campaigns to service_role;
grant all on public.reach_campaign_events to service_role;

drop trigger if exists reach_campaigns_set_updated_at on public.reach_campaigns;
create trigger reach_campaigns_set_updated_at
  before update on public.reach_campaigns
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
