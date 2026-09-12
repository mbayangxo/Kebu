-- Migration 095: No schema changes — product badge/valuePriceLabel/filterTags and
-- filterLabel are stored as JSON inside section_props (jsonb). No DB changes needed.
-- Bumps builder version to 95.

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '95')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';
