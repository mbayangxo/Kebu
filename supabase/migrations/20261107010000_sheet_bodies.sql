-- Real spreadsheet content for Library nodes of kind='sheet' (completion audit
-- K060: "Sheets/Excel real spreadsheet types/formulas/editing -- Full product
-- not found"). library_nodes.kind already allows 'sheet' (confirmed: zero real
-- callers before this migration, unlike kind='document' which turned out to
-- already be served by a separate workspace_items system) -- this is the first
-- real use of it.
--
-- Cells store the raw input (a literal or a '='-prefixed formula string)
-- separately from any cached computed value, so reopening a sheet still shows
-- the real formula in the formula bar, not a frozen number. The real formula
-- *evaluation* happens via HyperFormula, client-side for live editing and
-- server-side (same library, same code) for export -- this table is just the
-- durable source of truth for raw input.
create table if not exists public.sheet_bodies (
  id uuid primary key references public.library_nodes(id) on delete cascade,
  -- Sparse cell map keyed by address, e.g. {"A1": {"raw": "12"}, "A4": {"raw": "=SUM(A1:A3)"}}.
  -- Only non-empty cells are stored; an absent key means an empty cell.
  cells jsonb not null default '{}'::jsonb,
  -- Sheet dimensions are advisory (grid UI sizing hints), not a hard limit --
  -- a cell address outside this range is still valid, just outside the
  -- initially-rendered viewport.
  row_count integer not null default 100 check (row_count between 1 and 10000),
  column_count integer not null default 26 check (column_count between 1 and 702),
  updated_at timestamptz not null default now()
);

drop trigger if exists sheet_bodies_set_updated_at on public.sheet_bodies;
create trigger sheet_bodies_set_updated_at before update on public.sheet_bodies
for each row execute function public.set_updated_at();

alter table public.sheet_bodies enable row level security;

-- Reuses the exact two SECURITY DEFINER helpers library_nodes/library_shares
-- already defined (20261016120000_library_sharing.sql) specifically to break
-- the owner/share RLS read cycle -- sheet_bodies.id IS the library_nodes.id
-- it belongs to (1:1), so the same helpers apply directly with no new ones.
drop policy if exists "Owners and recipients read sheet_bodies" on public.sheet_bodies;
create policy "Owners and recipients read sheet_bodies"
  on public.sheet_bodies for select
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) is not null
  );

-- Insert covers the lazy-create-on-first-save path: a sheet's library_nodes
-- row can exist with no sheet_bodies row yet (a brand-new, still-empty sheet).
-- An editor (not just the owner) must be able to create that first row --
-- otherwise a shared editor could never save content into a sheet they don't
-- own, which would make "editor" permission meaningless for Sheets.
drop policy if exists "Owners and editors write sheet_bodies" on public.sheet_bodies;
create policy "Owners and editors write sheet_bodies"
  on public.sheet_bodies for insert
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

drop policy if exists "Owners and editors update sheet_bodies" on public.sheet_bodies;
create policy "Owners and editors update sheet_bodies"
  on public.sheet_bodies for update
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  )
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

-- Only the owner can delete the body outright (matches library_nodes' own
-- "Owners delete library_nodes" policy -- an editor can edit content, not
-- destroy it).
drop policy if exists "Owners delete sheet_bodies" on public.sheet_bodies;
create policy "Owners delete sheet_bodies"
  on public.sheet_bodies for delete
  using (private.library_node_owner_id(id) = auth.uid());

grant select, insert, update, delete on public.sheet_bodies to authenticated;
notify pgrst, 'reload schema';
