-- ─────────────────────────────────────────────────────────────────────────────
-- 3C S4 — Kebu Creative Document (KCD) storage and database authority.
-- Design: docs/product/3C-DESIGN-FREEZE.md §7 (storage), §8 (concurrency), §14 (security),
-- §19 (per-project opt-in), §21 S4 (decisions recorded with the slice).
--
-- ADDITIVE ONLY. Existing rows keep their props; 3B keeps working unchanged:
--   • project_sections gains parent_id / order_key / node_version / type_version. order_key is
--     backfilled from sort_order and assigned automatically to rows 3B inserts. For projects on
--     the 3B path sort_order stays authoritative; order_key is authoritative only once a project
--     opts in (projects.document_schema_version = 'kcd-1'), which rebases it from sort_order.
--   • node_version / layout_version increase on EVERY content or structure change, whoever
--     writes (3B routes included), so a stale KCD client conflicts instead of overwriting.
--   • Structure is enforced at the table for every writer: parent on the same page (hence the
--     same project), no cycles, root/nested placement consistent with the node type.
--   • apply_node_ops is the only KCD write path: one transaction, all or nothing, versioned,
--     idempotent by txId, journaled (minimal), owner or service role only (never anon).
--   • Node CONTENT (type schemas, the 3B save boundary, unsafe content) is validated by the
--     TypeScript core in the API before this function is called (S4 decision 1); the database
--     enforces structure, identity, ordering, versions, authorization, limits and placement.
--
-- Node type ⇄ storage: legacy sections keep their 3B section_type at page root; the pilot
-- primitives store 'section' (root only) and 'group' / 'text' / 'image' (nested only). 'text' and
-- 'image' are also 3B section types — (section_type, parent_id IS NULL) identifies the type.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fractional order keys (identical to lib/creative-core/order-keys.ts; parity-tested) ──

create or replace function public.kcd_order_key_valid(k text)
returns boolean language sql immutable parallel safe as $$
  select k is not null and length(k) between 1 and 128 and k ~ '^[0-9A-Za-z]*[1-9A-Za-z]$'
$$;

-- Smallest-step key after `a` (null = first key "V").
create or replace function public.kcd_order_key_after(a text)
returns text language plpgsql immutable parallel safe as $$
declare
  digits constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  i int;
  ch text;
begin
  if a is null then return 'V'; end if;
  for i in 1..length(a) loop
    ch := substr(a, i, 1);
    if ch <> 'z' then
      return substr(a, 1, i - 1) || substr(digits, strpos(digits, ch) + 1, 1);
    end if;
  end loop;
  return a || 'V';
end $$;

-- `n` evenly spaced keys of equal short length (the backfill / rebalance layout).
create or replace function public.kcd_evenly_spaced_keys(n int)
returns text[] language plpgsql immutable parallel safe as $$
declare
  digits constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  len int := 1;
  space numeric := 62;
  out text[] := '{}';
  v numeric;
  s text;
  i int;
  d int;
begin
  if n is null or n < 0 then raise exception 'invalid key count %', n; end if;
  while space < 16 * (n + 1) loop
    len := len + 1;
    space := space * 62;
  end loop;
  for i in 1..n loop
    v := floor((i * space) / (n + 1));
    s := '';
    for d in 1..len loop
      s := substr(digits, (mod(v, 62))::int + 1, 1) || s;
      v := floor(v / 62);
    end loop;
    out := out || rtrim(s, '0');
  end loop;
  return out;
end $$;

-- ── 2. Storage columns ───────────────────────────────────────────────────────

alter table public.project_sections
  add column if not exists parent_id    uuid null references public.project_sections(id) on delete cascade,
  add column if not exists order_key    text collate "C",
  add column if not exists node_version bigint  not null default 1,
  add column if not exists type_version integer not null default 1;

-- Backfill: per page, 3B order (sort_order; ties by created_at, id), evenly spaced keys.
with ranked as (
  select id,
         row_number() over (partition by page_id order by sort_order, created_at, id) as rn,
         count(*)     over (partition by page_id) as n
  from public.project_sections
  where order_key is null
)
update public.project_sections s
set    order_key = (public.kcd_evenly_spaced_keys(r.n::int))[r.rn]
from   ranked r
where  s.id = r.id;

alter table public.project_sections alter column order_key set not null;

alter table public.project_sections drop constraint if exists project_sections_order_key_valid;
alter table public.project_sections
  add constraint project_sections_order_key_valid check (public.kcd_order_key_valid(order_key));

-- Sibling order keys are unique; checked at commit so a transaction may swap positions.
alter table public.project_sections drop constraint if exists project_sections_sibling_order_key;
alter table public.project_sections
  add constraint project_sections_sibling_order_key
  unique nulls not distinct (page_id, parent_id, order_key) deferrable initially immediate;

create index if not exists project_sections_parent_idx on public.project_sections (parent_id);

alter table public.project_pages add column if not exists layout_version bigint not null default 1;

alter table public.projects add column if not exists document_schema_version text null;
alter table public.projects drop constraint if exists projects_document_schema_version_check;
alter table public.projects
  add constraint projects_document_schema_version_check check (document_schema_version in ('kcd-1'));

alter table public.deployments
  add column if not exists schema_version text not null default 'website-v1',
  add column if not exists content_hash   text null;
alter table public.deployments drop constraint if exists deployments_schema_version_check;
alter table public.deployments
  add constraint deployments_schema_version_check check (schema_version in ('website-v1', 'kcd-1'));

-- Section types: the 3B list plus the pilot primitives ('text' / 'image' already present).
alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (
    section_type in (
      'navigation', 'hero', 'editorial-hero', 'announcement-bar', 'marquee',
      'split', 'category-tiles',
      'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
      'features', 'testimonials', 'faq', 'products',
      'quiz',
      'stats',
      'contact', 'newsletter', 'email-popup',
      'form', 'blog-list',
      'whatsapp', 'free-text', 'footer',
      'maylecor-home', 'maylecor-music',
      'legally-blonde-hero',
      'kdirection-home', 'kdirection-page',
      'section', 'group'
    )
  );

-- Placement consistent with the node type (see header): only text / image / group may nest.
alter table public.project_sections drop constraint if exists project_sections_placement_check;
alter table public.project_sections
  add constraint project_sections_placement_check
  check (parent_id is null or section_type in ('group', 'text', 'image'))
  not valid;
alter table public.project_sections validate constraint project_sections_placement_check;
alter table public.project_sections drop constraint if exists project_sections_group_nested_check;
alter table public.project_sections
  add constraint project_sections_group_nested_check check (section_type <> 'group' or parent_id is not null);

-- ── 3. Integrity triggers (every writer) ─────────────────────────────────────

-- New rows without a key (every 3B insert) go after their last sibling. The advisory lock
-- serializes concurrent inserts into one page, so two writers never pick the same key.
create or replace function public.kcd_assign_order_key()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.order_key is null then
    perform pg_advisory_xact_lock(hashtextextended('kcd-order:' || new.page_id::text, 0));
    select public.kcd_order_key_after(max(order_key collate "C"))
    into   new.order_key
    from   public.project_sections
    where  page_id = new.page_id and parent_id is not distinct from new.parent_id;
  end if;
  return new;
end $$;

drop trigger if exists kcd_assign_order_key on public.project_sections;
create trigger kcd_assign_order_key
  before insert on public.project_sections
  for each row execute function public.kcd_assign_order_key();

-- Nested or native elements exist only in opted-in projects (so 3B readers, restricted to page
-- roots, never miss content of a 3B-path project). A parent must be on the same page (hence the
-- same project) and never a descendant.
create or replace function public.kcd_check_parent()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cur uuid;
  hops int := 0;
begin
  if new.parent_id is null and new.section_type not in ('section', 'group') then return new; end if;
  if not exists (
    select 1 from public.project_pages pg join public.projects p on p.id = pg.project_id
    where pg.id = new.page_id and p.document_schema_version = 'kcd-1'
  ) then
    raise exception 'nested or native elements need a project on the Kebu Creative Document format'
      using errcode = 'check_violation';
  end if;
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then
    raise exception 'an element cannot be its own parent' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.project_sections p where p.id = new.parent_id and p.page_id = new.page_id) then
    raise exception 'parent % is not on the same page', new.parent_id using errcode = 'check_violation';
  end if;
  cur := new.parent_id;
  while cur is not null loop
    select parent_id into cur from public.project_sections where id = cur;
    if cur = new.id then
      raise exception 'parent cycle through %', new.id using errcode = 'check_violation';
    end if;
    hops := hops + 1;
    if hops > 10000 then raise exception 'parent chain too deep' using errcode = 'check_violation'; end if;
  end loop;
  return new;
