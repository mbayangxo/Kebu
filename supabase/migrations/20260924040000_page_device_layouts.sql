-- Phase 3B: Independent device compositions for website builder pages.
-- Adds a JSONB column to store per-device section ordering and visibility overrides
-- on top of the canonical desktop layout stored in project_sections.
-- NULL means all devices use the desktop layout unchanged — fully backward compatible.

ALTER TABLE public.project_pages
  ADD COLUMN IF NOT EXISTS device_layouts JSONB;

COMMENT ON COLUMN public.project_pages.device_layouts IS
  'Per-device section ordering/visibility (Phase 3B). Schema: { tablet?: DeviceLayout, mobile?: DeviceLayout }. '
  'NULL = all devices render the desktop section list in default order. '
  'desktop is always canonical; only tablet and mobile keys are valid here.';
