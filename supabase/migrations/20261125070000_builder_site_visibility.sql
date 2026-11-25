alter table public.projects
  add column site_visibility text check (site_visibility in ('public','private','coming_soon','paused')),
  add column site_launch_at timestamptz,
  add column site_visibility_message text check (char_length(site_visibility_message) <= 240),
  add constraint builder_visibility_password_required check (
    site_visibility is distinct from 'private' or (site_password_enabled is true and site_password_hash is not null)
  );

-- A public Data API request must not see a gated deployment snapshot.
create function public.builder_site_is_public(p_project_id uuid, p_subdomain text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.projects p where p.id = p_project_id
      and p.status = 'published' and p.subdomain = p_subdomain
      and (p.site_visibility = 'public'
        or (p.site_visibility is null and p.site_password_enabled is not true)
        or (p.site_visibility = 'coming_soon' and p.site_launch_at <= now()))
  );
$$;
revoke all on function public.builder_site_is_public(uuid, text) from public;
grant execute on function public.builder_site_is_public(uuid, text) to anon, authenticated;

drop policy if exists "Public read live or suspended deployments" on public.deployments;
drop policy if exists "Public read live deployments" on public.deployments;
create policy "Public read live deployments" on public.deployments for select
  using (status = 'live' and public.builder_site_is_public(project_id, subdomain));

