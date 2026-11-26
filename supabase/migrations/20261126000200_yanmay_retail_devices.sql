create table public.retail_devices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  location_id uuid not null,
  label text not null check (length(trim(label)) between 1 and 80),
  kind text not null check (kind in ('register','kiosk','kitchen')),
  credential_hash text not null unique check (credential_hash ~ '^[0-9a-f]{64}$'),
  enrolled_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (business_id,location_id) references public.retail_locations(business_id,id) on delete cascade
);
create index retail_devices_business_idx on public.retail_devices(business_id);
alter table public.retail_devices enable row level security;
revoke all on public.retail_devices from public, anon, authenticated;
grant select (id,business_id,location_id,label,kind,enrolled_at,revoked_at), insert, update (revoked_at) on public.retail_devices to authenticated;

create policy retail_devices_read on public.retail_devices for select to authenticated using (exists (
  select 1 from public.business_members where business_id=retail_devices.business_id
    and user_id=(select auth.uid()) and status='active' and role in ('founder','administrator')
));
create policy retail_devices_enroll on public.retail_devices for insert to authenticated with check (
  revoked_at is null and exists (
    select 1 from public.business_members where business_id=retail_devices.business_id
      and user_id=(select auth.uid()) and status='active' and role in ('founder','administrator')
  ) and exists (
    select 1 from public.retail_locations where id=retail_devices.location_id and active
  )
);
create policy retail_devices_revoke on public.retail_devices for update to authenticated using (
  revoked_at is null and exists (
    select 1 from public.business_members where business_id=retail_devices.business_id
      and user_id=(select auth.uid()) and status='active' and role in ('founder','administrator')
  )
) with check (
  revoked_at is not null and exists (
    select 1 from public.business_members where business_id=retail_devices.business_id
      and user_id=(select auth.uid()) and status='active' and role in ('founder','administrator')
  )
);

create function public.retail_staff_roster(target_business uuid)
returns table(user_id uuid, email text, role text)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, u.email::text, m.role
  from public.business_members m join auth.users u on u.id=m.user_id
  where m.business_id=target_business and m.status='active' and exists (
    select 1 from public.business_members a where a.business_id=target_business
      and a.user_id=(select auth.uid()) and a.status='active' and a.role in ('founder','administrator')
  )
  order by u.email, m.user_id
$$;
revoke all on function public.retail_staff_roster(uuid) from public, anon;
grant execute on function public.retail_staff_roster(uuid) to authenticated;

create function public.retail_device_is_active(target_business uuid, fingerprint text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.retail_devices d
      join public.retail_locations l on l.id=d.location_id and l.active
      join public.business_members m on m.business_id=d.business_id
    where d.business_id=target_business and d.credential_hash=fingerprint and d.revoked_at is null
      and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','administrator')
  )
$$;
revoke all on function public.retail_device_is_active(uuid,text) from public, anon;
grant execute on function public.retail_device_is_active(uuid,text) to authenticated;
