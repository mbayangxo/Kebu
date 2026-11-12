create or replace function public.can_access_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.archived_at is null
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.room_members rm
          where rm.room_id = r.id and rm.user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items" on public.workspace_items for select using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
);

drop policy if exists "Workspace members create items" on public.workspace_items;
create policy "Workspace members create items" on public.workspace_items for insert with check (
  room_id is null
  and owner_id = auth.uid()
  and (
    business_id is null
    or exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items" on public.workspace_items for update using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
) with check (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
);

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items" on public.workspace_items for delete using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
);

drop policy if exists "Room members update scoped work items" on public.workspace_items;
create policy "Room members update scoped work items" on public.workspace_items for update
using (room_id is not null and public.can_access_room(room_id))
with check (room_id is not null and public.can_access_room(room_id));

drop policy if exists "Room members delete scoped work items" on public.workspace_items;
create policy "Room members delete scoped work items" on public.workspace_items for delete
using (room_id is not null and public.can_access_room(room_id));
