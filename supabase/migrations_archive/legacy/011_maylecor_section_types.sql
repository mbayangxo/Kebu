-- May Lecor / K-Direction artist layout section types

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'features',
    'testimonials', 'faq', 'contact', 'whatsapp', 'footer',
    'heading', 'paragraph', 'button',
    'maylecor-home', 'maylecor-music'
  ));

create table if not exists public.builder_schema_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '11')
on conflict (key) do update set value = excluded.value, updated_at = now();

alter table public.builder_schema_meta enable row level security;

drop policy if exists "Authenticated read builder schema meta" on public.builder_schema_meta;
create policy "Authenticated read builder schema meta"
  on public.builder_schema_meta for select
  using (auth.role() = 'authenticated');
