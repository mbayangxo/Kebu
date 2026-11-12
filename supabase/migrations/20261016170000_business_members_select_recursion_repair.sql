-- Narrowly scoped forward repair for a reported defect in business_members'
-- own SELECT policy — NOT the deferred full businesses/business_members/
-- business_invites bootstrap (supabase/MIGRATION_HISTORY.md's "Bootstrap
-- limitation" remains open; this migration still assumes business_members
-- already exists, exactly like every other live migration that references
-- it as a foreign key, e.g. 20260920084000_kebu_mail_m1.sql). This does not
-- establish hosted/live-schema compatibility — it has only been exercised
-- against a locally reconstructed fixture matching the archived schema
-- (see tests/business/business-members-select-policy.local.test.ts).
--
-- Two policy variants for "Users select own memberships" have existed in
-- this repository's history, both defective, and this workspace has no
-- hosted access to confirm which (if either, verbatim) is currently live:
--
--   * The original (005_kebu_id_draft_business.sql /
--     APPLY_MIGRATIONS_005_007.sql / APPLY_ALL_PHASE_ONE.sql lines
--     613-621): `user_id = auth.uid() or exists (select 1 from
--     business_members m2 where m2.business_id = business_members.business_id
--     and m2.user_id = auth.uid() and m2.status = 'active' and m2.role in
--     ('founder','administrator'))` — a policy on business_members directly
--     re-querying business_members from inside itself: the same recursion
--     class already fixed for room_members (20261016162000) and
--     library_nodes/library_shares (20261016120000). On a live Postgres
--     this raises "infinite recursion detected in policy for relation
--     business_members" for any read that needs the second branch — i.e.
--     any founder/administrator trying to see a teammate's row.
--   * The later "fix" (020_fix_business_members_rls.sql): dropped the
--     second branch entirely, leaving `user_id = auth.uid()` only. This
--     removes the recursion but also removes the ability for a
--     founder/administrator to ever see a teammate's membership row — a
--     business's team roster can only ever show the viewer's own row.
--
-- This migration restores the ORIGINAL intended authorization (a
-- founder/administrator may read every member row of their own business;
-- everyone else sees only their own row) without the recursion, using a
-- SECURITY DEFINER helper that reads business_members bypassing its own
-- RLS — the same technique already used for private.is_room_admin, but
-- deliberately NOT copied verbatim: it takes no user-id parameter (it
-- always checks auth.uid() internally, mirroring can_access_room's shape
-- rather than is_room_admin's), so even if it were ever reachable outside
-- the policies that call it, it can only ever answer "is the CALLING user
-- an admin of this business" and cannot be used to probe any other user's
-- membership/role. It lives in the `private` schema (not exposed by
-- PostgREST's default schema config, the same boundary every other
-- private.* helper in this codebase relies on) and execution is restricted
-- to `authenticated`/`service_role` only.
--
-- `drop policy if exists` is issued for both known historical policy names
-- so this migration is safe to apply regardless of which variant is
-- currently live.

create schema if not exists private;

create or replace function private.is_active_business_admin(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.business_members m2
    where m2.business_id = p_business_id
      and m2.user_id = auth.uid()
      and m2.status = 'active'
      and m2.role in ('founder', 'administrator')
  );
$$;
revoke all on function private.is_active_business_admin(uuid) from public, anon;
grant execute on function private.is_active_business_admin(uuid) to authenticated, service_role;

drop policy if exists "Users select own memberships" on public.business_members;
create policy "Users select own memberships"
  on public.business_members for select
  using (
    user_id = auth.uid()
    or private.is_active_business_admin(business_id)
  );
