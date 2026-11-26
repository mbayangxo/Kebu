-- Anonymous metadata must work without depending on broad grants on developer
-- profiles. Keep developer predicates scoped to the authenticated role.
drop policy if exists "Public read published marketplace templates" on public.marketplace_templates;
create policy "Public read published marketplace templates"
  on public.marketplace_templates for select to authenticated
  using (status = 'published' or exists (
    select 1 from public.developer_profiles dp
    where dp.id = marketplace_templates.developer_id and dp.user_id = (select auth.uid())
  ));
alter policy "Approved developers manage own templates" on public.marketplace_templates to authenticated;
drop policy if exists "Anonymous read marketplace template metadata" on public.marketplace_templates;
create policy "Anonymous read marketplace template metadata"
  on public.marketplace_templates for select to anon using (status = 'published');

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
