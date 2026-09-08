-- =============================================================================
-- APPLY_055_THROUGH_076.sql
-- Paste once in Supabase → SQL Editor → Run
-- Safe-ish to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS where used)
-- Requires Phase One foundation + earlier shop migrations already applied.
-- =============================================================================


-- >>> BEGIN 055_team_invites_demo_orders.sql (supabase/migrations/055_team_invites_demo_orders.sql)

-- 055 team invites + agency roles + shop demo orders channel
-- Apply after 054. Safe to re-run.

-- >>> Expand business_members roles (agency managers / creatives)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'business_members_role_check'
  ) then
    alter table public.business_members drop constraint business_members_role_check;
  end if;
  alter table public.business_members
    add constraint business_members_role_check
    check (role in (
      'founder', 'cofounder', 'beneficial_owner', 'director', 'administrator',
      'finance_manager', 'store_manager', 'manager', 'creative', 'developer',
      'designer', 'employee', 'accountant', 'legal_representative', 'viewer'
    ));
exception
  when duplicate_object then null;
end $$;

-- >>> Team invites (email + role + token; accept creates membership)
create table if not exists public.business_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  role text not null
    check (role in (
      'cofounder', 'administrator', 'finance_manager', 'store_manager',
      'manager', 'creative', 'developer', 'designer', 'employee',
      'accountant', 'legal_representative', 'viewer'
    )),
  token text not null check (char_length(trim(token)) between 24 and 80),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  message text not null default '' check (char_length(message) <= 400),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_invites_token_uidx
  on public.business_invites (token);

create unique index if not exists business_invites_pending_email_uidx
  on public.business_invites (business_id, lower(email))
  where status = 'pending';

create index if not exists business_invites_business_idx
  on public.business_invites (business_id, created_at desc);

alter table public.business_invites enable row level security;

drop policy if exists "Managers read business invites" on public.business_invites;
create policy "Managers read business invites"
  on public.business_invites for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  );

drop policy if exists "Managers write business invites" on public.business_invites;
create policy "Managers write business invites"
  on public.business_invites for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  );

drop trigger if exists business_invites_set_updated_at on public.business_invites;
create trigger business_invites_set_updated_at
  before update on public.business_invites
  for each row execute function public.set_updated_at();

-- >>> Shop demo orders (merchant practice — not real customers)
alter table public.shop_orders
  add column if not exists is_demo boolean not null default false;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'shop_orders_channel_check'
  ) then
    alter table public.shop_orders drop constraint shop_orders_channel_check;
  end if;
  alter table public.shop_orders
    add constraint shop_orders_channel_check
    check (channel in ('whatsapp', 'demo', 'web'));
exception
  when duplicate_object then null;
end $$;

create index if not exists shop_orders_demo_idx
  on public.shop_orders (project_id, is_demo)
  where is_demo = true;

notify pgrst, 'reload schema';

-- <<< END 055_team_invites_demo_orders.sql


-- >>> BEGIN 056_business_artists_press_kits.sql (supabase/migrations/056_business_artists_press_kits.sql)

-- 056 agency artists + structured press kits
-- Apply after 055. Safe to re-run.
-- Requires: public.businesses, public.business_members
-- Or paste APPLY_AGENCY_056_058.sql (056+057+058 in one run).

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.businesses') is null then
    raise exception
      'public.businesses is missing. Apply foundation first (APPLY_MIGRATIONS_005_007.sql), then re-run 056.';
  end if;
  if to_regclass('public.business_members') is null then
    raise exception
      'public.business_members is missing. Apply APPLY_MIGRATIONS_005_007.sql, then re-run 056.';
  end if;
end $$;

create table if not exists public.business_artists (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  public_id text not null,
  stage_name text not null check (char_length(trim(stage_name)) between 1 and 120),
  legal_name text not null default '' check (char_length(legal_name) <= 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  bio_short text not null default '' check (char_length(bio_short) <= 400),
  hometown text not null default '' check (char_length(hometown) <= 120),
  genres jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  portrait_url text not null default '' check (char_length(portrait_url) <= 500),
  cover_url text not null default '' check (char_length(cover_url) <= 500),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_artists_public_id_uidx unique (public_id),
  constraint business_artists_slug_biz_uidx unique (business_id, slug)
);

create index if not exists business_artists_business_idx
  on public.business_artists (business_id, created_at desc);

create table if not exists public.business_press_kits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  artist_id uuid not null references public.business_artists(id) on delete cascade,
  public_id text not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  -- Structured EPK: bio, quotes, facts, photos, videos, downloads, booking
  kit jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_press_kits_public_id_uidx unique (public_id)
);

create index if not exists business_press_kits_business_idx
  on public.business_press_kits (business_id, created_at desc);

create index if not exists business_press_kits_artist_idx
  on public.business_press_kits (artist_id, created_at desc);

alter table public.business_artists enable row level security;
alter table public.business_press_kits enable row level security;

drop policy if exists "Members read artists" on public.business_artists;
create policy "Members read artists"
  on public.business_artists for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artists.business_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Managers write artists" on public.business_artists;
create policy "Managers write artists"
  on public.business_artists for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artists.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artists.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  );

drop policy if exists "Members read press kits" on public.business_press_kits;
create policy "Members read press kits"
  on public.business_press_kits for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_press_kits.business_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Managers write press kits" on public.business_press_kits;
create policy "Managers write press kits"
  on public.business_press_kits for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_press_kits.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_press_kits.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  );

drop trigger if exists business_artists_set_updated_at on public.business_artists;
create trigger business_artists_set_updated_at
  before update on public.business_artists
  for each row execute function public.set_updated_at();

drop trigger if exists business_press_kits_set_updated_at on public.business_press_kits;
create trigger business_press_kits_set_updated_at
  before update on public.business_press_kits
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- <<< END 056_business_artists_press_kits.sql


-- >>> BEGIN 057_business_artist_campaigns.sql (supabase/migrations/057_business_artist_campaigns.sql)

