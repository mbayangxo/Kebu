# Hosted migration rollout — 2026-10-26 UTC

## Verified result
All 37 checks in scripts/hosted-release-preflight.sql pass at 2026-10-26T02:54:05Z. This is catalog/schema/grant verification, not full authenticated application acceptance. No deployment or cron schedule was changed by this rollout.

Search migrations search_businesses_pagination (20261026025220), search_index_products_mode (20261026025247), search_products_rpc (20261026025249) are applied from origin/kebu-search-build-oct23. Both final RPCs execute with an intentionally unmatched verification query and return zero rows; anon cannot execute business Search and authenticated cannot execute product Search. No Search branch runtime merge was performed.

Earlier migrations applied in sequence cover workspace privacy; room chat/create/member repairs; business membership; Liguey profiles, applications, reviews and insights; Mail forwarding/business mailbox creation; Yande interactions; creative assets/payouts; buyer checkout; aesthetics; multi-provider checkout; paid ownership; presentation metadata; verified Wave settlement and template-source boundaries. Supabase MCP assigns application-time versions, so compare migration names as well as versions. Do not blindly db push historical files based on timestamp mismatch.

## Library drift reconciliation
The hosted Library already uses private.library_permission(uuid,uuid) and inherited folder sharing policies plus public.library_node_guard(). The historical 20261016120000_library_sharing.sql defines a different direct-share policy model. It was NOT applied wholesale or marked as applied.

Applied library_owner_helper_compatibility supplies private.library_node_owner_id(uuid) with empty search_path, PUBLIC/anon revoked, authenticated/service_role execution granted; this unblocks worker evidence policies.

Applied library_sharing_compatibility (20261026025348) uses the historical library_sharing migration prefix BEFORE the comment `-- library_nodes and library_shares each need`: existing table CREATE IF NOT EXISTS, indexes, update triggers, guard_library_share_authority and guard_library_node_identity. It preserves existing inherited sharing RLS/helper and public guard. Verified both new identity/authority guards exist and inherited helper remains. This is an explicit compatibility reconciliation, not byte-identical historical migration application. Future migration tooling must account for the superseded historical policy body rather than installing parallel permissive policies.

Exact compatibility SQL follows:

```sql
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


```

## Remaining acceptance work
Full Auth/RLS multi-user behavior, real payments/mail delivery, application version compatibility and cron deployment are separate gates, not certified by the 37 inventory checks. Existing Search cron Hobby-limit issue is not resolved by schema migrations. Original Library history intentionally remains distinct from compatibility history.