end $$;

drop trigger if exists kcd_check_parent on public.project_sections;
create trigger kcd_check_parent
  before insert or update of parent_id, page_id, section_type on public.project_sections
  for each row execute function public.kcd_check_parent();

-- node_version increases on every content/structure change by any writer. apply_node_ops sets
-- versions itself (once per transaction) and marks its session so this trigger stands aside.
create or replace function public.kcd_bump_node_version()
returns trigger language plpgsql as $$
begin
  if current_setting('kcd.applying', true) = 'on' then return new; end if;
  if (new.props, new.parent_id, new.order_key, new.section_type, new.type_version, new.page_id)
     is distinct from (old.props, old.parent_id, old.order_key, old.section_type, old.type_version, old.page_id)
     and new.node_version = old.node_version then
    new.node_version := old.node_version + 1;
  end if;
  return new;
end $$;

drop trigger if exists kcd_bump_node_version on public.project_sections;
create trigger kcd_bump_node_version
  before update on public.project_sections
  for each row execute function public.kcd_bump_node_version();

create or replace function public.kcd_bump_layout_version()
returns trigger language plpgsql as $$
begin
  if current_setting('kcd.applying', true) = 'on' then return new; end if;
  if new.device_layouts is distinct from old.device_layouts and new.layout_version = old.layout_version then
    new.layout_version := old.layout_version + 1;
  end if;
  return new;
end $$;

drop trigger if exists kcd_bump_layout_version on public.project_pages;
create trigger kcd_bump_layout_version
  before update on public.project_pages
  for each row execute function public.kcd_bump_layout_version();

-- Opting in rebases each page's root keys from 3B's sort_order (order_key becomes authoritative);
-- opting out is refused while nested or primitive elements exist (§19). Enforced for every writer.
create or replace function public.kcd_document_schema_transition()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.document_schema_version is not distinct from old.document_schema_version then return new; end if;
  if new.document_schema_version = 'kcd-1' then
    perform set_config('kcd.applying', 'on', true);
    set constraints public.project_sections_sibling_order_key deferred;
    with ranked as (
      select s.id,
             row_number() over (partition by s.page_id order by s.sort_order, s.order_key collate "C", s.id) as rn,
             count(*)     over (partition by s.page_id) as n
      from   public.project_sections s
      join   public.project_pages pg on pg.id = s.page_id
      where  pg.project_id = new.id and s.parent_id is null
    )
    update public.project_sections s
    set    order_key = (public.kcd_evenly_spaced_keys(r.n::int))[r.rn],
           sort_order = r.rn - 1,
           node_version = s.node_version + case when s.order_key = (public.kcd_evenly_spaced_keys(r.n::int))[r.rn] then 0 else 1 end
    from   ranked r
    where  s.id = r.id;
    set constraints public.project_sections_sibling_order_key immediate;
    perform set_config('kcd.applying', 'off', true);
  else
    if exists (
      select 1 from public.project_sections s join public.project_pages pg on pg.id = s.page_id
      where  pg.project_id = new.id and (s.parent_id is not null or s.section_type in ('section', 'group'))
    ) then
      raise exception 'project % contains nested or native elements and cannot return to the 3B path', new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists kcd_document_schema_transition on public.projects;
create trigger kcd_document_schema_transition
  before update of document_schema_version on public.projects
  for each row execute function public.kcd_document_schema_transition();

-- Published snapshots are immutable: only status (and billing state) may change after insert.
create or replace function public.kcd_deployments_immutable()
returns trigger language plpgsql as $$
begin
  if (new.snapshot, new.schema_version, new.content_hash, new.project_id)
     is distinct from (old.snapshot, old.schema_version, old.content_hash, old.project_id) then
    raise exception 'published snapshots are immutable' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists kcd_deployments_immutable on public.deployments;
create trigger kcd_deployments_immutable
  before update on public.deployments
  for each row execute function public.kcd_deployments_immutable();

-- ── 4. Node type rules (generated from the TypeScript registry; parity-tested) ─

create table if not exists public.kcd_node_types (
  type             text primary key,
  storage_type     text not null,
  version          integer not null,
  placement        text not null check (placement in ('root', 'nested', 'any')),
  allowed_children text[] not null,
  max_children     integer null,
  overridable      text[] not null
);
alter table public.kcd_node_types enable row level security;
revoke all on public.kcd_node_types from anon, authenticated;

delete from public.kcd_node_types;
insert into public.kcd_node_types (type, storage_type, version, placement, allowed_children, max_children, overridable) values
  ('group', 'group', 1, 'nested', array['group', 'image', 'text']::text[], 50, array['align', 'direction', 'gap', 'justify', 'wrap']::text[]),
  ('image', 'image', 1, 'nested', '{}'::text[], null, array['aspectRatio', 'fit', 'src']::text[]),
  ('legacy-section:announcement-bar', 'announcement-bar', 1, 'root', '{}'::text[], null, array['href', 'text']::text[]),
  ('legacy-section:audio', 'audio', 1, 'root', '{}'::text[], null, array['heading']::text[]),
  ('legacy-section:before-after', 'before-after', 1, 'root', '{}'::text[], null, array['heading']::text[]),
  ('legacy-section:blog-list', 'blog-list', 1, 'root', '{}'::text[], null, array['heading']::text[]),
  ('legacy-section:category-tiles', 'category-tiles', 1, 'root', '{}'::text[], null, array['columns', 'heading']::text[]),
  ('legacy-section:contact', 'contact', 1, 'root', '{}'::text[], null, array['heading']::text[]),
  ('legacy-section:countdown', 'countdown', 1, 'root', '{}'::text[], null, array['heading', 'subheading']::text[]),
  ('legacy-section:editorial-hero', 'editorial-hero', 1, 'root', '{}'::text[], null, array['align', 'buttonLabel', 'eyebrow', 'heading', 'heightVh', 'overlayOpacity', 'secondaryButtonLabel', 'subheading']::text[]),
  ('legacy-section:email-popup', 'email-popup', 1, 'root', '{}'::text[], null, array['body', 'buttonLabel', 'enabled', 'heading']::text[]),
  ('legacy-section:events', 'events', 1, 'root', '{}'::text[], null, array['heading', 'items']::text[]),
  ('legacy-section:faq', 'faq', 1, 'root', '{}'::text[], null, array['heading', 'items']::text[]),
  ('legacy-section:features', 'features', 1, 'root', '{}'::text[], null, array['heading', 'layout', 'subheading']::text[]),
  ('legacy-section:floating-cta', 'floating-cta', 1, 'root', '{}'::text[], null, array['label', 'position']::text[]),
  ('legacy-section:footer', 'footer', 1, 'root', '{}'::text[], null, array['links', 'text']::text[]),
  ('legacy-section:form', 'form', 1, 'root', '{}'::text[], null, array['heading', 'subheading']::text[]),
  ('legacy-section:free-text', 'free-text', 1, 'root', '{}'::text[], null, array['blocks', 'minHeight']::text[]),
  ('legacy-section:gallery', 'gallery', 1, 'root', '{}'::text[], null, array['columns', 'heading', 'layout']::text[]),
  ('legacy-section:hero', 'hero', 1, 'root', '{}'::text[], null, array['align', 'buttonLabel', 'heading', 'secondaryButtonLabel', 'subheading']::text[]),
  ('legacy-section:hotspot-image', 'hotspot-image', 1, 'root', '{}'::text[], null, array['heading']::text[]),
  ('legacy-section:image', 'image', 1, 'root', '{}'::text[], null, array['alt', 'caption', 'src']::text[]),
  ('legacy-section:joko', 'joko', 1, 'root', '{}'::text[], null, array['jokoPayLink', 'label', 'phone']::text[]),
  ('legacy-section:kdirection-home', 'kdirection-home', 1, 'root', '{}'::text[], null, array['brandLine1', 'brandLine2', 'collagePhotos', 'mission']::text[]),
  ('legacy-section:kdirection-page', 'kdirection-page', 1, 'root', '{}'::text[], null, array['body', 'subtitle', 'title']::text[]),
  ('legacy-section:legally-blonde-hero', 'legally-blonde-hero', 1, 'root', '{}'::text[], null, array['extraCutouts', 'hiddenLayers', 'layerScales', 'navDisplay', 'subtitle', 'title']::text[]),
  ('legacy-section:map', 'map', 1, 'root', '{}'::text[], null, array['address', 'heading']::text[]),
  ('legacy-section:marquee', 'marquee', 1, 'root', '{}'::text[], null, array['items', 'speed']::text[]),
  ('legacy-section:maylecor-home', 'maylecor-home', 1, 'root', '{}'::text[], null, array['artistName']::text[]),
  ('legacy-section:maylecor-music', 'maylecor-music', 1, 'root', '{}'::text[], null, array['artistName']::text[]),
  ('legacy-section:navigation', 'navigation', 1, 'root', '{}'::text[], null, array['brand', 'logoAlign', 'navLayout', 'navScale', 'navSize', 'navSticky']::text[]),
  ('legacy-section:newsletter', 'newsletter', 1, 'root', '{}'::text[], null, array['heading', 'subheading']::text[]),
  ('legacy-section:products', 'products', 1, 'root', '{}'::text[], null, array['columns', 'heading', 'layout']::text[]),
  ('legacy-section:quiz', 'quiz', 1, 'root', '{}'::text[], null, array['ctaLabel', 'heading', 'subheading']::text[]),
  ('legacy-section:reviews', 'reviews', 1, 'root', '{}'::text[], null, array['heading']::text[]),
  ('legacy-section:social-proof', 'social-proof', 1, 'root', '{}'::text[], null, array['items', 'position']::text[]),
  ('legacy-section:split', 'split', 1, 'root', '{}'::text[], null, array['body', 'heading', 'imagePosition']::text[]),
  ('legacy-section:stats', 'stats', 1, 'root', '{}'::text[], null, array['heading', 'layout']::text[]),
  ('legacy-section:testimonials', 'testimonials', 1, 'root', '{}'::text[], null, array['heading']::text[]),
  ('legacy-section:text', 'text', 1, 'root', '{}'::text[], null, array['body', 'heading']::text[]),
  ('legacy-section:trust-badges', 'trust-badges', 1, 'root', '{}'::text[], null, array['items', 'layout']::text[]),
  ('legacy-section:video', 'video', 1, 'root', '{}'::text[], null, array['columns', 'heading', 'layout']::text[]),
  ('legacy-section:whatsapp', 'whatsapp', 1, 'root', '{}'::text[], null, array['label', 'phone']::text[]),
  ('section', 'section', 1, 'root', array['group', 'image', 'text']::text[], 50, array['align', 'paddingY', 'width']::text[]),
  ('text', 'text', 1, 'nested', '{}'::text[], null, array['align', 'text', 'variant']::text[]);

