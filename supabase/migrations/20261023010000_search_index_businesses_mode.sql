-- Extend the Phase One search index to a third mode: active Kebu ID businesses.
-- Additive only: existing 'sites' and 'opportunities' rows and behavior are unchanged.

alter table public.search_documents drop constraint if exists search_documents_mode_check;
alter table public.search_documents
  add constraint search_documents_mode_check check (mode in ('sites', 'opportunities', 'businesses'));
