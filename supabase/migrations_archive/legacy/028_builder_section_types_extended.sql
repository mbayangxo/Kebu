-- Allow all Phase One builder section types (video, audio, products, newsletter, …)

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
    'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'whatsapp', 'footer',
    'heading', 'paragraph', 'button',
    'maylecor-home', 'maylecor-music', 'legally-blonde-hero'
  ));

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '28')
on conflict (key) do update set value = excluded.value, updated_at = now();
