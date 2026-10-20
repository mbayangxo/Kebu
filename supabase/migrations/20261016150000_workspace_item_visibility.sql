-- K062: business-scoped Calendar/Tasks items currently have no permission
-- granularity — any active business_members row (any role, any status
-- besides inactive) grants full select/update/delete on EVERY business
-- item, with no concept of "this task is private to me within the team."
-- Confirmed via docs/KEBU-RECOVERED-REQUEST-AUDIT.md's K062 entry
-- ("permissions... remain open") and by reading the live policies in
-- 20260920086000_room_scope_hardening.sql.
--
-- Default is 'team' — identical to today's behavior for every existing row
-- and every row inserted before an item is explicitly marked private. This
-- adds a capability; it does not change current visibility for anyone.
-- Personal items (business_id is null) and room-scoped items are untouched
-- — this migration only changes the business_id-is-not-null branch of the
-- three affected policies.

alter table public.workspace_items
  add column if not exists visibility text not null default 'team' check (visibility in ('private', 'team'));

-- Extends the existing guard_workspace_item_identity trigger (20261014043916)
-- rather than adding a second mechanism: a non-owner business member could
-- otherwise flip another member's item to 'team' (exposing it) or to
-- 'private' (locking the real owner's team out of something that was
-- previously shared), even though the UPDATE policy above lets them touch
-- the row at all for ordinary fields like title/status.
create or replace function private.guard_workspace_item_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
      raise exception 'Work item ownership cannot be changed.' using errcode = '42501';
    end if;
    if (new.business_id is distinct from old.business_id or new.room_id is distinct from old.room_id)
       and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can move a work item.' using errcode = '42501';
    end if;
    if new.visibility is distinct from old.visibility and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can change a work item''s visibility.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_workspace_item_identity() from public;

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items" on public.workspace_items for select using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
);

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items" on public.workspace_items for update using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
) with check (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
);

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items" on public.workspace_items for delete using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
);
