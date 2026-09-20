alter table public.studio_video_projects
  add column if not exists business_id uuid references public.businesses(id) on delete set null,
  add column if not exists source_design_id uuid references public.create_designs(id) on delete set null;

create index if not exists studio_video_projects_business_idx
  on public.studio_video_projects(business_id, updated_at desc)
  where business_id is not null;

create index if not exists studio_video_projects_source_design_idx
  on public.studio_video_projects(source_design_id)
  where source_design_id is not null;