-- 057 agency artist campaigns (tied to roster + optional press kit)
-- Apply after 056. Not email campaigns — release / promo plans for talent.
-- Safe to re-run.
-- Or paste APPLY_AGENCY_056_058.sql instead.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.businesses') is null then
    raise exception
      'public.businesses is missing. Apply foundation first, then 056, then re-run 057.';
  end if;
  if to_regclass('public.business_artists') is null
     or to_regclass('public.business_press_kits') is null then
    raise exception
      'Artists/press kits missing. Apply 056 (or APPLY_AGENCY_056_058.sql) first, then re-run 057.';
  end if;
end $$;

create table if not exists public.business_artist_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  artist_id uuid not null references public.business_artists(id) on delete cascade,
  press_kit_id uuid references public.business_press_kits(id) on delete set null,
  public_id text not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  objective text not null default '' check (char_length(objective) <= 400),
  brief text not null default '' check (char_length(brief) <= 4000),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'done', 'archived')),
  channels jsonb not null default '[]'::jsonb,
  starts_on date,
  ends_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_artist_campaigns_public_id_uidx unique (public_id)
);

create index if not exists business_artist_campaigns_business_idx
  on public.business_artist_campaigns (business_id, created_at desc);

create index if not exists business_artist_campaigns_artist_idx
  on public.business_artist_campaigns (artist_id, created_at desc);

alter table public.business_artist_campaigns enable row level security;

drop policy if exists "Members read artist campaigns" on public.business_artist_campaigns;
create policy "Members read artist campaigns"
  on public.business_artist_campaigns for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artist_campaigns.business_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Managers write artist campaigns" on public.business_artist_campaigns;
create policy "Managers write artist campaigns"
  on public.business_artist_campaigns for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artist_campaigns.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artist_campaigns.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  );

drop trigger if exists business_artist_campaigns_set_updated_at on public.business_artist_campaigns;
create trigger business_artist_campaigns_set_updated_at
  before update on public.business_artist_campaigns
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- <<< END 057_business_artist_campaigns.sql


-- >>> BEGIN 058_business_artist_media.sql (supabase/migrations/058_business_artist_media.sql)

-- 058 agency artist media (reels / music videos)
-- Apply after 057. URL-based embeds — not a Studio editor.
-- Safe to re-run.
-- Or paste APPLY_AGENCY_056_058.sql instead.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.businesses') is null then
    raise exception
      'public.businesses is missing. Apply foundation first, then 056–057, then re-run 058.';
  end if;
  if to_regclass('public.business_artists') is null then
    raise exception
      'business_artists missing. Apply 056 first, then re-run 058.';
  end if;
  if to_regclass('public.business_artist_campaigns') is null then
    raise exception
      'business_artist_campaigns missing. Apply 057 first, then re-run 058.';
  end if;
end $$;

create table if not exists public.business_artist_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  artist_id uuid not null references public.business_artists(id) on delete cascade,
  campaign_id uuid references public.business_artist_campaigns(id) on delete set null,
  public_id text not null,
  kind text not null default 'reel'
    check (kind in ('reel', 'music_video', 'teaser', 'live_clip', 'other')),
  platform text not null default 'youtube'
    check (platform in ('youtube', 'instagram', 'tiktok', 'vimeo', 'direct', 'other')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  url text not null check (char_length(trim(url)) between 8 and 500),
  thumbnail_url text not null default '' check (char_length(thumbnail_url) <= 500),
  caption text not null default '' check (char_length(caption) <= 500),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_artist_media_public_id_uidx unique (public_id)
);

create index if not exists business_artist_media_business_idx
  on public.business_artist_media (business_id, created_at desc);

create index if not exists business_artist_media_artist_idx
  on public.business_artist_media (artist_id, sort_order, created_at desc);

create index if not exists business_artist_media_campaign_idx
  on public.business_artist_media (campaign_id)
  where campaign_id is not null;

alter table public.business_artist_media enable row level security;

drop policy if exists "Members read artist media" on public.business_artist_media;
create policy "Members read artist media"
  on public.business_artist_media for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artist_media.business_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Managers write artist media" on public.business_artist_media;
create policy "Managers write artist media"
  on public.business_artist_media for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artist_media.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_artist_media.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager', 'creative', 'store_manager')
    )
  );

drop trigger if exists business_artist_media_set_updated_at on public.business_artist_media;
create trigger business_artist_media_set_updated_at
  before update on public.business_artist_media
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- <<< END 058_business_artist_media.sql


-- >>> BEGIN 059_shop_gift_orders.sql (supabase/migrations/059_shop_gift_orders.sql)

-- 059 shop gift / buy-for-someone
-- Apply after APPLY_SHOP_ORDERS (through 055). Safe to re-run.
-- Buyer pays; recipient gets delivery contact + optional public gift link.

do $$
begin
  if to_regclass('public.shop_orders') is null then
    raise exception
      'public.shop_orders is missing. Apply APPLY_SHOP_ORDERS.sql first (needs public.projects), then re-run 059.';
  end if;
end $$;

