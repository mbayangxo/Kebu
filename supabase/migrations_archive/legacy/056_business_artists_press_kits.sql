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
