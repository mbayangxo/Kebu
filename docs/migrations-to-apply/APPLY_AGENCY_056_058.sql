-- =============================================================================
-- Kebu agency — ONE paste: artists / press kits (056) + campaigns (057) + media (058)
-- Requires: public.businesses + public.business_members (you already have these).
-- Safe to re-run. Does NOT need public.projects.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Bootstrap updated_at trigger helper if missing
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
    raise exception 'public.businesses is missing.';
  end if;
  if to_regclass('public.business_members') is null then
    raise exception 'public.business_members is missing.';
  end if;
end $$;

-- Expand roles so manager/creative work (safe if already applied)
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

-- >>> 056 artists + press kits

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

-- >>> 057 artist campaigns

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

-- >>> 058 reels / MVs

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
