-- Fail closed on inconsistent existing metadata; never publish another tenant's version.
alter table public.cloud_deployment_versions
  add constraint cloud_versions_canonical_prefix check (storage_prefix = deployment_id::text || '/' || id::text),
  add constraint cloud_versions_deployment_identity unique (deployment_id, id);
alter table public.cloud_deployments drop constraint cloud_deployments_live_version_fkey;
alter table public.cloud_deployments add constraint cloud_deployments_owned_live_version_fkey
  foreign key (id, live_version_id) references public.cloud_deployment_versions(deployment_id, id)
  on delete set null (live_version_id);
