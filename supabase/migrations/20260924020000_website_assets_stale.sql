-- website_assets: add stale_at for asset lifecycle reconciliation
--
-- stale_at is set by the asset-cleanup cron when reconciliation detects that a
-- DB record's corresponding storage object is missing.  NULL = asset is valid.
-- The column is never set by user mutations — only by the reconciliation worker.

ALTER TABLE public.website_assets
  ADD COLUMN IF NOT EXISTS stale_at timestamptz;

COMMENT ON COLUMN public.website_assets.stale_at IS
  'Set when asset reconciliation finds no corresponding storage object. '
  'NULL means the asset is (presumed) valid. '
  'Cleared if the storage object reappears or the record is manually corrected.';