-- ── 5. Minimal operation journal (§14, approval confirmation 3) ──────────────
-- Never documents, prop values, labels, large payloads, sensitive content or secrets: identity,
-- actor/path, op types and count, expected/resulting versions, removed ids with their versions
-- (tombstones that let Undo restore the SAME ids), result, timestamp, small diagnostics.

create table if not exists public.creative_op_journal (
  id                bigint generated always as identity primary key,
  tx_id             uuid not null,
  project_id        uuid not null references public.projects(id) on delete cascade,
  actor_id          uuid null,
  execution_path    text not null check (execution_path in ('owner', 'service')),
  origin            text not null check (origin in ('user', 'ai', 'system', 'migration')),
  op_types          text[] not null,
  op_count          integer not null,
  expected_versions jsonb not null,
  result_versions   jsonb null,
  removed_nodes     jsonb null,
  status            text not null check (status in ('committed', 'rejected', 'conflicted')),
  error_code        text null,
  diagnostic        jsonb null,
  created_at        timestamptz not null default now()
);

create unique index if not exists creative_op_journal_committed_tx_uidx
  on public.creative_op_journal (tx_id) where status = 'committed';
create index if not exists creative_op_journal_project_idx on public.creative_op_journal (project_id, id desc);
create index if not exists creative_op_journal_removed_idx on public.creative_op_journal using gin (removed_nodes) where removed_nodes is not null;

alter table public.creative_op_journal enable row level security;
revoke all on public.creative_op_journal from anon, authenticated;
grant select on public.creative_op_journal to authenticated;
drop policy if exists "Owners read own journal" on public.creative_op_journal;
create policy "Owners read own journal"
  on public.creative_op_journal for select to authenticated
  using (exists (select 1 from public.projects p where p.id = creative_op_journal.project_id and p.owner_id = auth.uid()));

-- ── 6. apply_node_ops ────────────────────────────────────────────────────────

-- KCD node type of a stored row.
create or replace function public.kcd_node_type(p_section_type text, p_parent_id uuid)
returns text language sql immutable parallel safe as $$
  select case
    when p_section_type in ('section', 'group') then p_section_type
    when p_section_type in ('text', 'image') and p_parent_id is not null then p_section_type
    else 'legacy-section:' || p_section_type
  end
$$;

-- Errors raised inside a transaction; apply_node_ops turns them into results + journal rows.
create or replace function public.kcd__fail(p_code text, p_message text, p_op int default null)
returns void language plpgsql as $$
begin
  raise exception using
    errcode = case p_code when 'KCD_LIMIT' then 'KCLIM' else 'KCINV' end,
    message = p_message,
    detail = jsonb_build_object('opIndex', p_op)::text;
end $$;

-- Value at a path of plain objects, or null (arrays and scalars are never traversed).
create or replace function public.kcd__read_path(p_obj jsonb, p_path text[])
returns jsonb language plpgsql immutable as $$
declare
  cur jsonb := p_obj;
  seg text;
begin
  foreach seg in array p_path loop
    if cur is null or jsonb_typeof(cur) <> 'object' or not (cur ? seg) then return null; end if;
    cur := cur -> seg;
  end loop;
  return cur;
end $$;

-- Write (p_delete = false) or remove a path, creating intermediate objects (core writePath).
create or replace function public.kcd__write_path(p_obj jsonb, p_path text[], p_value jsonb, p_delete boolean, p_op int)
returns jsonb language plpgsql immutable as $$
declare
  head text := p_path[1];
  child jsonb;
begin
  if array_length(p_path, 1) = 1 then
    if p_delete then return p_obj - head; end if;
    return p_obj || jsonb_build_object(head, p_value);
  end if;
  child := p_obj -> head;
  if child is not null and jsonb_typeof(child) <> 'object' then
    perform public.kcd__fail('KCD_INVALID', format('Cannot set "%s" inside a non-object value', array_to_string(p_path, '.')), p_op);
  end if;
  if child is null and p_delete then return p_obj; end if;
  return p_obj || jsonb_build_object(head, public.kcd__write_path(coalesce(child, '{}'::jsonb), p_path[2:], p_value, p_delete, p_op));
end $$;

create or replace function public.kcd__parse_path(p_path jsonb, p_op int)
returns text[] language plpgsql immutable as $$
declare
  segs text[];
  seg text;
