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
