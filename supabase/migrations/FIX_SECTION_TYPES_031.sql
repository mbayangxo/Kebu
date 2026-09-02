-- One-shot fix if production rejects kdirection-home / kdirection-page inserts.
-- Same as 031_kdirection_section_types.sql — run in Supabase SQL Editor.

alter table public.project_sections drop constraint if exists project_sections_section_type_check;

alter table public.project_sections
  add constraint project_sections_section_type_check
  check (
    section_type in (
      'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
      'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'whatsapp',
      'heading', 'paragraph', 'button', 'free-text', 'footer',
      'maylecor-home', 'maylecor-music', 'legally-blonde-hero',
      'kdirection-home', 'kdirection-page'
    )
  );

alter table public.project_sections validate constraint project_sections_section_type_check;

create table if not exists public.builder_schema_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '31')
on conflict (key) do update set value = excluded.value, updated_at = now();