alter table public.shop_orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists recipient_email text,
  add column if not exists gift_message text,
  add column if not exists gift_public_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_name_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_name_len
      check (
        recipient_name is null
        or char_length(trim(recipient_name)) between 1 and 80
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_phone_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_phone_len
      check (
        recipient_phone is null
        or char_length(trim(recipient_phone)) between 8 and 24
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_email_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_email_check
      check (
        recipient_email is null
        or recipient_email ~* '^[^@]+@[^@]+\.[^@]+$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_message_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_message_len
      check (
        gift_message is null
        or char_length(gift_message) <= 400
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_requires_recipient'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_requires_recipient
      check (
        is_gift = false
        or (
          recipient_name is not null
          and char_length(trim(recipient_name)) between 1 and 80
          and recipient_phone is not null
          and char_length(trim(recipient_phone)) between 8 and 24
        )
      );
  end if;
end $$;

create unique index if not exists shop_orders_gift_public_id_uidx
  on public.shop_orders (gift_public_id)
  where gift_public_id is not null;

create index if not exists shop_orders_gift_idx
  on public.shop_orders (project_id, is_gift)
  where is_gift = true;

notify pgrst, 'reload schema';

-- <<< END 059_shop_gift_orders.sql


-- >>> BEGIN 060_opportunity_listings_metadata.sql (supabase/migrations/060_opportunity_listings_metadata.sql)

-- Opportunity OS — listing metadata for trust labels (extends opportunities from 001)

alter table public.opportunities
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.opportunities.metadata is
  'Optional trust fields: verified_at, volatility, attributed_ministry, legal_basis, attributed_official, verification_source_url, flag_reason';

create index if not exists opportunities_metadata_gin on public.opportunities using gin (metadata);

-- <<< END 060_opportunity_listings_metadata.sql


-- >>> BEGIN 061_account_workspace_context.sql (supabase/migrations/061_account_workspace_context.sql)

-- P1: Unified Kebu Account workspace — persist active business context on personal profile.

alter table public.user_profiles
  add column if not exists active_business_id uuid references public.businesses(id) on delete set null;

create index if not exists user_profiles_active_business_idx
  on public.user_profiles (active_business_id)
  where active_business_id is not null;

comment on column public.user_profiles.active_business_id is
  'Active Business Kebu workspace (Kebu ID). Null = Personal Kebu context.';

-- <<< END 061_account_workspace_context.sql


-- >>> BEGIN 062_account_entitlements.sql (supabase/migrations/062_account_entitlements.sql)

-- P2: Centralized account entitlements (e.g. african_opportunity_access for Kebu Opportunity OS).

create table if not exists public.account_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null check (char_length(trim(entitlement_key)) between 2 and 80),
  status text not null default 'none' check (
    status in ('none', 'pending', 'verified', 'revoked')
  ),
  source text,
  granted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement_key)
);

create index if not exists account_entitlements_key_status_idx
  on public.account_entitlements (entitlement_key, status);

alter table public.account_entitlements enable row level security;

drop policy if exists "Users read own entitlements" on public.account_entitlements;
create policy "Users read own entitlements"
  on public.account_entitlements for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own entitlements" on public.account_entitlements;
create policy "Users upsert own entitlements"
  on public.account_entitlements for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own entitlements" on public.account_entitlements;
create policy "Users update own entitlements"
  on public.account_entitlements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists account_entitlements_set_updated_at on public.account_entitlements;
create trigger account_entitlements_set_updated_at
  before update on public.account_entitlements
  for each row execute function public.set_updated_at();

grant select, insert, update on public.account_entitlements to authenticated;

-- <<< END 062_account_entitlements.sql


-- >>> BEGIN 063_opportunity_cards.sql (supabase/migrations/063_opportunity_cards.sql)

-- P3: Opportunity OS — Opportunity Card slice (structured economic intelligence cards).

create table if not exists public.opportunity_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(trim(slug)) between 3 and 120),
  title text not null check (char_length(trim(title)) between 3 and 200),
  opportunity_summary text not null check (char_length(trim(opportunity_summary)) between 10 and 2000),
  country_code char(2) not null,
  location_label text,
  problem text not null,
  evidence text not null,
  why_now text,
  customer_segment text,
  current_solutions text,
  import_dependency text,
  local_resources text[] not null default '{}',
  required_capabilities text[] not null default '{}',
  estimated_market text,
  competition text,
  regulatory_notes text,
  potential_african_markets text[] not null default '{}',
  business_models text[] not null default '{}',
  difficulty text check (difficulty in ('low', 'medium', 'high')),
  capital_intensity text check (capital_intensity in ('low', 'medium', 'high')),
  time_to_market text,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'exploratory')),
  trust_label text not null default 'curated',
  sources jsonb not null default '[]'::jsonb,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunity_cards_publish_idx
  on public.opportunity_cards (publish_status, sort_order, country_code);

alter table public.opportunity_cards enable row level security;

drop policy if exists "Anyone reads published opportunity cards" on public.opportunity_cards;
create policy "Anyone reads published opportunity cards"
  on public.opportunity_cards for select
  using (publish_status = 'published');

drop trigger if exists opportunity_cards_set_updated_at on public.opportunity_cards;
create trigger opportunity_cards_set_updated_at
  before update on public.opportunity_cards
  for each row execute function public.set_updated_at();

-- Curated seed card: Senegal pharmaceutical import replacement (evidence-based, not AI invented).
insert into public.opportunity_cards (
  slug,
  title,
  opportunity_summary,
  country_code,
  location_label,
  problem,
  evidence,
  why_now,
  customer_segment,
  current_solutions,
  import_dependency,
  local_resources,
  required_capabilities,
  estimated_market,
  competition,
  regulatory_notes,
  potential_african_markets,
  business_models,
  difficulty,
  capital_intensity,
  time_to_market,
  confidence,
  trust_label,
  sources,
  publish_status,
  sort_order
) values (
  'senegal-local-pharma-supply',
  'Local pharmaceutical supply for public health procurement',
  'Senegal imports a large share of finished medicines. Public procurement is actively seeking qualified local suppliers — a gap for GMP-aware manufacturing, packaging, or licensed distribution.',
  'SN',
  'Senegal · West Africa',
  'Public hospitals and the national supply chain rely heavily on imported finished pharmaceuticals, leaving foreign exchange exposure and supply delays during global shocks.',
  'Senegal''s Pharmacie Nationale d''Approvisionnement (PNA) and related public health programs publish procurement needs for medicines and supplies. Import statistics show pharmaceuticals among priority import categories; local manufacturing capacity remains limited relative to demand.',
  'Post-COVID supply chain awareness, regional ECOWAS harmonization efforts, and youth-led health entrepreneurship programs increase appetite for local production partnerships.',
  'Public hospitals, community pharmacies, NGO health programs, and export-oriented ECOWAS neighbors needing registered products.',
  'Most volume still comes from imported brands via distributors; a few local repackagers and importers dominate mid-tier supply.',
  'High — finished dosage forms and active ingredients are largely imported despite domestic demand growth.',
  array['Pharmacy graduates', 'Dakar industrial zones', 'Regional trade via ECOWAS', 'University research partnerships'],
  array['GMP or partner with licensed facility', 'Product registration pathway', 'Cold-chain logistics', 'Quality control lab access'],
  'West Africa OTC and essential medicines market — multi-billion USD regional demand; Senegal as hub for francophone West Africa.',
  'Established importers with foreign brand licenses; limited local manufacturers with full GMP lines.',
  'Medicines require registration with health authorities; manufacturing needs facility inspection. Partner-with-licensee models reduce time-to-market.',
  array['Mali', 'Guinea', 'Côte d''Ivoire', 'Gambia'],
  array['Licensed local production partner', 'Import + repackaging under brand license', 'Essential generics contract manufacturing'],
  'high',
  'high',
  '18–36 months for registered product; 6–12 months for distribution partnership',
  'medium',
  'curated',
  '[
    {"title":"PNA Senegal","type":"public_procurement","url":"https://www.pna.sn","note":"National pharmaceutical supply entity"},
    {"title":"Kebu Opportunity OS — curated research","type":"internal_curated","note":"Structured from public procurement and trade context; validate before investing."}
  ]'::jsonb,
  'published',
  10
) on conflict (slug) do nothing;

