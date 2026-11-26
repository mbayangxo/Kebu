-- Unblock 23514: discover odd types, then apply full allow-list (incl. email-popup).
-- Paste alone in Supabase SQL Editor.

-- 1) See what you have (and what would violate the check)
select section_type, count(*) as rows
from public.project_sections
group by section_type
order by section_type;

-- 2) Drop old check
alter table public.project_sections drop constraint if exists project_sections_section_type_check;

-- 3) Full allow-list (matches lib/create/website-schema.ts + legacy heading/paragraph/button)
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
    'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'email-popup',
    'whatsapp', 'heading', 'paragraph', 'button', 'free-text', 'footer',
    'maylecor-home', 'maylecor-music', 'legally-blonde-hero',
    'kdirection-home', 'kdirection-page'
  ))
  not valid;

alter table public.project_sections validate constraint project_sections_section_type_check;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '31')
on conflict (key) do update set value = excluded.value, updated_at = now();
