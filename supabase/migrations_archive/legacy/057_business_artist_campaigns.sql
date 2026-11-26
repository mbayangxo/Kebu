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