-- <<< END 063_opportunity_cards.sql


-- >>> BEGIN 064_creation_stack_slices.sql (supabase/migrations/064_creation_stack_slices.sql)

-- C4 variants · C5 collections · S3 brand kit · W14 forms · Studio design types
-- Apply after 063.

-- ── C4: product variants ─────────────────────────────────────────────────────

create table if not exists public.project_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.project_products(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  option1 text not null default '' check (char_length(option1) <= 60),
  option2 text not null default '' check (char_length(option2) <= 60),
  option3 text not null default '' check (char_length(option3) <= 60),
  price_label text not null default '' check (char_length(price_label) <= 60),
  price_xof integer check (price_xof is null or price_xof >= 0),
  sku text check (sku is null or char_length(sku) <= 40),
  image_url text not null default '' check (char_length(image_url) <= 500),
  stock_qty integer check (stock_qty is null or (stock_qty >= 0 and stock_qty <= 1000000)),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_product_variants_product_idx
  on public.project_product_variants (product_id, sort_order);
create index if not exists project_product_variants_project_idx
  on public.project_product_variants (project_id);

alter table public.project_product_variants enable row level security;

drop policy if exists "Owners manage project_product_variants" on public.project_product_variants;
create policy "Owners manage project_product_variants"
  on public.project_product_variants for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_product_variants.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_product_variants.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists project_product_variants_set_updated_at on public.project_product_variants;
create trigger project_product_variants_set_updated_at
  before update on public.project_product_variants
  for each row execute function public.set_updated_at();

alter table public.project_products
  add column if not exists has_variants boolean not null default false;

alter table public.shop_order_items
  add column if not exists variant_id uuid references public.project_product_variants(id) on delete set null,
  add column if not exists variant_name text;

-- ── C5: collections ────────────────────────────────────────────────────────

create table if not exists public.project_product_collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null check (char_length(slug) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  image_url text not null default '' check (char_length(image_url) <= 500),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists project_product_collections_project_idx
  on public.project_product_collections (project_id, sort_order);

create table if not exists public.project_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.project_product_collections(id) on delete cascade,
  product_id uuid not null references public.project_products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, product_id)
);

create index if not exists project_collection_items_collection_idx
  on public.project_collection_items (collection_id, sort_order);

alter table public.project_product_collections enable row level security;
alter table public.project_collection_items enable row level security;

drop policy if exists "Owners manage project_product_collections" on public.project_product_collections;
create policy "Owners manage project_product_collections"
  on public.project_product_collections for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_product_collections.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_product_collections.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners manage project_collection_items" on public.project_collection_items;
create policy "Owners manage project_collection_items"
  on public.project_collection_items for all
  using (
    exists (
      select 1 from public.project_product_collections c
      join public.projects p on p.id = c.project_id
      where c.id = project_collection_items.collection_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.project_product_collections c
      join public.projects p on p.id = c.project_id
      where c.id = project_collection_items.collection_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists project_product_collections_set_updated_at on public.project_product_collections;
create trigger project_product_collections_set_updated_at
  before update on public.project_product_collections
  for each row execute function public.set_updated_at();

-- ── S3: brand kit ───────────────────────────────────────────────────────────

create table if not exists public.business_brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  name text not null default 'Brand kit' check (char_length(trim(name)) between 1 and 120),
  logo_url text not null default '' check (char_length(logo_url) <= 500),
  primary_color text not null default '#0F0D33' check (char_length(primary_color) <= 40),
  accent_color text not null default '#E05A2B' check (char_length(accent_color) <= 40),
  background_color text not null default '#FAFAF8' check (char_length(background_color) <= 40),
  text_color text not null default '#0F0D33' check (char_length(text_color) <= 40),
  font_display text not null default 'Fraunces' check (char_length(font_display) <= 80),
  font_body text not null default 'system-ui' check (char_length(font_body) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_brand_kits_owner_idx
  on public.business_brand_kits (owner_id, updated_at desc);
create index if not exists business_brand_kits_business_idx
  on public.business_brand_kits (business_id) where business_id is not null;

alter table public.business_brand_kits enable row level security;

drop policy if exists "Owners manage business_brand_kits" on public.business_brand_kits;
create policy "Owners manage business_brand_kits"
  on public.business_brand_kits for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists business_brand_kits_set_updated_at on public.business_brand_kits;
create trigger business_brand_kits_set_updated_at
  before update on public.business_brand_kits
  for each row execute function public.set_updated_at();

alter table public.project_products
  add column if not exists create_design_id uuid references public.create_designs(id) on delete set null;

-- ── W14: form submissions ───────────────────────────────────────────────────

create table if not exists public.project_form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  section_id uuid not null references public.project_sections(id) on delete cascade,
  form_name text not null default '' check (char_length(form_name) <= 120),
  payload jsonb not null default '{}'::jsonb,
  submitter_email text,
  submitter_name text,
  submitter_phone text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists project_form_submissions_project_idx
  on public.project_form_submissions (project_id, created_at desc);
create index if not exists project_form_submissions_section_idx
  on public.project_form_submissions (section_id, created_at desc);

alter table public.project_form_submissions enable row level security;

drop policy if exists "Owners read project_form_submissions" on public.project_form_submissions;
create policy "Owners read project_form_submissions"
  on public.project_form_submissions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_form_submissions.project_id and p.owner_id = auth.uid()
    )
  );

-- ── Studio design types ─────────────────────────────────────────────────────

alter table public.create_designs drop constraint if exists create_designs_design_type_check;
alter table public.create_designs
  add constraint create_designs_design_type_check
  check (design_type in (
    'poster', 'social_square', 'flyer',
    'instagram_post', 'instagram_story', 'facebook_post', 'whatsapp_status'
  ));

-- ── Builder: form section type ──────────────────────────────────────────────

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (
    section_type in (
      'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
      'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'email-popup',
      'whatsapp', 'heading', 'paragraph', 'button', 'free-text', 'footer', 'form',
      'maylecor-home', 'maylecor-music', 'legally-blonde-hero',
      'kdirection-home', 'kdirection-page'
    )
  );

alter table public.project_sections validate constraint project_sections_section_type_check;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '64')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';

