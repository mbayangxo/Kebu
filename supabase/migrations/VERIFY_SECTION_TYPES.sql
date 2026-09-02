-- Shows section_type values that block migration 029.
-- Step 7 should return ZERO rows after FIX_SECTION_TYPES_029.sql.

select section_type, count(*) as row_count
from public.project_sections
group by section_type
order by row_count desc, section_type;

select section_type, count(*) as blocking_rows
from public.project_sections
where section_type not in (
  'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
  'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'whatsapp', 'footer',
  'heading', 'paragraph', 'button', 'free-text',
  'maylecor-home', 'maylecor-music', 'legally-blonde-hero'
)
group by section_type
order by blocking_rows desc;
