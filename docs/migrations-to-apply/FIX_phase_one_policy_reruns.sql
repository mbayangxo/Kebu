-- Unblock APPLY_ALL_PHASE_ONE re-runs: drop+recreate policies that lacked matching DROP.
-- Paste alone → Run, then re-run UPDATED APPLY_ALL_PHASE_ONE.sql from disk.

do $$
begin
  -- country_profiles
  if to_regclass('public.country_profiles') is not null then
    execute 'drop policy if exists "Anyone can read country profiles" on public.country_profiles';
    execute 'drop policy if exists "Anyone can read published country profiles" on public.country_profiles';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'country_profiles'
        and column_name = 'publish_status'
    ) then
      execute $p$
        create policy "Anyone can read published country profiles"
          on public.country_profiles for select
          using (publish_status = 'published')
      $p$;
    else
      execute $p$
        create policy "Anyone can read country profiles"
          on public.country_profiles for select
          using (true)
      $p$;
    end if;
  end if;

  -- site_health_checks
  if to_regclass('public.site_health_checks') is not null then
    execute 'drop policy if exists "Owners read health via deployment" on public.site_health_checks';
    execute $p$
      create policy "Owners read health via deployment"
        on public.site_health_checks for select
        using (
          exists (
            select 1 from public.deployments d
            join public.projects p on p.id = d.project_id
            where d.subdomain = site_health_checks.subdomain
              and p.owner_id = auth.uid()
          )
        )
    $p$;
  end if;

  -- developer marketplace
  if to_regclass('public.developer_profiles') is not null then
    execute 'drop policy if exists "Developers read own profile" on public.developer_profiles';
    execute 'drop policy if exists "Developers insert own profile" on public.developer_profiles';
    execute 'drop policy if exists "Developers update own pending profile" on public.developer_profiles';
    execute $p$
      create policy "Developers read own profile"
        on public.developer_profiles for select using (auth.uid() = user_id)
    $p$;
    execute $p$
      create policy "Developers insert own profile"
        on public.developer_profiles for insert with check (auth.uid() = user_id)
    $p$;
    execute $p$
      create policy "Developers update own pending profile"
        on public.developer_profiles for update using (auth.uid() = user_id)
    $p$;
  end if;

  if to_regclass('public.marketplace_templates') is not null then
    execute 'drop policy if exists "Public read published marketplace templates" on public.marketplace_templates';
    execute 'drop policy if exists "Approved developers manage own templates" on public.marketplace_templates';
    execute $p$
      create policy "Public read published marketplace templates"
        on public.marketplace_templates for select
        using (
          status = 'published' or exists (
            select 1 from public.developer_profiles dp
            where dp.id = marketplace_templates.developer_id and dp.user_id = auth.uid()
          )
        )
    $p$;
    execute $p$
      create policy "Approved developers manage own templates"
        on public.marketplace_templates for all
        using (
          exists (
            select 1 from public.developer_profiles dp
            where dp.id = marketplace_templates.developer_id
              and dp.user_id = auth.uid()
              and dp.status = 'approved'
          )
        )
    $p$;
  end if;
end $$;
