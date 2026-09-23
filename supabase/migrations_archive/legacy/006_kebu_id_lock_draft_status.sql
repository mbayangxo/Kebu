-- Kebu ID Slice 1 hardening: clients must not raise verification_level or leave draft via RLS.
-- Also allow creator cleanup of failed draft creates (CASCADE removes members/audit/idempotency).

drop policy if exists "Founders update own draft businesses" on public.businesses;
create policy "Founders update own draft businesses"
  on public.businesses for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  )
  with check (
    verification_level = 1
    and lifecycle_status = 'draft'
    and exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Creators delete own draft businesses" on public.businesses;
create policy "Creators delete own draft businesses"
  on public.businesses for delete
  using (
    created_by = auth.uid()
    and lifecycle_status = 'draft'
    and verification_level = 1
  );
