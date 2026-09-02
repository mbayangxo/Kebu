-- PostgREST API grants (fixes "permission denied" on public tables when RLS allows access)

grant usage on schema public to anon, authenticated, service_role;

grant select on public.country_profiles to anon, authenticated;
grant select on public.site_templates to authenticated;
grant select on public.site_template_versions to authenticated;
grant select on public.deployments to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select on tables to anon;
