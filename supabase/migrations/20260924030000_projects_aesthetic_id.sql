-- projects: add aesthetic_id for theme/aesthetic association
--
-- aesthetic_id holds the slug of the aesthetic applied to this project
-- (matches site_templates.slug format).  NULL = no aesthetic chosen.
-- The QA harness and builder UI both insert/update this column.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS aesthetic_id text
    CHECK (aesthetic_id IS NULL OR aesthetic_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

COMMENT ON COLUMN public.projects.aesthetic_id IS
  'Slug of the aesthetic/theme applied to this project. '
  'Matches site_templates.slug. NULL means no aesthetic is selected.';
