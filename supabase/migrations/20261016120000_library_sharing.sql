-- Library documents/folders and sharing.
--
-- app/api/library/{nodes,shares}/route.ts have depended on this schema since
-- commit 5d15d60 ("feat(library): add RLS-backed folders and sharing APIs")
-- with NO backing migration ever committed. The tables exist on the hosted
-- project only out-of-band (observed read-only via information_schema in
-- docs/audits/KEBU_EVERYDAY_AUDIO_2026-10-14.md) — a fresh/local database has
-- had no library_nodes/library_shares table and no RLS at all, so these
-- routes 500 ("relation does not exist") anywhere except that one hosted
-- project. This migration is schema-drift remediation: it defines the tables
-- and RLS the routes already assume, matching their exact column usage.

create table if not exists public.library_nodes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.library_nodes(id) on delete cascade,
  kind text not null default 'folder' check (kind in ('folder', 'link', 'document', 'sheet')),
  title text not null check (char_length(trim(title)) between 1 and 240),
  -- Reserved for a future file-backed node (Supabase Storage); no route
  -- currently sets these on insert — Library is text/metadata-only today.
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  mime_type text check (mime_type is null or char_length(mime_type) <= 160),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  source_kind text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  starred boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_nodes_owner_parent_idx on public.library_nodes (owner_id, parent_id);
create index if not exists library_nodes_parent_idx on public.library_nodes (parent_id) where parent_id is not null;

drop trigger if exists library_nodes_set_updated_at on public.library_nodes;
create trigger library_nodes_set_updated_at before update on public.library_nodes
for each row execute function public.set_updated_at();

create table if not exists public.library_shares (
  node_id uuid not null references public.library_nodes(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('viewer', 'editor')),
  shared_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (node_id, shared_with_user_id)
);

create index if not exists library_shares_shared_with_idx on public.library_shares (shared_with_user_id);

drop trigger if exists library_shares_set_updated_at on public.library_shares;
create trigger library_shares_set_updated_at before update on public.library_shares
for each row execute function public.set_updated_at();

-- A share cannot outlive or outrank its sharer's own authority: only the
-- node's current owner may ever hold shared_by_user_id for a row naming that
-- node, enforced the same way lib 20261014043916 enforces work-item identity
-- — a trigger, so the rule holds even if a future policy edit gets it wrong.
create schema if not exists private;
create or replace function private.guard_library_share_authority()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if not exists (
      select 1 from public.library_nodes n
      where n.id = new.node_id and n.owner_id = new.shared_by_user_id
    ) then
      raise exception 'Only the item owner can share or update sharing for it.' using errcode = '42501';
    end if;
    if new.shared_with_user_id = new.shared_by_user_id then
      raise exception 'Cannot share a Library item with yourself.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_library_share_authority() from public;
drop trigger if exists guard_library_share_authority on public.library_shares;
create trigger guard_library_share_authority before insert or update on public.library_shares
for each row execute function private.guard_library_share_authority();

-- Collaborators cannot replace a node's identity/ownership or relocate it —
-- same convention as 20261014043916_workspace_item_identity_guard.sql.
create or replace function private.guard_library_node_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
      raise exception 'Library item ownership cannot be changed.' using errcode = '42501';
    end if;
    if new.kind is distinct from old.kind then
      raise exception 'Library item kind cannot be changed.' using errcode = '42501';
    end if;
    if new.parent_id is distinct from old.parent_id and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can move a Library item.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_library_node_identity() from public;
drop trigger if exists guard_library_node_identity on public.library_nodes;
create trigger guard_library_node_identity before update on public.library_nodes
for each row execute function private.guard_library_node_identity();

-- library_nodes and library_shares each need to read the other table from
-- inside their own RLS policy (is this node shared with me? / do I own the
-- node this share points at?), which is a direct cycle: evaluating one
-- table's policy triggers the other table's policy, which triggers the
-- first table's policy again ("infinite recursion detected in policy for
-- relation", confirmed by actually running this against PGlite before
-- shipping it). The standard fix is a SECURITY DEFINER helper: it runs as
-- the function owner (the migration role), which owns both tables and so
-- is exempt from their RLS by default — reading through it does not
-- re-trigger the other table's policy, breaking the cycle.
create or replace function private.library_node_owner_id(p_node_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select owner_id from public.library_nodes where id = p_node_id;
$$;
revoke all on function private.library_node_owner_id(uuid) from public;
grant execute on function private.library_node_owner_id(uuid) to authenticated;

create or replace function private.library_share_permission(p_node_id uuid, p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select permission from public.library_shares
  where node_id = p_node_id and shared_with_user_id = p_user_id;
$$;
revoke all on function private.library_share_permission(uuid, uuid) from public;
grant execute on function private.library_share_permission(uuid, uuid) to authenticated;

alter table public.library_nodes enable row level security;
alter table public.library_shares enable row level security;

drop policy if exists "Owners and recipients read library_nodes" on public.library_nodes;
create policy "Owners and recipients read library_nodes"
  on public.library_nodes for select
  using (
    owner_id = auth.uid()
    or private.library_share_permission(id, auth.uid()) is not null
  );

drop policy if exists "Owners create library_nodes" on public.library_nodes;
create policy "Owners create library_nodes"
  on public.library_nodes for insert
  with check (owner_id = auth.uid());

drop policy if exists "Owners and editors update library_nodes" on public.library_nodes;
create policy "Owners and editors update library_nodes"
  on public.library_nodes for update
  using (
    owner_id = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  )
  with check (
    owner_id = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

drop policy if exists "Owners delete library_nodes" on public.library_nodes;
create policy "Owners delete library_nodes"
  on public.library_nodes for delete
  using (owner_id = auth.uid());

drop policy if exists "Owners and recipients read library_shares" on public.library_shares;
create policy "Owners and recipients read library_shares"
  on public.library_shares for select
  using (
    shared_with_user_id = auth.uid()
    or private.library_node_owner_id(node_id) = auth.uid()
  );

drop policy if exists "Owners create library_shares" on public.library_shares;
create policy "Owners create library_shares"
  on public.library_shares for insert
  with check (
    shared_by_user_id = auth.uid()
    and private.library_node_owner_id(node_id) = auth.uid()
  );

drop policy if exists "Owners update library_shares" on public.library_shares;
create policy "Owners update library_shares"
  on public.library_shares for update
  using (private.library_node_owner_id(node_id) = auth.uid())
  with check (private.library_node_owner_id(node_id) = auth.uid());

drop policy if exists "Owners delete library_shares" on public.library_shares;
create policy "Owners delete library_shares"
  on public.library_shares for delete
  using (private.library_node_owner_id(node_id) = auth.uid());

grant select, insert, update, delete on public.library_nodes to authenticated;
grant select, insert, update, delete on public.library_shares to authenticated;
