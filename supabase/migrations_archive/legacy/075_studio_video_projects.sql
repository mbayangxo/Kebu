-- Kebu Studio Video Phase 1: editable multi-track compositions
-- Depends on: auth.users · set_updated_at() · site-assets (023)

create table if not exists public.studio_video_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  width int not null default 1080 check (width between 200 and 4096),
  height int not null default 1920 check (height between 200 and 4096),
  frame_rate numeric(6, 2) not null default 30
    check (frame_rate >= 8 and frame_rate <= 60),
  edit_mode text not null default 'full_timeline'
    check (edit_mode in ('quick_edit', 'smart_edit', 'full_timeline')),
  /** Full StudioComposition JSON — tracks, clips, storyboard, music, assets */
  composition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_video_projects_owner_idx
  on public.studio_video_projects (owner_id, updated_at desc);

alter table public.studio_video_projects enable row level security;

drop policy if exists "Owners manage studio video projects" on public.studio_video_projects;
create policy "Owners manage studio video projects"
  on public.studio_video_projects for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_video_projects to authenticated;
grant all on public.studio_video_projects to service_role;

drop trigger if exists studio_video_projects_set_updated_at on public.studio_video_projects;
create trigger studio_video_projects_set_updated_at
  before update on public.studio_video_projects
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
