-- K063: room creation itself was completely broken for every user.
--
-- app/api/rooms/route.ts's POST handler creates a room with
-- `.insert({...}).select("*").single()` — INSERT ... RETURNING under the
-- hood. The rooms table's only SELECT policy, "Members read rooms", is a
-- bare `public.can_access_room(id)` call with no inline fallback, and
-- can_access_room's own body re-queries the `rooms` table (`where r.id =
-- p_room_id`) — the exact table the RETURNING clause's row was just
-- inserted into, in the same statement. This triggers a real, independently
-- confirmed upstream PostgreSQL defect (matches postgresql.org bug #19015:
-- "insert-returning failure: function in select policy doesn't see the
-- row the current statement just inserted") — not a local/CI artifact.
-- Reproduced here with a minimal isolated table outside any app schema,
-- and confirmed PostgREST's/postgrest-js's insert-with-select issues the
-- same INSERT ... RETURNING shape. The result: every call to POST
-- /api/rooms fails with "new row violates row-level security policy for
-- table rooms", for every user, unconditionally — Rooms could never
-- actually be created through the product's own UI.
--
-- The fix used elsewhere in this codebase for exactly this shape (see
-- library_nodes's "owner_id = auth.uid() or ..." policy in
-- 20261016120000_library_sharing.sql) is to give the policy an inline,
-- self-contained disjunct that resolves without invoking the
-- self-referencing function at all for the common case — the row's own
-- creator. Since POST /api/rooms always inserts with created_by = the
-- calling user, this disjunct is always what resolves the RETURNING
-- check for room creation, while can_access_room(id) remains for every
-- other real read (a non-creator member loading a room they did not
-- create) where the row is read-only, not self-referential, and was
-- never affected by this defect.

drop policy if exists "Members read rooms" on public.rooms;
create policy "Members read rooms" on public.rooms for select using (
  created_by = auth.uid() or public.can_access_room(id)
);
