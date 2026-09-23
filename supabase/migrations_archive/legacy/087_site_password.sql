-- Shop password protection
-- Adds optional password gate to published shops.
-- site_password_hash stores a bcrypt hash (cost 10) of the owner-set password.
-- site_password_enabled gates whether the hash is enforced.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS site_password_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS site_password_hash TEXT;

-- Only the project owner can read/write these fields (already covered by
-- the existing projects RLS policy that checks user_id = auth.uid()).
-- No extra policy needed.

COMMENT ON COLUMN projects.site_password_enabled IS 'When true, visitors must enter a password before viewing the published shop.';
COMMENT ON COLUMN projects.site_password_hash IS 'bcrypt hash (cost 10) of the shop password. NULL when no password is set.';
