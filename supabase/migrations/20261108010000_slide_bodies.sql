-- Real presentation content for Library nodes of kind='slide' (completion
-- audit K061: "Slides/presentations creation and collaborative editing --
-- Full product not found"). Mirrors the Sheets precedent
-- (20261107010000_sheet_bodies.sql) exactly: extend library_nodes.kind with
-- the new value, add a 1:1 body table reusing the existing
-- library_node_owner_id / library_share_permission SECURITY DEFINER helpers
-- for RLS, same owner/editor/viewer policy shape.

alter table public.library_nodes drop constraint if exists library_nodes_kind_check;
alter table public.library_nodes add constraint library_nodes_kind_check
  check (kind in ('folder', 'link', 'document', 'sheet', 'slide'));

-- A deck is an ordered array of slides. Each slide is a small, self-contained
-- JSON object: { id, name, backgroundColor, layers: [...], transitionKind,
-- transitionDurationMs }. Unlike Sheets' sparse per-cell map, a deck's own
-- slide order *is* meaningful content (not just a rendering hint), so it is
-- stored as an ordered jsonb array, not a keyed map.
create table if not exists public.slide_bodies (
  id uuid primary key references public.library_nodes(id) on delete cascade,
  slides jsonb not null default '[]'::jsonb,
  -- Artboard size in pixels, shared by every slide in the deck (changing it
  -- rescales layer coordinates client-side, so the stored layer x/y/width/
  -- height always assume this size -- the Studio canvas-document precedent
  -- for a 16:9 "pitch_deck_slide" artboard).
  width integer not null default 1920 check (width between 200 and 4096),
  height integer not null default 1080 check (height between 200 and 4096),
  updated_at timestamptz not null default now()
);

drop trigger if exists slide_bodies_set_updated_at on public.slide_bodies;
create trigger slide_bodies_set_updated_at before update on public.slide_bodies
for each row execute function public.set_updated_at();

alter table public.slide_bodies enable row level security;

drop policy if exists "Owners and recipients read slide_bodies" on public.slide_bodies;
create policy "Owners and recipients read slide_bodies"
  on public.slide_bodies for select
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) is not null
  );

-- Insert covers the lazy-create-on-first-save path: a deck's library_nodes
-- row can exist with no slide_bodies row yet (a brand-new, still-empty
-- deck). An editor (not just the owner) must be able to create that first
-- row, the same reasoning as Sheets.
drop policy if exists "Owners and editors write slide_bodies" on public.slide_bodies;
create policy "Owners and editors write slide_bodies"
  on public.slide_bodies for insert
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

drop policy if exists "Owners and editors update slide_bodies" on public.slide_bodies;
create policy "Owners and editors update slide_bodies"
  on public.slide_bodies for update
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  )
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

-- Only the owner can delete the body outright (matches sheet_bodies/
-- library_nodes' own delete policy).
drop policy if exists "Owners delete slide_bodies" on public.slide_bodies;
create policy "Owners delete slide_bodies"
  on public.slide_bodies for delete
  using (private.library_node_owner_id(id) = auth.uid());

grant select, insert, update, delete on public.slide_bodies to authenticated;
notify pgrst, 'reload schema';
