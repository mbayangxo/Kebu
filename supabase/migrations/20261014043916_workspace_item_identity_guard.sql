-- Content collaborators cannot replace a work item's identity or move its scope.
-- Keep existing row policies and caller permissions in force.
create schema if not exists private;
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
  end if;
  return new;
end;
$$;
revoke all on function private.guard_workspace_item_identity() from public;
drop trigger if exists guard_workspace_item_identity on public.workspace_items;
create trigger guard_workspace_item_identity before update on public.workspace_items
for each row execute function private.guard_workspace_item_identity();
