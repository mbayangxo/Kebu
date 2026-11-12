alter table public.studio_uploads
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

create index if not exists studio_uploads_business_idx
  on public.studio_uploads(business_id, created_at desc)
  where business_id is not null;

drop policy if exists "Owners manage studio uploads" on public.studio_uploads;

drop policy if exists "Users read scoped studio uploads" on public.studio_uploads;
create policy "Users read scoped studio uploads"
  on public.studio_uploads for select
  using (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members bm
        where bm.business_id = studio_uploads.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
      )
    )
  );

drop policy if exists "Users create scoped studio uploads" on public.studio_uploads;
create policy "Users create scoped studio uploads"
  on public.studio_uploads for insert
  with check (
    owner_id = auth.uid()
    and (
      business_id is null
      or exists (
        select 1 from public.business_members bm
        where bm.business_id = studio_uploads.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
      )
    )
  );

drop policy if exists "Users delete scoped studio uploads" on public.studio_uploads;
create policy "Users delete scoped studio uploads"
  on public.studio_uploads for delete
  using (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members bm
        where bm.business_id = studio_uploads.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
          and (owner_id = auth.uid() or bm.role in ('founder', 'administrator'))
      )
    )
  );
