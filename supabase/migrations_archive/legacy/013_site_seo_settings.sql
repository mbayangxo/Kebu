-- Site SEO settings (favicon, meta tags) stored on project + published snapshot

alter table public.projects add column if not exists seo jsonb not null default '{}'::jsonb;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '13')
on conflict (key) do update set value = excluded.value, updated_at = now();
