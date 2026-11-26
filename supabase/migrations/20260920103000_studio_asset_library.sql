-- Studio reusable assets: metadata/favorites/folders + audio library support
alter table public.studio_uploads drop constraint if exists studio_uploads_kind_check;
alter table public.studio_uploads add constraint studio_uploads_kind_check check(kind in ('image','video','audio'));
alter table public.studio_uploads add column if not exists tags text[] not null default '{}';
alter table public.studio_uploads add column if not exists folder text check(folder is null or char_length(folder)<=80);
alter table public.studio_uploads add column if not exists favorite boolean not null default false;
alter table public.studio_uploads add column if not exists width int check(width is null or width>0);
alter table public.studio_uploads add column if not exists height int check(height is null or height>0);
alter table public.studio_uploads add column if not exists duration_ms int check(duration_ms is null or duration_ms>=0);
create index if not exists studio_uploads_scope_kind_created_idx on public.studio_uploads(business_id,kind,created_at desc);
create index if not exists studio_uploads_tags_gin_idx on public.studio_uploads using gin(tags);
notify pgrst,'reload schema';