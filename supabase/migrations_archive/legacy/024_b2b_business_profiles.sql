-- B2B trade profiles (visible only to other Kebu business members) + commerce mode on businesses

alter table public.businesses
  add column if not exists commerce_mode text not null default 'b2c'
    check (commerce_mode in ('b2c', 'b2b', 'both'));

create table if not exists public.business_b2b_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  headline text not null default '' check (char_length(headline) <= 160),
  about text not null default '' check (char_length(about) <= 2000),
  logo_url text not null default '' check (char_length(logo_url) <= 500),
  cover_url text not null default '' check (char_length(cover_url) <= 500),
  gallery_urls text[] not null default '{}',
  categories text[] not null default '{}',
  min_order_note text not null default '' check (char_length(min_order_note) <= 200),
  contact_email text check (contact_email is null or char_length(trim(contact_email)) between 3 and 254),
  contact_phone text check (contact_phone is null or char_length(trim(contact_phone)) between 5 and 40),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_b2b_profiles_published_idx
  on public.business_b2b_profiles (is_published, updated_at desc)
  where is_published = true;

alter table public.business_b2b_profiles enable row level security;

drop policy if exists "Business members browse published b2b profiles" on public.business_b2b_profiles;
create policy "Business members browse published b2b profiles"
  on public.business_b2b_profiles for select
  using (
    is_published = true
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Founders manage own b2b profile" on public.business_b2b_profiles;
create policy "Founders manage own b2b profile"
  on public.business_b2b_profiles for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_b2b_profiles.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_b2b_profiles.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop trigger if exists business_b2b_profiles_set_updated_at on public.business_b2b_profiles;
create trigger business_b2b_profiles_set_updated_at
  before update on public.business_b2b_profiles
  for each row execute function public.set_updated_at();
