create table public.retail_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{0,19}$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  address text not null check (char_length(btrim(address)) between 1 and 240),
  timezone text not null check (char_length(timezone) between 1 and 64),
  active boolean not null default true,
  unique (business_id, code)
);

alter table public.retail_locations enable row level security;
revoke all on public.retail_locations from public, anon, authenticated;
grant select, insert, update (active) on public.retail_locations to authenticated;

create policy retail_locations_managers
on public.retail_locations
for all to authenticated
using (exists (
  select 1 from public.business_members member
  where member.business_id = retail_locations.business_id
    and member.user_id = (select auth.uid())
    and member.status = 'active'
    and member.role in ('founder', 'administrator', 'store_manager')
))
with check (exists (
  select 1 from public.business_members member
  where member.business_id = retail_locations.business_id
    and member.user_id = (select auth.uid())
    and member.status = 'active'
    and member.role in ('founder', 'administrator', 'store_manager')
));
