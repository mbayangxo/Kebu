-- Legally Blonde animated showcase section type

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'features',
    'testimonials', 'faq', 'contact', 'whatsapp', 'footer',
    'heading', 'paragraph', 'button',
    'maylecor-home', 'maylecor-music', 'legally-blonde-hero'
  ));

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '12')
on conflict (key) do update set value = excluded.value, updated_at = now();
