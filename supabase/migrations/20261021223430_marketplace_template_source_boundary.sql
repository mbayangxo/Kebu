-- Published marketplace cards are public metadata, never a grant to the
-- purchasable definition. A table-level SELECT overrides column revocations,
-- so remove both before granting the explicit metadata projection.
revoke select on public.marketplace_templates from public, anon, authenticated;
revoke select (definition) on public.marketplace_templates from public, anon, authenticated;
grant select (id, developer_id, slug, name, description, category, price_cents,
  preview_url, status, sales_count, created_at, updated_at)
  on public.marketplace_templates to anon, authenticated;
grant select on public.marketplace_templates to service_role;

-- A checkout snapshot is itself the purchased source. The browser library
-- exposes owned snapshots only; pending/failed snapshots remain available to
-- trusted checkout and settlement code, not the unpaid buyer's Data API.
-- Self-uploaded owned definitions and the owner's acquired snapshots retain
-- their existing read path. No document or payment state is rewritten.
drop policy if exists "Owners select aesthetic library" on public.aesthetic_library;
create policy "Owners select aesthetic library"
  on public.aesthetic_library for select to authenticated
  using (owner_id = (select auth.uid()) and status = 'owned');

notify pgrst, 'reload schema';