-- <<< END 064_creation_stack_slices.sql


-- >>> BEGIN 065_site_chrome.sql (supabase/migrations/065_site_chrome.sql)

-- W13: Universal site header/footer (one chrome for all pages)
-- Apply after 064.

alter table public.projects
  add column if not exists site_chrome jsonb not null default '{}'::jsonb;

comment on column public.projects.site_chrome is
  'Universal header (navigation) + footer props applied to every page when enabled.';

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '65')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';

-- <<< END 065_site_chrome.sql


-- >>> BEGIN 066_remaining_slices.sql (supabase/migrations/066_remaining_slices.sql)

-- W15 blog · W16 (done) · shop refunds/COD/gift cards/reviews/subscriptions · AN1 funnel events
-- Apply after 065.

-- ── W15: Blog posts ─────────────────────────────────────────────────────────

create table if not exists public.project_blog_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slug text not null check (char_length(trim(slug)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  body text not null default '' check (char_length(body) <= 50000),
  cover_url text not null default '' check (char_length(cover_url) <= 500),
  author_name text not null default '' check (char_length(author_name) <= 80),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists project_blog_posts_project_idx
  on public.project_blog_posts (project_id, status, published_at desc nulls last);

alter table public.project_blog_posts enable row level security;

drop policy if exists "Owners manage project_blog_posts" on public.project_blog_posts;
create policy "Owners manage project_blog_posts"
  on public.project_blog_posts for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_blog_posts.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_blog_posts.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Public reads published blog posts" on public.project_blog_posts;
create policy "Public reads published blog posts"
  on public.project_blog_posts for select
  using (status = 'published');

drop trigger if exists project_blog_posts_set_updated_at on public.project_blog_posts;
create trigger project_blog_posts_set_updated_at
  before update on public.project_blog_posts
  for each row execute function public.set_updated_at();

-- ── Shop: refunds (extend payment_status) ───────────────────────────────────

alter table public.shop_orders drop constraint if exists shop_orders_payment_status_check;
alter table public.shop_orders
  add constraint shop_orders_payment_status_check
  check (payment_status in ('unpaid', 'awaiting_payment', 'paid', 'failed', 'refunded'));

alter table public.shop_orders
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_note text;

-- ── C6: Gift cards ──────────────────────────────────────────────────────────

create table if not exists public.shop_gift_cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 6 and 32),
  initial_balance_xof integer not null check (initial_balance_xof > 0 and initial_balance_xof <= 100000000),
  balance_xof integer not null check (balance_xof >= 0),
  currency text not null default 'XOF',
  status text not null default 'active' check (status in ('active', 'depleted', 'disabled')),
  recipient_email text,
  note text not null default '' check (char_length(note) <= 200),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index if not exists shop_gift_cards_project_idx
  on public.shop_gift_cards (project_id, status);

alter table public.shop_gift_cards enable row level security;

drop policy if exists "Owners manage shop_gift_cards" on public.shop_gift_cards;
create policy "Owners manage shop_gift_cards"
  on public.shop_gift_cards for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_gift_cards.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_gift_cards.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_gift_cards_set_updated_at on public.shop_gift_cards;
create trigger shop_gift_cards_set_updated_at
  before update on public.shop_gift_cards
  for each row execute function public.set_updated_at();

alter table public.shop_orders
  add column if not exists gift_card_code text,
  add column if not exists gift_card_amount_xof integer check (gift_card_amount_xof is null or gift_card_amount_xof >= 0);

-- ── C7: Product reviews ─────────────────────────────────────────────────────

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null references public.project_products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  reviewer_name text not null check (char_length(trim(reviewer_name)) between 1 and 80),
  reviewer_email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_product_idx
  on public.product_reviews (product_id, status, created_at desc);

alter table public.product_reviews enable row level security;

drop policy if exists "Owners manage product_reviews" on public.product_reviews;
create policy "Owners manage product_reviews"
  on public.product_reviews for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = product_reviews.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = product_reviews.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Public reads approved reviews" on public.product_reviews;
create policy "Public reads approved reviews"
  on public.product_reviews for select
  using (status = 'approved');

drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();

-- ── C8: Product subscriptions ───────────────────────────────────────────────

alter table public.project_products
  add column if not exists is_subscription boolean not null default false,
  add column if not exists subscription_interval text check (
    subscription_interval is null
    or subscription_interval in ('weekly', 'monthly', 'quarterly', 'yearly')
  );

create table if not exists public.shop_subscriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null references public.project_products(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  interval text not null check (interval in ('weekly', 'monthly', 'quarterly', 'yearly')),
  price_xof integer not null check (price_xof >= 0),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  next_billing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_subscriptions_project_idx
  on public.shop_subscriptions (project_id, status);

alter table public.shop_subscriptions enable row level security;

drop policy if exists "Owners manage shop_subscriptions" on public.shop_subscriptions;
create policy "Owners manage shop_subscriptions"
  on public.shop_subscriptions for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_subscriptions.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_subscriptions.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_subscriptions_set_updated_at on public.shop_subscriptions;
create trigger shop_subscriptions_set_updated_at
  before update on public.shop_subscriptions
  for each row execute function public.set_updated_at();

-- ── Builder: blog-list section type ─────────────────────────────────────────

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (
    section_type in (
      'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
      'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'email-popup',
      'whatsapp', 'heading', 'paragraph', 'button', 'free-text', 'footer', 'form', 'blog-list',
      'maylecor-home', 'maylecor-music', 'legally-blonde-hero',
      'kdirection-home', 'kdirection-page'
    )
  );

alter table public.project_sections validate constraint project_sections_section_type_check;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '66')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';

-- <<< END 066_remaining_slices.sql


-- >>> BEGIN 067_shop_owner_ops.sql (docs/migrations-to-apply/067_shop_owner_ops.sql)

-- 067 — Shop owner ops: notifications, analytics event types, order channels, visitor meta
-- Apply after 066. Paste in Supabase SQL Editor.

-- Expand site analytics event types (shop funnel + pageview)
do $$
begin
  alter table public.site_analytics_events drop constraint if exists site_analytics_events_event_type_check;
exception when undefined_object then null;
end $$;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (
    event_type in (
      'pageview', 'vital', 'error', 'perf',
      'product_view', 'add_to_cart', 'checkout_start', 'purchase'
    )
  );

-- Order acquisition channels (where the order came from)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'shop_orders_channel_check'
  ) then
    alter table public.shop_orders drop constraint shop_orders_channel_check;
  end if;
