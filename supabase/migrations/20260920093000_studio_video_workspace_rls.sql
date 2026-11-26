-- Studio video projects must follow the same Personal Kebu vs Business Kebu boundary
-- as designs. Personal projects remain owner-only. Business projects are visible to
-- current active business members; destructive edits require the project owner or a
-- founder/administrator in that business.

drop policy if exists "Owners manage studio video projects" on public.studio_video_projects;

drop policy if exists "Users read scoped studio video projects" on public.studio_video_projects;
create policy "Users read scoped studio video projects"
  on public.studio_video_projects for select
  using (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1
        from public.business_members bm
        where bm.business_id = studio_video_projects.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
      )
    )
  );

drop policy if exists "Users create scoped studio video projects" on public.studio_video_projects;
create policy "Users create scoped studio video projects"
  on public.studio_video_projects for insert
  with check (
    owner_id = auth.uid()
    and (
      business_id is null
      or exists (
        select 1
        from public.business_members bm
        where bm.business_id = studio_video_projects.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
      )
    )
  );

drop policy if exists "Users update scoped studio video projects" on public.studio_video_projects;
create policy "Users update scoped studio video projects"
  on public.studio_video_projects for update
  using (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1
        from public.business_members bm
        where bm.business_id = studio_video_projects.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
          and (studio_video_projects.owner_id = auth.uid() or bm.role in ('founder', 'administrator'))
      )
    )
  )
  with check (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1
        from public.business_members bm
        where bm.business_id = studio_video_projects.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
          and (studio_video_projects.owner_id = auth.uid() or bm.role in ('founder', 'administrator'))
      )
    )
  );

drop policy if exists "Users delete scoped studio video projects" on public.studio_video_projects;
create policy "Users delete scoped studio video projects"
  on public.studio_video_projects for delete
  using (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1
        from public.business_members bm
        where bm.business_id = studio_video_projects.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
          and (studio_video_projects.owner_id = auth.uid() or bm.role in ('founder', 'administrator'))
      )
    )
  );
