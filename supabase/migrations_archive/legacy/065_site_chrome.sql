-- W13: Universal site header/footer (one chrome for all pages)
-- Apply after 064.

alter table public.projects
  add column if not exists site_chrome jsonb not null default '{}'::jsonb;

comment on column public.projects.site_chrome is
  'Universal header (navigation) + footer props applied to every page when enabled.';

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '65')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';