end $$;

alter table public.shop_orders
  add constraint shop_orders_channel_check
  check (
    channel in (
      'whatsapp', 'demo', 'web', 'share', 'social', 'qr', 'wave', 'joko'
    )
  );

alter table public.shop_orders
  add column if not exists source_detail text not null default ''
  check (char_length(source_detail) <= 120);

-- In-app + push-ready owner notifications (one row per alert)
create table if not exists public.shop_owner_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'order'
    check (kind in ('order', 'message', 'stock', 'system')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  href text not null default '' check (char_length(href) <= 300),
  order_id uuid references public.shop_orders(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shop_owner_notifications_owner_idx
  on public.shop_owner_notifications (owner_id, created_at desc);

create index if not exists shop_owner_notifications_project_idx
  on public.shop_owner_notifications (project_id, created_at desc);

alter table public.shop_owner_notifications enable row level security;

drop policy if exists "Owners manage shop_owner_notifications" on public.shop_owner_notifications;
create policy "Owners manage shop_owner_notifications"
  on public.shop_owner_notifications for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Browser push subscriptions (Web Push) — optional until VAPID keys set
create table if not exists public.shop_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 10 and 2000),
  p256dh text not null default '' check (char_length(p256dh) <= 500),
  auth text not null default '' check (char_length(auth) <= 200),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists shop_push_subscriptions_user_idx
  on public.shop_push_subscriptions (user_id);

alter table public.shop_push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.shop_push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.shop_push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.shop_owner_notifications is
  'Per-store owner alerts (orders etc). Browser Notification API + optional Web Push.';
comment on table public.shop_push_subscriptions is
  'Web Push endpoints. Requires VAPID keys on server to deliver.';

-- <<< END 067_shop_owner_ops.sql


-- >>> BEGIN 068_shop_payment_ledger.sql (docs/migrations-to-apply/068_shop_payment_ledger.sql)

-- 068 — Shop payment ledger (all rails → one event stream for analytics / future Joko scoring)
-- Apply after 067. Paste in Supabase SQL Editor.
-- Currency today: XOF (and labels). Future pan-African settlement unit: Cauris (ALK layer) — not live clearing yet.

create table if not exists public.shop_payment_ledger_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  order_id uuid references public.shop_orders(id) on delete set null,
  rail text not null
    check (rail in (
      'joko', 'wave', 'paystack', 'paypal', 'orange_money',
      'whatsapp', 'cod', 'mobile_money', 'card', 'manual', 'unknown'
    )),
  event_type text not null
    check (event_type in (
      'intent', 'checkout_started', 'awaiting', 'paid', 'failed', 'refunded', 'cancelled'
    )),
  amount_xof integer check (amount_xof is null or amount_xof >= 0),
  -- Settlement currency: XOF today; CAURIS when ALK clears.
  currency text not null default 'XOF'
    check (char_length(currency) between 3 and 12),
  provider text not null default ''
    check (char_length(provider) <= 40),
  provider_reference text not null default ''
    check (char_length(provider_reference) <= 200),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shop_payment_ledger_project_idx
  on public.shop_payment_ledger_events (project_id, created_at desc);

create index if not exists shop_payment_ledger_order_idx
  on public.shop_payment_ledger_events (order_id, created_at desc)
  where order_id is not null;

create index if not exists shop_payment_ledger_rail_idx
  on public.shop_payment_ledger_events (project_id, rail, event_type);

alter table public.shop_payment_ledger_events enable row level security;

drop policy if exists "Owners read shop_payment_ledger_events" on public.shop_payment_ledger_events;
create policy "Owners read shop_payment_ledger_events"
  on public.shop_payment_ledger_events for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- Inserts from service role / order APIs only (no client inserts).
notify pgrst, 'reload schema';

-- <<< END 068_shop_payment_ledger.sql


-- >>> BEGIN 069_shipping_corridor_quotes.sql (docs/migrations-to-apply/069_shipping_corridor_quotes.sql)

-- 069 — Cross-border shipping quote fields on shop_orders (SN→GH corridor v1)
-- Apply after 068.

alter table public.shop_orders
  add column if not exists buyer_country_code char(2),
  add column if not exists shipping_amount_xof integer
    check (shipping_amount_xof is null or shipping_amount_xof >= 0),
  add column if not exists shipping_eta_min_days integer
    check (shipping_eta_min_days is null or shipping_eta_min_days >= 0),
  add column if not exists shipping_eta_max_days integer
    check (shipping_eta_max_days is null or shipping_eta_max_days >= 0),
  add column if not exists shipping_corridor text not null default ''
    check (char_length(shipping_corridor) <= 16),
  add column if not exists shipping_trust_label text
    check (shipping_trust_label is null or shipping_trust_label in ('estimate', 'partner_rate')),
  add column if not exists shipping_quote_version text not null default ''
    check (char_length(shipping_quote_version) <= 40);

comment on column public.shop_orders.shipping_trust_label is
  'estimate = Kebu corridor table; partner_rate = live partner API (not yet).';

notify pgrst, 'reload schema';

-- <<< END 069_shipping_corridor_quotes.sql


-- >>> BEGIN 070_studio_generation_runs.sql (supabase/migrations/070_studio_generation_runs.sql)

-- Studio S4: AI campaign generation history (prompt → design ids)
-- Depends on: create_designs (022 / 064)

create table if not exists public.studio_generation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(trim(prompt)) between 8 and 800),
  business_name text not null default '' check (char_length(business_name) <= 120),
  used_ai boolean not null default false,
  fallback boolean not null default false,
  design_ids uuid[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists studio_generation_runs_owner_idx
  on public.studio_generation_runs (owner_id, created_at desc);

alter table public.studio_generation_runs enable row level security;

drop policy if exists "Owners manage studio_generation_runs" on public.studio_generation_runs;
create policy "Owners manage studio_generation_runs"
  on public.studio_generation_runs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_generation_runs to authenticated;
grant all on public.studio_generation_runs to service_role;

-- <<< END 070_studio_generation_runs.sql


-- >>> BEGIN 071_studio_design_collaborators.sql (supabase/migrations/071_studio_design_collaborators.sql)

-- Studio collab: share designs with editors / viewers (not live cursors)
-- Depends on: create_designs (022)

create table if not exists public.studio_design_collaborators (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.create_designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(trim(email)) between 3 and 254),
  role text not null check (role in ('editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (design_id, user_id)
);

create index if not exists studio_design_collaborators_user_idx
  on public.studio_design_collaborators (user_id, status)
  where status = 'active';

create index if not exists studio_design_collaborators_design_idx
  on public.studio_design_collaborators (design_id, status);

alter table public.studio_design_collaborators enable row level security;

drop policy if exists "Design owners manage collaborators" on public.studio_design_collaborators;
create policy "Design owners manage collaborators"
  on public.studio_design_collaborators for all
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_collaborators.design_id
        and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_collaborators.design_id
        and d.owner_id = auth.uid()
    )
  );

