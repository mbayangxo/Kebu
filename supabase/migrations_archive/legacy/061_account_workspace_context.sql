-- P1: Unified Kebu Account workspace — persist active business context on personal profile.

alter table public.user_profiles
  add column if not exists active_business_id uuid references public.businesses(id) on delete set null;

create index if not exists user_profiles_active_business_idx
  on public.user_profiles (active_business_id)
  where active_business_id is not null;

comment on column public.user_profiles.active_business_id is
  'Active Business Kebu workspace (Kebu ID). Null = Personal Kebu context.';
