-- Store grants are subordinate to active Kebu business membership.
alter table public.retail_locations add constraint retail_locations_business_id_id_key unique (business_id, id);

create table public.retail_staff_assignments (
  business_id uuid not null,
  location_id uuid not null,
  user_id uuid not null,
  capability text not null check (capability in ('register', 'kitchen', 'pickup')),
  primary key (location_id, user_id, capability),
  foreign key (business_id, location_id) references public.retail_locations (business_id, id) on delete cascade,
  foreign key (business_id, user_id) references public.business_members (business_id, user_id) on delete cascade
);

create index retail_staff_assignments_membership_idx
  on public.retail_staff_assignments (business_id, user_id);

alter table public.retail_staff_assignments enable row level security;
revoke all on public.retail_staff_assignments from public, anon, authenticated;
grant select, insert, delete on public.retail_staff_assignments to authenticated;

create policy retail_staff_admins on public.retail_staff_assignments
for all to authenticated
using (exists (
  select 1 from public.business_members m
  where m.business_id = retail_staff_assignments.business_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('founder', 'administrator')
))
with check (exists (
  select 1 from public.business_members m
  where m.business_id = retail_staff_assignments.business_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('founder', 'administrator')
));

create policy retail_staff_read_own on public.retail_staff_assignments
for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.business_members m
    where m.business_id = retail_staff_assignments.business_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);

create policy retail_locations_assigned_staff on public.retail_locations
for select to authenticated
using (active and exists (
  select 1 from public.retail_staff_assignments a
  where a.business_id = retail_locations.business_id
    and a.location_id = retail_locations.id and a.user_id = (select auth.uid())
));