drop policy if exists "Collaborators read own membership" on public.studio_design_collaborators;
create policy "Collaborators read own membership"
  on public.studio_design_collaborators for select
  using (user_id = auth.uid() and status = 'active');

-- Expand create_designs access for collaborators
drop policy if exists "Owners manage create_designs" on public.create_designs;
drop policy if exists "Owners and collaborators read create_designs" on public.create_designs;
drop policy if exists "Owners and editors update create_designs" on public.create_designs;
drop policy if exists "Owners insert create_designs" on public.create_designs;
drop policy if exists "Owners delete create_designs" on public.create_designs;

create policy "Owners insert create_designs"
  on public.create_designs for insert
  with check (owner_id = auth.uid());

create policy "Owners and collaborators read create_designs"
  on public.create_designs for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.studio_design_collaborators c
      where c.design_id = create_designs.id
        and c.user_id = auth.uid()
        and c.status = 'active'
    )
  );

create policy "Owners and editors update create_designs"
  on public.create_designs for update
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.studio_design_collaborators c
      where c.design_id = create_designs.id
        and c.user_id = auth.uid()
        and c.status = 'active'
        and c.role = 'editor'
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1 from public.studio_design_collaborators c
      where c.design_id = create_designs.id
        and c.user_id = auth.uid()
        and c.status = 'active'
        and c.role = 'editor'
    )
  );

create policy "Owners delete create_designs"
  on public.create_designs for delete
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_design_collaborators to authenticated;
grant all on public.studio_design_collaborators to service_role;

drop trigger if exists studio_design_collaborators_set_updated_at on public.studio_design_collaborators;
create trigger studio_design_collaborators_set_updated_at
  before update on public.studio_design_collaborators
  for each row execute function public.set_updated_at();

-- <<< END 071_studio_design_collaborators.sql


-- >>> BEGIN 072_reach_campaigns.sql (supabase/migrations/072_reach_campaigns.sql)

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

-- <<< END 072_reach_campaigns.sql


-- >>> BEGIN 073_studio_uploads.sql (supabase/migrations/073_studio_uploads.sql)

-- Studio uploads library (reusable media across designs)
-- Depends on: auth.users · site-assets storage (023)

create table if not exists public.studio_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null check (char_length(trim(url)) between 8 and 500),
  storage_path text,
  file_name text check (file_name is null or char_length(file_name) <= 200),
  mime text check (mime is null or char_length(mime) <= 100),
  byte_size int check (byte_size is null or byte_size >= 0),
  created_at timestamptz not null default now()
);

create index if not exists studio_uploads_owner_idx
  on public.studio_uploads (owner_id, created_at desc);

alter table public.studio_uploads enable row level security;

drop policy if exists "Owners manage studio uploads" on public.studio_uploads;
create policy "Owners manage studio uploads"
  on public.studio_uploads for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_uploads to authenticated;
grant all on public.studio_uploads to service_role;

notify pgrst, 'reload schema';

-- <<< END 073_studio_uploads.sql


-- >>> BEGIN 074_reach_paid_board.sql (supabase/migrations/074_reach_paid_board.sql)

-- Kebu Reach S10b: paid board placement · CPC bids · wallet · real impressions
-- Depends on: 072_reach_campaigns · auth.users · set_updated_at()

-- Campaign paid-board fields
alter table public.reach_campaigns
  add column if not exists board_enabled boolean not null default false;

alter table public.reach_campaigns
  add column if not exists bid_cpc_cauris numeric(12, 2) not null default 0
    check (bid_cpc_cauris >= 0 and bid_cpc_cauris <= 100000);

alter table public.reach_campaigns
  add column if not exists budget_cap_cauris numeric(12, 2) not null default 0
    check (budget_cap_cauris >= 0 and budget_cap_cauris <= 10000000);

alter table public.reach_campaigns
  add column if not exists spent_cauris numeric(12, 2) not null default 0
    check (spent_cauris >= 0);

alter table public.reach_campaigns
  add column if not exists creative_headline text
    check (creative_headline is null or char_length(trim(creative_headline)) <= 120);

alter table public.reach_campaigns
  add column if not exists creative_image_url text
    check (creative_image_url is null or char_length(trim(creative_image_url)) <= 500);

create index if not exists reach_campaigns_board_auction_idx
  on public.reach_campaigns (status, board_enabled, bid_cpc_cauris desc)
  where board_enabled = true and status = 'active';

