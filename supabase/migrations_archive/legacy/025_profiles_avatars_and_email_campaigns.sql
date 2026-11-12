-- Personal avatars, business logos, customer email capture, campaigns

alter table public.user_profiles
  add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);

alter table public.businesses
  add column if not exists logo_url text not null default '' check (char_length(logo_url) <= 500);

create table if not exists public.business_email_subscribers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  email text not null check (char_length(trim(email)) between 3 and 254),
  name text check (name is null or char_length(trim(name)) between 1 and 120),
  source text not null default 'site' check (source in ('site', 'manual', 'import')),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create index if not exists business_email_subscribers_business_idx
  on public.business_email_subscribers (business_id, created_at desc);

create table if not exists public.business_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  create_design_id uuid references public.create_designs(id) on delete set null,
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  body_html text not null default '' check (char_length(body_html) <= 50000),
  body_text text not null default '' check (char_length(body_text) <= 20000),
  from_name text not null default '' check (char_length(from_name) <= 120),
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  sent_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_email_campaigns_business_idx
  on public.business_email_campaigns (business_id, created_at desc);

create table if not exists public.business_email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.business_email_campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.business_email_subscribers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  unique (campaign_id, subscriber_id)
);

alter table public.business_email_subscribers enable row level security;
alter table public.business_email_campaigns enable row level security;
alter table public.business_email_campaign_recipients enable row level security;

drop policy if exists "Managers manage subscribers" on public.business_email_subscribers;
create policy "Managers manage subscribers"
  on public.business_email_subscribers for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_subscribers.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_subscribers.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Managers manage campaigns" on public.business_email_campaigns;
create policy "Managers manage campaigns"
  on public.business_email_campaigns for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_campaigns.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_campaigns.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Managers read campaign recipients" on public.business_email_campaign_recipients;
create policy "Managers read campaign recipients"
  on public.business_email_campaign_recipients for select
  using (
    exists (
      select 1 from public.business_email_campaigns c
      join public.business_members m on m.business_id = c.business_id
      where c.id = business_email_campaign_recipients.campaign_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop trigger if exists business_email_campaigns_set_updated_at on public.business_email_campaigns;
create trigger business_email_campaigns_set_updated_at
  before update on public.business_email_campaigns
  for each row execute function public.set_updated_at();
