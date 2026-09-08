-- Unblock: policy "Owners select website versions" already exists
-- Paste alone in Supabase SQL Editor → Run, then re-run the UPDATED APPLY_ALL_PHASE_ONE.sql from disk.

do $$
begin
  if to_regclass('public.website_versions') is not null then
    execute 'drop policy if exists "Owners manage website versions" on public.website_versions';
    execute 'drop policy if exists "Owners select website versions" on public.website_versions';
    execute $p$
      create policy "Owners select website versions"
        on public.website_versions for select
        using (
          exists (
            select 1 from public.projects p
            where p.id = website_versions.project_id and p.owner_id = auth.uid()
          )
        )
    $p$;
  end if;

  if to_regclass('public.site_domains') is not null then
    execute 'drop policy if exists "Owners manage domains" on public.site_domains';
    execute 'drop policy if exists "Owners select domains" on public.site_domains';
    execute $p$
      create policy "Owners select domains"
        on public.site_domains for select
        using (
          exists (
            select 1 from public.projects p
            where p.id = site_domains.project_id and p.owner_id = auth.uid()
          )
        )
    $p$;
  end if;
end $$;
