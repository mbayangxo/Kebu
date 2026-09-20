-- Keep personal resources private to their owner and business resources scoped strictly to
-- current active business members. A creator/owner must not retain business-space access after
-- their membership is revoked.

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items" on public.workspace_items for select using (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items" on public.workspace_items for update using (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
) with check (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items" on public.workspace_items for delete using (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Members read channels" on public.space_channels;
create policy "Members read channels" on public.space_channels for select using (
  (business_id is null and created_by = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = space_channels.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Members update channels" on public.space_channels;
create policy "Members update channels" on public.space_channels for update using (
  (business_id is null and created_by = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = space_channels.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
) with check (
  (business_id is null and created_by = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = space_channels.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Members read messages" on public.space_messages;
create policy "Members read messages" on public.space_messages for select using (
  exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        (c.business_id is null and c.created_by = auth.uid())
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = c.business_id
              and m.user_id = auth.uid()
              and m.status = 'active'
          )
        )
      )
  )
);

drop policy if exists "Members send messages" on public.space_messages;
create policy "Members send messages" on public.space_messages for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        (c.business_id is null and c.created_by = auth.uid())
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = c.business_id
              and m.user_id = auth.uid()
              and m.status = 'active'
          )
        )
      )
  )
);
