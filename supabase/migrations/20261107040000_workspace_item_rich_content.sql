-- Docs upgrade: workspace_items (kind='doc') gains a real structured rich-text
-- content column, separate from the existing plain-text `body` column.
--
-- `body` stays exactly what it always was for 'task'/'event' items, and keeps
-- working unchanged for any 'doc' row that predates this migration (plain text,
-- capped at 20,000 chars, already real and tested). For a 'doc' row that has
-- been edited since this migration, `rich_content` becomes the real source of
-- truth (a TipTap/ProseMirror JSON document) and `body` is kept as a *derived*
-- plain-text extraction of it, written by the API route on every save — so
-- every existing reader of `body` (previews, search, exports, the old plain
-- textarea fallback) keeps working without modification.
alter table public.workspace_items
  add column if not exists rich_content jsonb;

comment on column public.workspace_items.rich_content is
  'Real structured rich-text content (TipTap/ProseMirror JSON) for kind=''doc'' items. Null for task/event items and for doc rows never opened in the rich editor. body is kept in sync as a derived plain-text extraction when this is set.';

notify pgrst, 'reload schema';