begin
  if p_path is null or jsonb_typeof(p_path) <> 'string' or p_path #>> '{}' = '' then
    perform public.kcd__fail('KCD_INVALID', 'Property path is required', p_op);
  end if;
  segs := string_to_array(p_path #>> '{}', '.');
  if array_length(segs, 1) > 8 then perform public.kcd__fail('KCD_LIMIT', 'Property path is too deep', p_op); end if;
  foreach seg in array segs loop
    if seg = '' then perform public.kcd__fail('KCD_INVALID', 'Invalid property path', p_op); end if;
    if seg in ('__proto__', 'prototype', 'constructor') then perform public.kcd__fail('KCD_INVALID', 'Forbidden property path', p_op); end if;
  end loop;
  if segs[1] in ('deviceOverrides', '_motion', '_a11y', '_visibility', '_interaction', '_dataBinding', '_locked') then
    perform public.kcd__fail('KCD_INVALID', format('"%s" is managed by a dedicated operation', segs[1]), p_op);
  end if;
  return segs;
end $$;

-- A node payload (insert / restore) → the 3B stored props shape.
create or replace function public.kcd__stored_props(p_node jsonb, p_op int)
returns jsonb language plpgsql immutable as $$
declare
  props jsonb := p_node -> 'props';
  ov jsonb := coalesce(p_node -> 'overrides', '{}'::jsonb);
  bucket jsonb := '{}'::jsonb;
  k text;
begin
  for k in select jsonb_object_keys(p_node) loop
    if k not in ('id', 'type', 'typeVersion', 'pageId', 'parentId', 'orderKey', 'props', 'overrides', 'responsiveState',
                 'visibility', 'a11y', 'motion', 'interaction', 'dataBinding', 'locked', 'unknown', 'version') then
      perform public.kcd__fail('KCD_INVALID', format('Unknown element field "%s"', k), p_op);
    end if;
  end loop;
  if p_node ? 'unknown' and jsonb_typeof(p_node -> 'unknown') = 'object' and p_node -> 'unknown' <> '{}'::jsonb then
    perform public.kcd__fail('KCD_INVALID', 'Elements with unrecognized data cannot be stored', p_op);
  end if;
  if props is null or jsonb_typeof(props) <> 'object' then perform public.kcd__fail('KCD_INVALID', 'props must be an object', p_op); end if;
  for k in select jsonb_object_keys(props) loop
    if k in ('deviceOverrides', '_motion', '_a11y', '_visibility', '_interaction', '_dataBinding', '_locked', '__proto__', 'prototype', 'constructor') then
      perform public.kcd__fail('KCD_INVALID', format('Invalid prop key "%s"', k), p_op);
    end if;
  end loop;
  if jsonb_typeof(ov) <> 'object' then perform public.kcd__fail('KCD_INVALID', 'overrides must be an object', p_op); end if;
  for k in select jsonb_object_keys(ov) loop
    if k not in ('tablet', 'mobile') then perform public.kcd__fail('KCD_INVALID', format('Unknown device "%s"', k), p_op); end if;
    if jsonb_typeof(ov -> k) <> 'object' then perform public.kcd__fail('KCD_INVALID', 'Device overrides must be objects', p_op); end if;
    bucket := bucket || jsonb_build_object(k, ov -> k);
  end loop;
  if p_node ? 'responsiveState' then bucket := bucket || jsonb_build_object('_state', p_node -> 'responsiveState'); end if;
  if bucket <> '{}'::jsonb then props := props || jsonb_build_object('deviceOverrides', bucket); end if;
  if p_node ? 'motion'      then props := props || jsonb_build_object('_motion', p_node -> 'motion'); end if;
  if p_node ? 'a11y'        then props := props || jsonb_build_object('_a11y', p_node -> 'a11y'); end if;
  if p_node ? 'visibility'  then props := props || jsonb_build_object('_visibility', p_node -> 'visibility'); end if;
  if p_node ? 'interaction' then props := props || jsonb_build_object('_interaction', p_node -> 'interaction'); end if;
  if p_node ? 'dataBinding' then props := props || jsonb_build_object('_dataBinding', p_node -> 'dataBinding'); end if;
  if p_node ? 'locked' then
    if jsonb_typeof(p_node -> 'locked') <> 'boolean' then perform public.kcd__fail('KCD_INVALID', 'locked must be a boolean', p_op); end if;
    props := props || jsonb_build_object('_locked', p_node -> 'locked');
  end if;
  if octet_length(props::text) > 320 * 1024 then
    perform public.kcd__fail('KCD_LIMIT', format('Element %s is too large', p_node ->> 'id'), p_op);
  end if;
  return props;
end $$;

-- Node row of this project, or null.
create or replace function public.kcd__node(p_project_id uuid, p_id uuid)
returns public.project_sections language sql stable as $$
  select s.* from public.project_sections s join public.project_pages pg on pg.id = s.page_id
  where s.id = p_id and pg.project_id = p_project_id
$$;

-- Placement rules (core checkPlacement) for `p_type` under `p_parent_id` on `p_page_id`.
create or replace function public.kcd__check_placement(p_project_id uuid, p_page_id uuid, p_parent_id uuid, p_type text, p_op int)
returns void language plpgsql stable as $$
declare
  r public.kcd_node_types;
  parent public.project_sections;
  pr public.kcd_node_types;
begin
  if not exists (select 1 from public.project_pages where id = p_page_id and project_id = p_project_id) then
    perform public.kcd__fail('KCD_INVALID', format('Page %s does not exist', p_page_id), p_op);
  end if;
  select * into r from public.kcd_node_types where type = p_type;
  if not found then perform public.kcd__fail('KCD_INVALID', format('Unknown element type "%s"', p_type), p_op); end if;
  if p_parent_id is null then
    if r.placement = 'nested' then perform public.kcd__fail('KCD_INVALID', format('"%s" must be placed inside another element', p_type), p_op); end if;
    return;
  end if;
  parent := public.kcd__node(p_project_id, p_parent_id);
  if parent.id is null then perform public.kcd__fail('KCD_INVALID', format('Parent %s does not exist', p_parent_id), p_op); end if;
  if parent.page_id <> p_page_id then perform public.kcd__fail('KCD_INVALID', 'An element and its parent must be on the same page', p_op); end if;
  if r.placement = 'root' then perform public.kcd__fail('KCD_INVALID', format('"%s" can only be placed at the top level of a page', p_type), p_op); end if;
  select * into pr from public.kcd_node_types where type = public.kcd_node_type(parent.section_type, parent.parent_id);
  if not found or not (p_type = any (pr.allowed_children)) then
    perform public.kcd__fail('KCD_INVALID', format('"%s" cannot contain "%s"', public.kcd_node_type(parent.section_type, parent.parent_id), p_type), p_op);
  end if;
end $$;

create or replace function public.kcd__slot(p_page_id uuid, p_parent_id uuid)
returns text language sql immutable as $$ select p_page_id::text || '|' || coalesce(p_parent_id::text, '') $$;

create or replace function public.kcd__is_uuid(p jsonb, p_v4 boolean)
returns boolean language sql immutable as $$
  select p is not null and jsonb_typeof(p) = 'string' and (p #>> '{}') ~ case when p_v4
    then '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    else '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' end
$$;

-- The transaction body. Raises KCINV / KCLIM / KCCON; the caller rolls back and journals.
create or replace function public.kcd__apply(p_project_id uuid, p_tx jsonb)
returns jsonb language plpgsql as $$
declare
  v_ops      jsonb := p_tx -> 'ops';
  v_expect   jsonb := p_tx -> 'expect';
  v_op       jsonb;
  v_i        int := -1;
  v_name     text;
  v_addr     text[] := '{}';
  v_conf     jsonb := '[]';
  v_touched  uuid[] := '{}';
  v_inserted uuid[] := '{}';
  v_restored jsonb := '{}';
  v_removed  jsonb := '{}';
  v_pages    uuid[] := '{}';
  v_slots    text[] := '{}';
  v_rebal    text[] := '{}';
  v_keys     jsonb := '{}';
  v_node     public.project_sections;
  v_rules    public.kcd_node_types;
  v_n        jsonb;
  v_batch    uuid[];
  v_top      uuid;
  v_id       uuid;
  v_parent   uuid;
  v_page     uuid;
  v_segs     text[];
  v_props    jsonb;
  v_bucket   jsonb;
  v_ver      bigint;
  v_type     text;
  v_key      text;
  v_slot     text;
  v_layouts  jsonb;
  v_comp     jsonb;
  v_cur      uuid;
  v_actual   bigint;
  v_versions jsonb := '{}';
  v_k        text;
  v_kids     record;
  v_new      text[];
  v_idx      int;
begin
  perform set_config('kcd.applying', 'on', true);
  set constraints public.project_sections_sibling_order_key deferred;

  -- Expected versions (core addressedIds / checkVersions): every existing node or page addressed.
  for v_op in select * from jsonb_array_elements(v_ops) loop
    v_name := v_op ->> 'op';
    if v_name in ('insertNode', 'insertSubtree', 'restoreSubtree') then continue; end if;
    if v_name = 'setDeviceComposition' then
      if public.kcd__is_uuid(v_op -> 'pageId', false)
         and exists (select 1 from public.project_pages where id = (v_op ->> 'pageId')::uuid and project_id = p_project_id) then
        v_addr := v_addr || (v_op ->> 'pageId');
      end if;
    elsif public.kcd__is_uuid(v_op -> 'id', false) and (public.kcd__node(p_project_id, (v_op ->> 'id')::uuid)).id is not null then
      v_addr := v_addr || (v_op ->> 'id');
    end if;
  end loop;
  select coalesce(array_agg(distinct a order by a), '{}') into v_addr from unnest(v_addr) a;
  -- Lock addressed rows in id order (the project row is already locked by the caller).
  perform 1 from public.project_sections where id = any (v_addr::uuid[]) order by id for update;
  perform 1 from public.project_pages    where id = any (v_addr::uuid[]) order by id for update;
  foreach v_k in array v_addr loop
    select node_version into v_actual from public.project_sections where id = v_k::uuid;
    if not found then select layout_version into v_actual from public.project_pages where id = v_k::uuid; end if;
    if not (v_expect ? v_k) then perform public.kcd__fail('KCD_INVALID', format('Missing expected version for %s', v_k)); end if;
    if (v_expect ->> v_k)::bigint <> v_actual then
      v_conf := v_conf || jsonb_build_object('id', v_k, 'expected', (v_expect ->> v_k)::bigint, 'actual', v_actual);
    end if;
  end loop;
  if jsonb_array_length(v_conf) > 0 then
    raise exception using errcode = 'KCCON', message = 'Changed elsewhere — reload to continue', detail = v_conf::text;
  end if;

  for v_op in select * from jsonb_array_elements(v_ops) loop
    v_i := v_i + 1;
    v_name := v_op ->> 'op';

    if v_name in ('insertNode', 'insertSubtree') then
      if v_name = 'insertNode' then
        if jsonb_typeof(v_op -> 'node') is distinct from 'object' then perform public.kcd__fail('KCD_INVALID', 'Element must be an object', v_i); end if;
        v_n := jsonb_build_array((v_op -> 'node') || jsonb_build_object('pageId', v_op -> 'pageId', 'parentId', v_op -> 'parentId', 'orderKey', v_op -> 'orderKey'));
      else
        v_n := v_op -> 'nodes';
        if jsonb_typeof(v_n) is distinct from 'array' or jsonb_array_length(v_n) = 0 then
          perform public.kcd__fail('KCD_INVALID', 'insertSubtree needs at least one element', v_i);
        end if;
      end if;
      v_batch := '{}';
      for v_idx in 0 .. jsonb_array_length(v_n) - 1 loop
        v_op := v_n -> v_idx;
        if jsonb_typeof(v_op) is distinct from 'object' then perform public.kcd__fail('KCD_INVALID', 'Element must be an object', v_i); end if;
        if not public.kcd__is_uuid(v_op -> 'id', true) then perform public.kcd__fail('KCD_INVALID', 'New element ids must be UUID v4', v_i); end if;
        v_id := (v_op ->> 'id')::uuid;
        if exists (select 1 from public.project_sections where id = v_id) or v_removed ? v_id::text
           or exists (select 1 from public.creative_op_journal where project_id = p_project_id and status = 'committed' and removed_nodes ? v_id::text) then
          perform public.kcd__fail('KCD_INVALID', format('Element id %s is already in use', v_id), v_i);
        end if;
        if jsonb_typeof(v_op -> 'parentId') = 'null' or v_op -> 'parentId' is null then v_parent := null;
        elsif public.kcd__is_uuid(v_op -> 'parentId', false) then v_parent := (v_op ->> 'parentId')::uuid;
        else perform public.kcd__fail('KCD_INVALID', 'parentId must be a UUID or null', v_i);
        end if;
        if v_name = 'insertSubtree' and v_parent is not null and not (v_parent = any (v_batch))
           and exists (select 1 from jsonb_array_elements(v_n) m where m ->> 'id' = v_parent::text) then
          perform public.kcd__fail('KCD_INVALID', 'insertSubtree must list parents before their children', v_i);
        end if;
        if not public.kcd__is_uuid(v_op -> 'pageId', false) then perform public.kcd__fail('KCD_INVALID', 'pageId must be a UUID', v_i); end if;
        v_page := (v_op ->> 'pageId')::uuid;
        v_type := v_op ->> 'type';
        select * into v_rules from public.kcd_node_types where type = v_type;
        if not found then perform public.kcd__fail('KCD_INVALID', format('Unknown element type "%s"', v_type), v_i); end if;
        if (v_op ->> 'typeVersion') is distinct from v_rules.version::text then
          perform public.kcd__fail('KCD_INVALID', format('"%s" must be created at version %s', v_type, v_rules.version), v_i);
        end if;
        if not public.kcd_order_key_valid(v_op ->> 'orderKey') or jsonb_typeof(v_op -> 'orderKey') <> 'string' then
          perform public.kcd__fail('KCD_INVALID', 'Invalid order key', v_i);
        end if;
        perform public.kcd__check_placement(p_project_id, v_page, v_parent, v_type, v_i);
        insert into public.project_sections (id, page_id, parent_id, section_type, sort_order, props, order_key, node_version, type_version)
        values (v_id, v_page, v_parent, v_rules.storage_type, 0, public.kcd__stored_props(v_op, v_i), v_op ->> 'orderKey', 1, v_rules.version);
        v_inserted := v_inserted || v_id;
        v_batch := v_batch || v_id;
        v_slots := v_slots || public.kcd__slot(v_page, v_parent);
      end loop;

    elsif v_name = 'removeNode' then
      if not public.kcd__is_uuid(v_op -> 'id', false) then perform public.kcd__fail('KCD_INVALID', 'Element id is required', v_i); end if;
      v_node := public.kcd__node(p_project_id, (v_op ->> 'id')::uuid);
      if v_node.id is null then perform public.kcd__fail('KCD_INVALID', format('Element %s does not exist', v_op ->> 'id'), v_i); end if;
      for v_kids in
        with recursive sub as (
          select id, node_version from public.project_sections where id = v_node.id
          union all
          select s.id, s.node_version from public.project_sections s join sub on s.parent_id = sub.id
        ) select * from sub
      loop
        if v_kids.id = any (v_inserted) then v_inserted := array_remove(v_inserted, v_kids.id);
        elsif v_restored ? v_kids.id::text then v_restored := v_restored - v_kids.id::text;
        else v_removed := v_removed || jsonb_build_object(v_kids.id::text, v_kids.node_version);
        end if;
        v_touched := array_remove(v_touched, v_kids.id);
      end loop;
      delete from public.project_sections where id = v_node.id;
      v_slots := v_slots || public.kcd__slot(v_node.page_id, v_node.parent_id);

    elsif v_name = 'restoreSubtree' then
      v_n := v_op -> 'nodes';
      if jsonb_typeof(v_n) is distinct from 'array' or jsonb_array_length(v_n) = 0 then
        perform public.kcd__fail('KCD_INVALID', 'restoreSubtree needs at least one element', v_i);
      end if;
      v_batch := '{}';
      v_top := null;
      for v_idx in 0 .. jsonb_array_length(v_n) - 1 loop
        v_op := v_n -> v_idx;
        if jsonb_typeof(v_op) is distinct from 'object' or not public.kcd__is_uuid(v_op -> 'id', false) then
          perform public.kcd__fail('KCD_INVALID', 'Restored elements need their original ids', v_i);
        end if;
        v_id := (v_op ->> 'id')::uuid;
        if exists (select 1 from public.project_sections where id = v_id) then perform public.kcd__fail('KCD_INVALID', format('Element %s already exists', v_id), v_i); end if;
        if jsonb_typeof(v_op -> 'version') is distinct from 'number' or (v_op ->> 'version')::numeric < 1
           or (v_op ->> 'version')::numeric <> floor((v_op ->> 'version')::numeric) then
          perform public.kcd__fail('KCD_INVALID', 'Restored elements need their recorded version', v_i);
        end if;
        if jsonb_typeof(v_op -> 'orderKey') is distinct from 'string' or not public.kcd_order_key_valid(v_op ->> 'orderKey') then
          perform public.kcd__fail('KCD_INVALID', 'Invalid order key', v_i);
        end if;
        if not public.kcd__is_uuid(v_op -> 'pageId', false) then perform public.kcd__fail('KCD_INVALID', 'pageId must be a UUID', v_i); end if;
        v_page := (v_op ->> 'pageId')::uuid;
        v_parent := case when public.kcd__is_uuid(v_op -> 'parentId', false) then (v_op ->> 'parentId')::uuid else null end;
        if v_op -> 'parentId' is not null and jsonb_typeof(v_op -> 'parentId') <> 'null' and v_parent is null then
          perform public.kcd__fail('KCD_INVALID', 'parentId must be a UUID or null', v_i);
        end if;
        v_type := v_op ->> 'type';
        select * into v_rules from public.kcd_node_types where type = v_type;
        if not found then perform public.kcd__fail('KCD_INVALID', format('Unknown element type "%s"', v_type), v_i); end if;
        if v_parent is not null and v_parent = any (v_batch) then
          if (select page_id from public.project_sections where id = v_parent) <> v_page then
            perform public.kcd__fail('KCD_INVALID', 'An element and its parent must be on the same page', v_i);
          end if;
        else
          if v_top is not null then perform public.kcd__fail('KCD_INVALID', 'restoreSubtree restores exactly one subtree, parents first', v_i); end if;
          v_top := v_id;
          perform public.kcd__check_placement(p_project_id, v_page, v_parent, v_type, v_i);
        end if;
        -- Only ids removed in THIS document may come back: in this transaction, or as recorded
        -- by the journal at their removed version.
        if v_removed ? v_id::text then
          v_ver := (v_removed ->> v_id::text)::bigint;
          v_removed := v_removed - v_id::text;
          v_touched := v_touched || v_id;
        else
          select (removed_nodes ->> v_id::text)::bigint into v_ver
          from public.creative_op_journal
          where project_id = p_project_id and status = 'committed' and removed_nodes ? v_id::text
          order by id desc limit 1;
          if v_ver is null then
            perform public.kcd__fail('KCD_INVALID', format('Element %s was not removed from this document', v_id), v_i);
          end if;
          if v_ver <> (v_op ->> 'version')::bigint then
            perform public.kcd__fail('KCD_INVALID', format('Element %s must be restored at its removed version %s', v_id, v_ver), v_i);
          end if;
          v_ver := v_ver + 1;
          v_restored := v_restored || jsonb_build_object(v_id::text, v_ver);
        end if;
        insert into public.project_sections (id, page_id, parent_id, section_type, sort_order, props, order_key, node_version, type_version)
        values (v_id, v_page, v_parent, v_rules.storage_type, 0, public.kcd__stored_props(v_op - 'version', v_i), v_op ->> 'orderKey', v_ver,
                coalesce((v_op ->> 'typeVersion')::int, v_rules.version));
        v_batch := v_batch || v_id;
        v_slots := v_slots || public.kcd__slot(v_page, v_parent);
      end loop;

    elsif v_name = 'setDeviceComposition' then
      if (v_op ->> 'device') not in ('tablet', 'mobile') or v_op ->> 'device' is null then perform public.kcd__fail('KCD_INVALID', 'Unknown device', v_i); end if;
      if not public.kcd__is_uuid(v_op -> 'pageId', false)
         or not exists (select 1 from public.project_pages where id = (v_op ->> 'pageId')::uuid and project_id = p_project_id) then
        perform public.kcd__fail('KCD_INVALID', format('Page %s does not exist', v_op ->> 'pageId'), v_i);
      end if;
      v_page := (v_op ->> 'pageId')::uuid;
      v_comp := v_op -> 'composition';
      select coalesce(device_layouts, '{}'::jsonb) - (v_op ->> 'device') into v_layouts from public.project_pages where id = v_page;
      if v_comp is not null and jsonb_typeof(v_comp) <> 'null' then
        v_comp := public.kcd__composition(v_comp, v_i);
        if v_comp <> '{}'::jsonb then v_layouts := v_layouts || jsonb_build_object(v_op ->> 'device', v_comp); end if;
      end if;
      update public.project_pages set device_layouts = nullif(v_layouts, '{}'::jsonb), updated_at = now() where id = v_page;
      if not (v_page = any (v_pages)) then v_pages := v_pages || v_page; end if;

    elsif v_name in ('moveNode', 'setProp', 'unsetProp', 'setOverride', 'clearOverride', 'setA11y', 'setVisibility', 'setLocked') then
      if not public.kcd__is_uuid(v_op -> 'id', false) then perform public.kcd__fail('KCD_INVALID', 'Element id is required', v_i); end if;
      v_node := public.kcd__node(p_project_id, (v_op ->> 'id')::uuid);
      if v_node.id is null then perform public.kcd__fail('KCD_INVALID', format('Element %s does not exist', v_op ->> 'id'), v_i); end if;
      v_type := public.kcd_node_type(v_node.section_type, v_node.parent_id);
      select * into v_rules from public.kcd_node_types where type = v_type;
      v_props := v_node.props;

      if v_name = 'moveNode' then
        if v_op -> 'parentId' is null or jsonb_typeof(v_op -> 'parentId') = 'null' then v_parent := null;
        elsif public.kcd__is_uuid(v_op -> 'parentId', false) then v_parent := (v_op ->> 'parentId')::uuid;
        else perform public.kcd__fail('KCD_INVALID', 'parentId must be a UUID or null', v_i);
        end if;
        if jsonb_typeof(v_op -> 'orderKey') is distinct from 'string' or not public.kcd_order_key_valid(v_op ->> 'orderKey') then
          perform public.kcd__fail('KCD_INVALID', 'Invalid order key', v_i);
        end if;
        v_cur := v_parent;
        while v_cur is not null loop
          if v_cur = v_node.id then perform public.kcd__fail('KCD_INVALID', 'An element cannot be moved inside itself', v_i); end if;
          select parent_id into v_cur from public.project_sections where id = v_cur;
        end loop;
        perform public.kcd__check_placement(p_project_id, v_node.page_id, v_parent, v_type, v_i);
        if v_node.parent_id is not distinct from v_parent and v_node.order_key = v_op ->> 'orderKey' then continue; end if;
        update public.project_sections set parent_id = v_parent, order_key = v_op ->> 'orderKey', updated_at = now() where id = v_node.id;
        v_slots := v_slots || public.kcd__slot(v_node.page_id, v_node.parent_id) || public.kcd__slot(v_node.page_id, v_parent);

      elsif v_name in ('setProp', 'unsetProp') then
        v_segs := public.kcd__parse_path(v_op -> 'path', v_i);
        if v_name = 'setProp' then
          if not (v_op ? 'value') then perform public.kcd__fail('KCD_INVALID', 'setProp needs a value (use unsetProp to clear)', v_i); end if;
          v_props := public.kcd__write_path(v_props, v_segs, v_op -> 'value', false, v_i);
        else
          if public.kcd__read_path(v_props, v_segs) is null then continue; end if;
          v_props := public.kcd__write_path(v_props, v_segs, null, true, v_i);
        end if;

      elsif v_name = 'setOverride' then
        if (v_op ->> 'device') is null or (v_op ->> 'device') not in ('tablet', 'mobile') then perform public.kcd__fail('KCD_INVALID', 'Unknown device', v_i); end if;
        v_key := v_op ->> 'key';
        if jsonb_typeof(v_op -> 'key') is distinct from 'string' or v_key = '' or v_key in ('deviceOverrides', '_motion', '_a11y', '_visibility', '_interaction', '_dataBinding', '_locked', '__proto__', 'prototype', 'constructor') then
          perform public.kcd__fail('KCD_INVALID', 'Invalid override key', v_i);
        end if;
        if not (v_op ? 'value') then perform public.kcd__fail('KCD_INVALID', 'setOverride needs a value (use clearOverride to clear)', v_i); end if;
        if not (v_key = any (v_rules.overridable)) then
          perform public.kcd__fail('KCD_INVALID', format('"%s" cannot be set per device', v_key), v_i);
        end if;
        v_props := public.kcd__write_path(v_props, array['deviceOverrides', v_op ->> 'device', v_key], v_op -> 'value', false, v_i);

      elsif v_name = 'clearOverride' then
        if (v_op ->> 'device') is null or (v_op ->> 'device') not in ('tablet', 'mobile') then perform public.kcd__fail('KCD_INVALID', 'Unknown device', v_i); end if;
        v_bucket := public.kcd__read_path(v_props, array['deviceOverrides', v_op ->> 'device']);
        if v_bucket is null or jsonb_typeof(v_bucket) <> 'object' or v_bucket = '{}'::jsonb then continue; end if;
        if v_op ? 'key' and jsonb_typeof(v_op -> 'key') <> 'null' then
          if not (v_bucket ? (v_op ->> 'key')) then continue; end if;
          v_bucket := v_bucket - (v_op ->> 'key');
        else
          v_bucket := '{}'::jsonb;
        end if;
        if v_bucket = '{}'::jsonb then
          v_props := jsonb_set(v_props, '{deviceOverrides}', (v_props -> 'deviceOverrides') - (v_op ->> 'device'));
        else
          v_props := jsonb_set(v_props, array['deviceOverrides', v_op ->> 'device'], v_bucket);
        end if;
        if v_props -> 'deviceOverrides' = '{}'::jsonb then v_props := v_props - 'deviceOverrides'; end if;

      else -- setA11y / setVisibility / setLocked: null removes the field
        v_key := case v_name when 'setA11y' then '_a11y' when 'setVisibility' then '_visibility' else '_locked' end;
        if v_op -> 'value' is null or jsonb_typeof(v_op -> 'value') = 'null' then
          v_props := v_props - v_key;
        else
          if v_name = 'setLocked' and jsonb_typeof(v_op -> 'value') <> 'boolean' then perform public.kcd__fail('KCD_INVALID', 'locked must be true or false', v_i); end if;
          if v_name <> 'setLocked' and jsonb_typeof(v_op -> 'value') <> 'object' then perform public.kcd__fail('KCD_INVALID', format('%s value must be an object', v_name), v_i); end if;
          v_props := v_props || jsonb_build_object(v_key, v_op -> 'value');
        end if;
      end if;

      if v_name <> 'moveNode' then
        if octet_length(v_props::text) > 320 * 1024 then perform public.kcd__fail('KCD_LIMIT', format('Element %s is too large', v_node.id), v_i); end if;
        update public.project_sections set props = v_props, updated_at = now() where id = v_node.id;
      end if;
      if not (v_node.id = any (v_inserted)) and not (v_restored ? v_node.id::text) and not (v_node.id = any (v_touched)) then
        v_touched := v_touched || v_node.id;
      end if;

    else
      perform public.kcd__fail('KCD_INVALID', format('Unknown operation "%s"', v_name), v_i);
    end if;
  end loop;

  -- Siblings: unique positions, child limits, rebalance (core finishSlots), in slot order.
  select coalesce(array_agg(distinct s order by s), '{}') into v_slots from unnest(v_slots) s;
  foreach v_slot in array v_slots loop
    v_page := split_part(v_slot, '|', 1)::uuid;
    v_parent := nullif(split_part(v_slot, '|', 2), '')::uuid;
    if v_parent is not null and not exists (select 1 from public.project_sections where id = v_parent) then continue; end if;
    if exists (select 1 from public.project_sections where page_id = v_page and parent_id is not distinct from v_parent
               group by order_key having count(*) > 1) then
      perform public.kcd__fail('KCD_INVALID', 'Two elements share the same position');
    end if;
    if v_parent is not null then
      select * into v_rules from public.kcd_node_types
      where type = (select public.kcd_node_type(section_type, parent_id) from public.project_sections where id = v_parent);
      if v_rules.max_children is not null and
         (select count(*) from public.project_sections where parent_id = v_parent) > v_rules.max_children then
        perform public.kcd__fail('KCD_INVALID', format('"%s" can hold at most %s elements', v_rules.type, v_rules.max_children));
      end if;
    end if;
    if exists (select 1 from public.project_sections where page_id = v_page and parent_id is not distinct from v_parent and length(order_key) > 24) then
      v_new := public.kcd_evenly_spaced_keys((select count(*)::int from public.project_sections where page_id = v_page and parent_id is not distinct from v_parent));
      v_idx := 0;
      for v_kids in
        select id, order_key from public.project_sections
        where page_id = v_page and parent_id is not distinct from v_parent
        order by order_key collate "C", id
      loop
        v_idx := v_idx + 1;
        if v_kids.order_key = v_new[v_idx] then continue; end if;
        update public.project_sections set order_key = v_new[v_idx], updated_at = now() where id = v_kids.id;
        v_keys := v_keys || jsonb_build_object(v_kids.id::text, v_new[v_idx]);
        if not (v_kids.id = any (v_inserted)) and not (v_restored ? v_kids.id::text) and not (v_kids.id = any (v_touched)) then
          v_touched := v_touched || v_kids.id;
        end if;
      end loop;
      v_rebal := v_rebal || coalesce(v_parent, v_page)::text;
    end if;
    -- 3B readers use sort_order for page roots: keep it dense in KCD order.
    if v_parent is null then
      update public.project_sections s set sort_order = r.rn - 1
      from (select id, row_number() over (order by order_key collate "C", id) as rn
            from public.project_sections where page_id = v_page and parent_id is null) r
      where s.id = r.id and s.sort_order <> r.rn - 1;
    end if;
  end loop;

  -- Versions: +1 once per touched existing node / page; inserted = 1; restored as recorded + 1.
  update public.project_sections set node_version = node_version + 1 where id = any (v_touched);
  select coalesce(jsonb_object_agg(id::text, node_version), '{}') into v_versions from public.project_sections where id = any (v_touched);
  v_versions := v_versions || coalesce((select jsonb_object_agg(i::text, 1) from unnest(v_inserted) i), '{}') || v_restored;
  update public.project_pages set layout_version = layout_version + 1 where id = any (v_pages);
  v_versions := v_versions || coalesce((select jsonb_object_agg(id::text, layout_version) from public.project_pages where id = any (v_pages)), '{}');
  update public.projects set updated_at = now() where id = p_project_id;

  set constraints public.project_sections_sibling_order_key immediate;
  perform set_config('kcd.applying', 'off', true);
  return jsonb_build_object(
    'versions', v_versions,
    'removed', coalesce((select jsonb_agg(k order by k) from jsonb_object_keys(v_removed) k), '[]'),
    'removedNodes', v_removed,
    'rebalanced', to_jsonb(v_rebal),
    'orderKeys', v_keys
  );
end $$;

-- A device composition { order?, hidden? } → the 3B stored shape { sectionOrder?, hiddenSections? }
-- (same rules as deviceCompositionSchema: ≤ 40 ids, trimmed 1–80 chars, no id both ordered and hidden).
create or replace function public.kcd__composition(p_comp jsonb, p_op int)
returns jsonb language plpgsql immutable as $$
declare
  out jsonb := '{}'::jsonb;
  k text;
  list jsonb;
  item jsonb;
  ids text[];
  ord text[] := null;
  hid text[] := null;
begin
  if jsonb_typeof(p_comp) <> 'object' then perform public.kcd__fail('KCD_INVALID', 'Device layout must be an object', p_op); end if;
  for k in select jsonb_object_keys(p_comp) loop
    if k not in ('order', 'hidden') then perform public.kcd__fail('KCD_INVALID', format('Unknown device layout field "%s"', k), p_op); end if;
    list := p_comp -> k;
    if jsonb_typeof(list) <> 'array' then perform public.kcd__fail('KCD_INVALID', 'Device layout lists must be arrays', p_op); end if;
    if jsonb_array_length(list) > 40 then perform public.kcd__fail('KCD_INVALID', 'Device layout lists hold at most 40 ids', p_op); end if;
    ids := '{}';
    for item in select * from jsonb_array_elements(list) loop
      if jsonb_typeof(item) <> 'string' or length(btrim(item #>> '{}')) not between 1 and 80 then
        perform public.kcd__fail('KCD_INVALID', 'Device layout ids must be 1–80 characters', p_op);
      end if;
      ids := ids || btrim(item #>> '{}');
    end loop;
    if k = 'order' then ord := ids; else hid := ids; end if;
  end loop;
  if ord is not null and hid is not null and ord && hid then
    perform public.kcd__fail('KCD_INVALID', 'Ids both ordered and hidden', p_op);
  end if;
  if ord is not null then out := out || jsonb_build_object('sectionOrder', to_jsonb(ord)); end if;
  if hid is not null then out := out || jsonb_build_object('hiddenSections', to_jsonb(hid)); end if;
  return out;
end $$;

-- The KCD write path. Owner session (auth.uid() = owner) or service role behind the API's
-- team/support authorization (auth.uid() IS NULL); never anon. Returns a result object:
--   { status: 'committed', replayed, versions, removed, removedNodes, rebalanced, orderKeys }
--   { status: 'rejected',   code: 'KCD_INVALID' | 'KCD_LIMIT', message, opIndex }
--   { status: 'conflicted', code: 'KCD_CONFLICT', message, conflicts: [{ id, expected, actual }] }
-- Unauthorized callers and malformed requests raise (no journal row); every authorized request
-- with a valid txId is journaled (committed / rejected / conflicted). Rejections roll back all
-- writes of the transaction (subtransaction), keeping only the journal row.
create or replace function public.apply_node_ops(p_project_id uuid, p_tx jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_tx_id   uuid;
  v_origin  text;
  v_ops     jsonb;
  v_types   text[];
  v_prior   public.creative_op_journal;
  v_result  jsonb;
  v_state   text;
  v_msg     text;
  v_detail  text;
  v_status  text;
  v_code    text;
begin
  if v_uid is not null and not exists (select 1 from public.projects where id = p_project_id and owner_id = v_uid) then
    raise exception 'access denied: project % does not belong to caller', p_project_id using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'project % not found', p_project_id using errcode = 'no_data_found';
  end if;
  if p_tx is null or jsonb_typeof(p_tx) <> 'object' or not public.kcd__is_uuid(p_tx -> 'txId', false) then
    raise exception 'malformed transaction: txId must be a UUID' using errcode = 'invalid_parameter_value';
  end if;
  v_tx_id := (p_tx ->> 'txId')::uuid;
  v_origin := p_tx ->> 'origin';
  v_ops := p_tx -> 'ops';
  if v_origin is null or v_origin not in ('user', 'ai', 'system', 'migration')
     or jsonb_typeof(v_ops) is distinct from 'array'
     or jsonb_typeof(p_tx -> 'expect') is distinct from 'object' then
    raise exception 'malformed transaction' using errcode = 'invalid_parameter_value';
  end if;

  -- One writer per document at a time (single active editor, §8), deadlock-free.
  perform 1 from public.projects where id = p_project_id for update;

  -- Idempotency: a committed txId returns its recorded result.
  select * into v_prior from public.creative_op_journal where tx_id = v_tx_id and status = 'committed';
  if found then
    if v_prior.project_id <> p_project_id then
      raise exception 'transaction % belongs to another project', v_tx_id using errcode = 'invalid_parameter_value';
    end if;
    return jsonb_build_object('status', 'committed', 'replayed', true, 'versions', v_prior.result_versions,
                              'removed', coalesce((select jsonb_agg(k order by k) from jsonb_object_keys(coalesce(v_prior.removed_nodes, '{}')) k), '[]'));
  end if;

  select coalesce(array_agg(distinct t order by t), '{}') into v_types
  from jsonb_array_elements(v_ops) o, lateral (select o ->> 'op' as t) x where t is not null;

  begin
    if jsonb_array_length(v_ops) = 0 then perform public.kcd__fail('KCD_INVALID', 'A transaction needs at least one operation'); end if;
    if jsonb_array_length(v_ops) > 500 then perform public.kcd__fail('KCD_LIMIT', 'Too many operations'); end if;
    if octet_length(p_tx::text) > 2560 * 1024 then perform public.kcd__fail('KCD_LIMIT', 'Transaction too large'); end if;
    if jsonb_typeof(p_tx -> 'label') is distinct from 'string' or length(p_tx ->> 'label') > 120 then
      perform public.kcd__fail('KCD_INVALID', 'label must be a short string');
    end if;
    if exists (select 1 from jsonb_each(p_tx -> 'expect') e
               where jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric < 1
                  or (e.value #>> '{}')::numeric <> floor((e.value #>> '{}')::numeric)) then
      perform public.kcd__fail('KCD_INVALID', 'Invalid expected version');
    end if;
    if not exists (select 1 from public.projects where id = p_project_id and document_schema_version = 'kcd-1') then
      perform public.kcd__fail('KCD_INVALID', 'This site is not using the Kebu Creative Document format');
    end if;
    v_result := public.kcd__apply(p_project_id, p_tx);
  exception when sqlstate 'KCINV' or sqlstate 'KCLIM' or sqlstate 'KCCON' or sqlstate '23505' then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text, v_detail = pg_exception_detail;
    perform set_config('kcd.applying', 'off', true);
    v_status := case v_state when 'KCCON' then 'conflicted' else 'rejected' end;
    v_code := case v_state when 'KCCON' then 'KCD_CONFLICT' when 'KCLIM' then 'KCD_LIMIT' else 'KCD_INVALID' end;
    if v_state = '23505' then v_msg := 'Two elements share the same position'; v_detail := null; end if;
    insert into public.creative_op_journal (tx_id, project_id, actor_id, execution_path, origin, op_types, op_count, expected_versions, status, error_code, diagnostic)
    values (v_tx_id, p_project_id, v_uid, case when v_uid is null then 'service' else 'owner' end, v_origin, v_types, jsonb_array_length(v_ops),
            p_tx -> 'expect', v_status, v_code,
            case when v_state = 'KCCON' then jsonb_build_object('conflicts', v_detail::jsonb)
                 when v_detail is not null then v_detail::jsonb else null end);
    if v_state = 'KCCON' then
      return jsonb_build_object('status', v_status, 'code', v_code, 'message', v_msg, 'conflicts', v_detail::jsonb);
    end if;
    return jsonb_build_object('status', v_status, 'code', v_code, 'message', v_msg,
                              'opIndex', case when v_detail is not null then v_detail::jsonb -> 'opIndex' else null end);
  end;

  insert into public.creative_op_journal (tx_id, project_id, actor_id, execution_path, origin, op_types, op_count, expected_versions,
                                          result_versions, removed_nodes, status)
  values (v_tx_id, p_project_id, v_uid, case when v_uid is null then 'service' else 'owner' end, v_origin, v_types, jsonb_array_length(v_ops),
          p_tx -> 'expect', v_result -> 'versions', nullif(v_result -> 'removedNodes', '{}'::jsonb), 'committed');
  return (v_result - 'removedNodes') || jsonb_build_object('status', 'committed', 'replayed', false);
end $$;

-- ── 7. Privileges ────────────────────────────────────────────────────────────
-- Supabase grants EXECUTE on new public functions to anon explicitly (see 20260925012420):
-- revoke from PUBLIC and anon; only the entry point is callable by authenticated / service_role.
revoke execute on function public.apply_node_ops(uuid, jsonb) from public, anon;
grant  execute on function public.apply_node_ops(uuid, jsonb) to authenticated, service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'public.kcd__apply(uuid, jsonb)', 'public.kcd__fail(text, text, int)', 'public.kcd__read_path(jsonb, text[])',
    'public.kcd__write_path(jsonb, text[], jsonb, boolean, int)', 'public.kcd__parse_path(jsonb, int)',
    'public.kcd__stored_props(jsonb, int)', 'public.kcd__node(uuid, uuid)', 'public.kcd__check_placement(uuid, uuid, uuid, text, int)',
    'public.kcd__slot(uuid, uuid)', 'public.kcd__is_uuid(jsonb, boolean)', 'public.kcd__composition(jsonb, int)',
    'public.kcd_assign_order_key()', 'public.kcd_check_parent()', 'public.kcd_document_schema_transition()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

insert into public.builder_schema_meta (key, value)
values ('kcd_storage_version', '1')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';
