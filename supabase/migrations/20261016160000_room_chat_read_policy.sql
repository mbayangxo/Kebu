-- K063: room chat had an insert-only RLS policy on space_messages for
-- room-scoped channels (20260920085000_kebu_rooms.sql added "Room members
-- send room channel messages") but no matching select policy was ever
-- added. "Members read messages" (20260920083000_workspace_scope_hardening.sql)
-- only recognizes a channel's business_id, not its room_id, so a room
-- channel (business_id is null for a personal room) satisfies neither of
-- that policy's branches for anyone except the room's creator. Every other
-- room member could post into room chat but never read it back, including
-- their own messages. This adds the missing read policy, mirroring the
-- existing room-scoped insert policy's shape exactly.

drop policy if exists "Room members read room channel messages" on public.space_messages;
create policy "Room members read room channel messages" on public.space_messages for select using (
  exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id and c.room_id is not null and public.can_access_room(c.room_id)
  )
);
