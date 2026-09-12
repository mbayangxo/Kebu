-- Migration 092: Fashion template seed
-- Idempotent upsert for the Mode / Fashion template

INSERT INTO site_templates (slug, name, category, description, is_public, created_at, updated_at)
VALUES (
  'fashion',
  'Mode / Fashion',
  'fashion',
  'Boutique mode West African — scroll éditorial, photo plein écran, WhatsApp «Je le veux» par produit · 5 pages',
  true,
  now(),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  category    = EXCLUDED.category,
  description = EXCLUDED.description,
  is_public   = EXCLUDED.is_public,
  updated_at  = now();
