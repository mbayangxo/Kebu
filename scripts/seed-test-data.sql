-- seed-test-data.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds a minimal but realistic test project for the builder DB integration
-- tests. Runs AFTER setup-test-db.sh has applied builder migrations.
--
-- Usage:
--   sudo -u postgres psql -d kebu_test -f scripts/seed-test-data.sql
--   # OR with DATABASE_URL:
--   psql $DATABASE_URL -f scripts/seed-test-data.sql
--
-- Inserts (idempotently via fixed UUIDs):
--   • 1 test user  (id: 00000000-0000-0000-0000-000000000001)
--   • 1 project    (id: 00000000-0000-0000-0000-000000000010)
--   • 2 pages      (home, about)
--   • 5 sections   (3 on home, 2 on about)
--
-- All IDs are fixed so they can be referenced in test assertions without
-- querying first. Re-running this file is safe (upsert via ON CONFLICT DO
-- NOTHING on the fixed UUIDs).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── test user ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'testuser@kebu.test')
ON CONFLICT (id) DO NOTHING;

-- ── project ──────────────────────────────────────────────────────────────────
-- NOTE: kebu_test has an older 'projects' schema with 'name' not 'title'.
-- The concurrency tests create their own temp schema and do NOT use this
-- public.projects row. This seed is provided for future E2E tests and
-- must be updated when kebu_test is migrated to the full production schema.
INSERT INTO public.projects (id, owner_id)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ── pages ────────────────────────────────────────────────────────────────────
INSERT INTO public.project_pages (id, project_id, slug, title, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'home',  'Home',  0),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'about', 'About', 1)
ON CONFLICT (id) DO NOTHING;

-- ── sections (home page) ─────────────────────────────────────────────────────
-- NOTE: Uses section_type values valid in the current kebu_test constraint:
--   hero, heading, paragraph, image, button, features, footer, navigation, whatsapp
INSERT INTO public.project_sections (id, page_id, section_type, sort_order, props)
VALUES
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000020',
    'hero',
    0,
    '{"heading": "Welcome to Test", "subheading": "This is a test site", "buttonLabel": "Learn More", "buttonHref": "#about"}'
  ),
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000020',
    'heading',
    1,
    '{"text": "Home page heading section"}'
  ),
  (
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000020',
    'features',
    2,
    '{"heading": "Our Features", "items": [{"label": "Fast", "description": "Blazing fast"}, {"label": "Secure", "description": "Rock solid"}]}'
  )
ON CONFLICT (id) DO NOTHING;

-- ── sections (about page) ─────────────────────────────────────────────────────
INSERT INTO public.project_sections (id, page_id, section_type, sort_order, props)
VALUES
  (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000021',
    'paragraph',
    0,
    '{"text": "About page introduction."}'
  ),
  (
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000021',
    'footer',
    1,
    '{"heading": "Get in touch", "email": "hello@test.com"}'
  )
ON CONFLICT (id) DO NOTHING;
