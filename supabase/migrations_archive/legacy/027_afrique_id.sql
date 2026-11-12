-- Afrique ID: personal identity linked to Kebu account (separate from Kebu ID / business)

create table if not exists public.afrique_ids (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_afrique_id text not null unique check (char_length(public_afrique_id) between 12 and 24),
  country_code char(2) not null,
  eligibility_status text not null default 'unverified' check (
    eligibility_status in (
      'unverified', 'pending', 'verified', 'rejected', 'expired', 'suspended', 'manual_review'
    )
  ),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists afrique_ids_public_id_idx on public.afrique_ids (public_afrique_id);

alter table public.afrique_ids enable row level security;

drop policy if exists "Users read own Afrique ID" on public.afrique_ids;
create policy "Users read own Afrique ID"
  on public.afrique_ids for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own Afrique ID" on public.afrique_ids;
create policy "Users insert own Afrique ID"
  on public.afrique_ids for insert
  with check (auth.uid() = user_id);

drop policy if exists "Public read verified Afrique ID cards" on public.afrique_ids;
create policy "Public read verified Afrique ID cards"
  on public.afrique_ids for select
  using (eligibility_status = 'verified');

drop trigger if exists afrique_ids_set_updated_at on public.afrique_ids;
create trigger afrique_ids_set_updated_at
  before update on public.afrique_ids
  for each row execute function public.set_updated_at();

drop policy if exists "Users request Afrique ID verification" on public.afrique_ids;
create policy "Users request Afrique ID verification"
  on public.afrique_ids for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and eligibility_status = 'pending');

grant select, insert, update on public.afrique_ids to authenticated;
