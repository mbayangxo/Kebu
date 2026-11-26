-- Studio video: expand edit_mode for storyboard + quick_edit paths
-- Depends on: 075_studio_video_projects

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'studio_video_projects_edit_mode_check'
  ) then
    alter table public.studio_video_projects drop constraint studio_video_projects_edit_mode_check;
  end if;
exception when undefined_table then
  null;
end $$;

alter table public.studio_video_projects
  drop constraint if exists studio_video_projects_edit_mode_check;

alter table public.studio_video_projects
  add constraint studio_video_projects_edit_mode_check
  check (edit_mode in ('quick_edit', 'smart_edit', 'full_timeline', 'storyboard'));

notify pgrst, 'reload schema';
