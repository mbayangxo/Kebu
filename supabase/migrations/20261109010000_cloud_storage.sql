-- Kebu Cloud, phase 1 (completion audit K070: "Kebu Cloud hosts user apps/
-- software, APIs, databases and automations -- Full Kebu product not found").
-- Full Kebu Cloud per docs/KEBU-ECOSYSTEM.md is a future PaaS (deploy/run
-- arbitrary developer code, containers, databases) with no defined security
--/isolation model -- that is explicitly NOT what this migration builds.
-- Scope here, chosen deliberately to stay safe: real object storage (buckets
-- + files) and real static site/SPA hosting. No server-side code execution
-- of any kind -- deployments are extracted, static files served as-is.
--
-- Storage quota reuses the *existing*, already-defined-but-never-enforced
-- lib/billing/plans.ts KebuPlanLimits.storageMb field (confirmed zero
-- call sites before this change) rather than inventing a new business rule --
-- this migration's job is just to give that field something real to meter.

create table if not exists public.cloud_storage_buckets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 63 and name ~ '^[a-z0-9][a-z0-9._-]*$'),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

drop trigger if exists cloud_storage_buckets_set_updated_at on public.cloud_storage_buckets;
create trigger cloud_storage_buckets_set_updated_at before update on public.cloud_storage_buckets
for each row execute function public.set_updated_at();

