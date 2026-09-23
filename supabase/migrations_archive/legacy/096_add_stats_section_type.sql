-- Migration 096: Add stats section type to DB constraint
-- stats = social-proof numbers strip (PORTUM/agency pattern)
-- Idempotent via DROP + ADD CONSTRAINT.

alter table public.project_sections drop constraint if exists project_sections_section_type_check;

alter table public.project_sections
  add constraint project_sections_section_type_check
  check (
    section_type in (
      'navigation', 'hero', 'editorial-hero', 'announcement-bar', 'marquee',
      'split', 'category-tiles',
      'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
      'features', 'testimonials', 'faq', 'products',
      'quiz',
      'stats',
      'contact', 'newsletter', 'email-popup',
      'form', 'blog-list',
      'whatsapp', 'free-text', 'footer',
      'maylecor-home', 'maylecor-music',
      'legally-blonde-hero',
      'kdirection-home', 'kdirection-page'
    )
  );

alter table public.project_sections validate constraint project_sections_section_type_check;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '96')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';
