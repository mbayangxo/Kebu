-- K063: every write to room_members has always failed with "infinite
-- recursion detected in policy for relation room_members" — including a
-- room's own creator inserting their own first owner-member row during
-- room creation (app/api/rooms/route.ts, no .select(), so the failure was
-- silently swallowed with no error check) and the "member" action adding
-- any second person to a room (app/api/rooms/[id]/route.ts, which DOES
-- check the error and would 500 every time). The only reason this stayed
-- invisible is that can_access_room()'s create_by-based branch already
-- gives the room's creator full access without ever needing a
-- room_members row to exist — so a single-person room looked entirely
-- functional while a room_members row was never actually created for
-- anyone, ever, and no second person could ever be added to any room.
--
-- Root cause: "Room admins manage membership" (20260920085000_kebu_rooms.sql)
-- is a policy ON room_members whose own USING/WITH CHECK directly queries
-- room_members again (aliased `self`) to check the caller's admin role —
-- a direct self-reference, the same recursion class already fixed for
-- library_nodes/library_shares in 20261016120000_library_sharing.sql.
-- Fixed the same way: a SECURITY DEFINER helper that reads room_members
-- bypassing its own RLS, so the policy no longer recurses into itself.

create schema if not exists private;

create or replace function private.is_room_admin(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.room_members rm
    where rm.room_id = p_room_id and rm.user_id = p_user_id and rm.role in ('owner', 'admin')
  );
$$;
revoke all on function private.is_room_admin(uuid, uuid) from public, anon;
grant execute on function private.is_room_admin(uuid, uuid) to authenticated, service_role;

drop policy if exists "Room admins manage membership" on public.room_members;
create policy "Room admins manage membership" on public.room_members for all using (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (r.created_by = auth.uid() or private.is_room_admin(r.id, auth.uid()))
  )
) with check (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (r.created_by = auth.uid() or private.is_room_admin(r.id, auth.uid()))
  )
);