create table if not exists public.cloud_storage_files (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references public.cloud_storage_buckets(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  mime_type text not null check (char_length(trim(mime_type)) between 3 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists cloud_storage_files_bucket_idx on public.cloud_storage_files (bucket_id);

-- Deployment slug becomes the `<slug>.cloud.kebu.africa` subdomain
-- (lib/create/middleware-routing.ts) -- must be a valid DNS label, globally
-- unique (it is the whole origin, not scoped per owner).
create table if not exists public.cloud_deployments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  live_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cloud_deployments_owner_idx on public.cloud_deployments (owner_id);

drop trigger if exists cloud_deployments_set_updated_at on public.cloud_deployments;
create trigger cloud_deployments_set_updated_at before update on public.cloud_deployments
for each row execute function public.set_updated_at();

create table if not exists public.cloud_deployment_versions (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.cloud_deployments(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  storage_prefix text not null unique,
  size_bytes bigint not null check (size_bytes >= 0),
  file_count integer not null check (file_count >= 0),
  -- Exact object keys written for this version, so deletion can remove
  -- precisely what was uploaded instead of a best-effort storage.list()
  -- (the JS client's list() is a flat, non-recursive, paginated directory
  -- read -- not a reliable way to discover every nested asset path).
  asset_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (deployment_id, version_number)
);

create index if not exists cloud_deployment_versions_deployment_idx on public.cloud_deployment_versions (deployment_id);

alter table public.cloud_deployments
  add constraint cloud_deployments_live_version_fkey
  foreign key (live_version_id) references public.cloud_deployment_versions(id) on delete set null;

-- RLS stays strict owner-only on every table, including the deployment that
-- a visitor's browser ultimately resolves by slug: public serving
-- (app/cloud-sites/[slug]/.../route.ts) reads through the service-role
-- client, not these policies, so the "what can an anonymous visitor see"
-- decision lives in one reviewable server code path instead of being spread
-- across RLS. Mirrors how room_calls/sheet_bodies keep sensitive
-- cross-cutting reads behind SECURITY DEFINER / service-role, not anon RLS.

alter table public.cloud_storage_buckets enable row level security;
alter table public.cloud_storage_files enable row level security;
alter table public.cloud_deployments enable row level security;
alter table public.cloud_deployment_versions enable row level security;

drop policy if exists "Owners manage cloud_storage_buckets" on public.cloud_storage_buckets;
create policy "Owners manage cloud_storage_buckets"
  on public.cloud_storage_buckets for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners manage cloud_storage_files" on public.cloud_storage_files;
create policy "Owners manage cloud_storage_files"
  on public.cloud_storage_files for all
  using (
    exists (
      select 1 from public.cloud_storage_buckets b
      where b.id = cloud_storage_files.bucket_id and b.owner_id = auth.uid()
    )
  )
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.cloud_storage_buckets b
      where b.id = cloud_storage_files.bucket_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners manage cloud_deployments" on public.cloud_deployments;
create policy "Owners manage cloud_deployments"
  on public.cloud_deployments for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners manage cloud_deployment_versions" on public.cloud_deployment_versions;
create policy "Owners manage cloud_deployment_versions"
  on public.cloud_deployment_versions for all
  using (
    exists (
      select 1 from public.cloud_deployments d
      where d.id = cloud_deployment_versions.deployment_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cloud_deployments d
      where d.id = cloud_deployment_versions.deployment_id and d.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.cloud_storage_buckets to authenticated;
grant select, insert, update, delete on public.cloud_storage_files to authenticated;
grant select, insert, update, delete on public.cloud_deployments to authenticated;
grant select, insert, update, delete on public.cloud_deployment_versions to authenticated;

-- Storage: user object storage, 25 MB/file cap (app layer separately enforces
-- the per-account storageMb plan quota across both buckets combined).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cloud-user-storage', 'cloud-user-storage', false, 26214400, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage: extracted static-deployment assets only -- web asset mime types,
-- smaller per-file cap (typical site assets, not general file storage).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cloud-deployments',
  'cloud-deployments',
  false,
  10485760,
  array[
    'text/html', 'text/css', 'text/plain', 'text/javascript', 'application/javascript',
    'application/json', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'image/x-icon', 'font/woff', 'font/woff2', 'application/font-woff', 'application/wasm',
    'application/xml', 'text/xml', 'text/markdown'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects paths are `${ownerId}/${bucketRowId}/${fileId}-${name}` for
-- user storage -- foldername()[1] is always the uploader's own auth.uid(), so
-- this is a direct check, no join needed (mirrors business-documents'
-- foldername-based storage RLS, migrations_archive/legacy/017).
drop policy if exists "Cloud storage owner read" on storage.objects;
create policy "Cloud storage owner read"
  on storage.objects for select
  using (
    bucket_id = 'cloud-user-storage'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Cloud storage owner write" on storage.objects;
create policy "Cloud storage owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'cloud-user-storage'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Cloud storage owner delete" on storage.objects;
create policy "Cloud storage owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'cloud-user-storage'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deployment asset paths are `${deploymentId}/${versionId}/<relative path>` --
-- foldername()[1] is the deployment id, checked against ownership via a join
-- (the uploader isn't encoded in the path the way it is for user storage).
--
-- Every reference to the object's own path is qualified as
-- `storage.objects.name` -- an unqualified `name` inside the EXISTS
-- subquery resolves to cloud_deployments.name (the deployment's own
-- display-name column, also called `name`), not storage.objects.name,
-- because the inner table is the closer scope. That shadowing bug was
-- caught by this migration's own PGlite RLS test
-- (tests/cloud/cloud-storage-rls.local-pg.test.ts): with it, even the real
-- owner's own upload was rejected, since no object path ever matches a
-- deployment's display name. CREATE POLICY has no table-alias clause, so
-- the fully-qualified name is the fix, not an alias.
drop policy if exists "Cloud deployment owner read" on storage.objects;
create policy "Cloud deployment owner read"
  on storage.objects for select
  using (
    bucket_id = 'cloud-deployments'
    and auth.uid() is not null
    and exists (
      select 1 from public.cloud_deployments d
      where d.owner_id = auth.uid()
        and d.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

drop policy if exists "Cloud deployment owner write" on storage.objects;
create policy "Cloud deployment owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'cloud-deployments'
    and auth.uid() is not null
    and exists (
      select 1 from public.cloud_deployments d
      where d.owner_id = auth.uid()
        and d.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

drop policy if exists "Cloud deployment owner delete" on storage.objects;
create policy "Cloud deployment owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'cloud-deployments'
    and auth.uid() is not null
    and exists (
      select 1 from public.cloud_deployments d
      where d.owner_id = auth.uid()
        and d.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

notify pgrst, 'reload schema';
