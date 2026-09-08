-- Unblock: policy "Public read live or suspended deployments" already exists
-- Paste this alone in Supabase SQL Editor → Run, then continue with agency SQL.

do $$
begin
  if to_regclass('public.deployments') is null then
    raise notice 'No deployments table — nothing to fix.';
    return;
  end if;
  execute 'drop policy if exists "Public read live deployments" on public.deployments';
  execute 'drop policy if exists "Public read live or suspended deployments" on public.deployments';
  execute $policy$
    create policy "Public read live or suspended deployments"
      on public.deployments for select
      using (status in ('live', 'suspended'))
  $policy$;
end $$;
