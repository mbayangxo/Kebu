-- Fail closed on inconsistent existing metadata; never repoint a tenant's version.
-- Repeatable for a manually interrupted rollout. These checks validate existing data.
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.cloud_deployment_versions'::regclass and conname='cloud_versions_canonical_prefix') then
  alter table public.cloud_deployment_versions add constraint cloud_versions_canonical_prefix
   check(storage_prefix=deployment_id::text||'/'||id::text) not valid;
 end if;
 alter table public.cloud_deployment_versions validate constraint cloud_versions_canonical_prefix;
 if not exists(select 1 from pg_constraint where conrelid='public.cloud_deployment_versions'::regclass and conname='cloud_versions_deployment_identity') then
  alter table public.cloud_deployment_versions add constraint cloud_versions_deployment_identity unique(deployment_id,id);
 end if;
 alter table public.cloud_deployments drop constraint if exists cloud_deployments_live_version_fkey;
 if not exists(select 1 from pg_constraint where conrelid='public.cloud_deployments'::regclass and conname='cloud_deployments_owned_live_version_fkey') then
  alter table public.cloud_deployments add constraint cloud_deployments_owned_live_version_fkey
   foreign key(id,live_version_id) references public.cloud_deployment_versions(deployment_id,id)
   on delete set null(live_version_id) not valid;
 end if;
 alter table public.cloud_deployments validate constraint cloud_deployments_owned_live_version_fkey;
end $$;