-- Expand event types: impression + board_click (paid surface)
alter table public.reach_campaign_events
  drop constraint if exists reach_campaign_events_event_type_check;

alter table public.reach_campaign_events
  add constraint reach_campaign_events_event_type_check
  check (event_type in ('open', 'click', 'share', 'impression', 'board_click'));

-- Advertiser Reach wallet (platform credits until Joko ad-billing slice)
create table if not exists public.reach_wallets (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  balance_cauris numeric(12, 2) not null default 0
    check (balance_cauris >= 0 and balance_cauris <= 10000000),
  updated_at timestamptz not null default now()
);

create table if not exists public.reach_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  amount_cauris numeric(12, 2) not null,
  reason text not null check (char_length(trim(reason)) between 1 and 120),
  campaign_id uuid references public.reach_campaigns(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reach_wallet_ledger_owner_idx
  on public.reach_wallet_ledger (owner_id, created_at desc);

alter table public.reach_wallets enable row level security;
alter table public.reach_wallet_ledger enable row level security;

drop policy if exists "Owners manage reach wallets" on public.reach_wallets;
create policy "Owners read reach wallets"
  on public.reach_wallets for select
  using (owner_id = auth.uid());

drop policy if exists "Owners read reach wallet ledger" on public.reach_wallet_ledger;
create policy "Owners read reach wallet ledger"
  on public.reach_wallet_ledger for select
  using (owner_id = auth.uid());

-- Inserts to ledger/wallet mutations for spend go through service role API.

grant select on public.reach_wallets to authenticated;
grant select on public.reach_wallet_ledger to authenticated;
grant all on public.reach_wallets to service_role;
grant all on public.reach_wallet_ledger to service_role;

drop trigger if exists reach_wallets_set_updated_at on public.reach_wallets;
create trigger reach_wallets_set_updated_at
  before update on public.reach_wallets
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- <<< END 074_reach_paid_board.sql


-- >>> BEGIN 075_studio_video_projects.sql (supabase/migrations/075_studio_video_projects.sql)

-- Kebu Studio Video Phase 1: editable multi-track compositions
-- Depends on: auth.users · set_updated_at() · site-assets (023)

create table if not exists public.studio_video_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  width int not null default 1080 check (width between 200 and 4096),
  height int not null default 1920 check (height between 200 and 4096),
  frame_rate numeric(6, 2) not null default 30
    check (frame_rate >= 8 and frame_rate <= 60),
  edit_mode text not null default 'full_timeline'
    check (edit_mode in ('quick_edit', 'smart_edit', 'full_timeline')),
  /** Full StudioComposition JSON — tracks, clips, storyboard, music, assets */
  composition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_video_projects_owner_idx
  on public.studio_video_projects (owner_id, updated_at desc);

alter table public.studio_video_projects enable row level security;

drop policy if exists "Owners manage studio video projects" on public.studio_video_projects;
create policy "Owners manage studio video projects"
  on public.studio_video_projects for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_video_projects to authenticated;
grant all on public.studio_video_projects to service_role;

drop trigger if exists studio_video_projects_set_updated_at on public.studio_video_projects;
create trigger studio_video_projects_set_updated_at
  before update on public.studio_video_projects
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- <<< END 075_studio_video_projects.sql


-- >>> BEGIN 076_brand_dna_campaign_projects.sql (supabase/migrations/076_brand_dna_campaign_projects.sql)

-- Brand DNA foundation + Creative Director campaign projects
-- Depends: business_brand_kits (064) · create_designs · studio_video_projects (075)

-- ── Brand DNA fields on existing brand kits ─────────────────────────────────

alter table public.business_brand_kits
  add column if not exists tagline text not null default ''
    check (char_length(tagline) <= 200),
  add column if not exists photography_style text not null default ''
    check (char_length(photography_style) <= 400),
  add column if not exists voice_tone text not null default ''
    check (char_length(voice_tone) <= 400),
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists customer_notes text not null default ''
    check (char_length(customer_notes) <= 1000),
  add column if not exists products_notes text not null default ''
    check (char_length(products_notes) <= 1000),
  add column if not exists visual_rules text not null default ''
    check (char_length(visual_rules) <= 1000),
  add column if not exists approved_imagery jsonb not null default '[]'::jsonb,
  add column if not exists dna_version int not null default 1
    check (dna_version >= 1 and dna_version <= 100);

comment on column public.business_brand_kits.photography_style is
  'Brand DNA: how products/people should be photographed';
comment on column public.business_brand_kits.voice_tone is
  'Brand DNA: writing/speaking voice for captions and copy';
comment on column public.business_brand_kits.visual_rules is
  'Brand DNA: do/don''t visual rules for Studio/Builder/Shop AI';

-- Prefer one DNA kit per business in app logic (GET upserts by business_id).
-- No hard unique index: legacy owners may already have multiple kits.

-- ── Creative Director campaign projects ─────────────────────────────────────

create table if not exists public.studio_campaign_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  brand_kit_id uuid references public.business_brand_kits(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  brief text not null default '' check (char_length(brief) <= 2000),
  goal text not null default '' check (char_length(goal) <= 400),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'launched', 'archived')),
  /** Moodboard / visual direction — single source of truth for the campaign */
  mood jsonb not null default '{}'::jsonb,
  design_ids uuid[] not null default '{}'::uuid[],
  video_project_ids uuid[] not null default '{}'::uuid[],
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_campaign_projects_owner_idx
  on public.studio_campaign_projects (owner_id, updated_at desc);
create index if not exists studio_campaign_projects_business_idx
  on public.studio_campaign_projects (business_id)
  where business_id is not null;

alter table public.studio_campaign_projects enable row level security;

drop policy if exists "Owners manage studio_campaign_projects" on public.studio_campaign_projects;
create policy "Owners manage studio_campaign_projects"
  on public.studio_campaign_projects for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_campaign_projects to authenticated;
grant all on public.studio_campaign_projects to service_role;

drop trigger if exists studio_campaign_projects_set_updated_at on public.studio_campaign_projects;
create trigger studio_campaign_projects_set_updated_at
  before update on public.studio_campaign_projects
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- <<< END 076_brand_dna_campaign_projects.sql


notify pgrst, 'reload schema';
