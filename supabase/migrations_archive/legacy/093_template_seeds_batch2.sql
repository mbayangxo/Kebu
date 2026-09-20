-- Migration 093: New template seeds batch 2
-- Talent agency, management, skincare, food brand, juice, electronics, supermarket, school, media
-- All idempotent ON CONFLICT upserts

INSERT INTO site_templates (slug, name, category, description, is_public, created_at, updated_at)
VALUES
  ('talent-agency',      'Talent Agency',                'entertainment', 'Agence de talent — roster, casting briefs WhatsApp, représentation mannequins/acteurs/influenceurs · 5 pages', true, now(), now()),
  ('management-company', 'Management Company',           'entertainment', 'Management d'artistes & créateurs — roster, brand deals, services, formulaire partenariat · 5 pages',           true, now(), now()),
  ('skincare-brand',     'Marque Skincare',              'beauty',        'Marque skincare peaux africaines — éducation, consultation WhatsApp, avis avec type de peau, loyalty · 6 pages', true, now(), now()),
  ('food-brand',         'Marque alimentaire',           'food',          'Marque alimentaire africaine — produits, recettes, stockistes, commande B2C et B2B · 6 pages',                   true, now(), now()),
  ('juice-brand',        'Marque de jus & boissons',     'food',          'Cold-pressed, fruits africains — gamme, ingrédients locaux, abonnement hebdomadaire, livraison matin · 5 pages', true, now(), now()),
  ('electronics-store',  'Boutique high-tech',           'retail',        'Téléphones neuf/reconditionné, accessoires, réparation express — paiement en 3× Wave · 6 pages',                 true, now(), now()),
  ('supermarket',        'Supermarché / épicerie',       'retail',        'Courses livrées en 2h — liste WhatsApp, rayons, promotions, abonnement hebdomadaire · 5 pages',                  true, now(), now()),
  ('school',             'École & établissement scolaire','education',    'Site d''école — programmes, admission, vie scolaire, groupe WhatsApp parents, actualités · 6 pages',              true, now(), now()),
  ('media-company',      'Média & presse',               'media',         'Média digital africain — actualités, émissions, podcast, publicité brand content · 6 pages',                     true, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  category    = EXCLUDED.category,
  description = EXCLUDED.description,
  is_public   = EXCLUDED.is_public,
  updated_at  = now();
