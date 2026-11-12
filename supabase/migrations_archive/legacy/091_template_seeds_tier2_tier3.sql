-- Seed Tier 2 and Tier 3 West African business templates into site_templates.
-- Idempotent: uses ON CONFLICT DO UPDATE so safe to re-run.
-- Definitions (JSONB) are intentionally minimal stubs — the authoritative definition
-- lives in lib/create/templates-seed.ts and is upserted at runtime by ensureTemplatesSeeded().
-- This migration ensures the rows exist on a cold deploy before the first API call.

insert into public.site_templates (slug, name, category, description, is_active)
values
  -- Tier 2
  ('pharmacie',       'Pharmacie',       'health',        'Pharmacy — WhatsApp prescription, home delivery, Wave / Orange Money · 5 pages',                              true),
  ('btp',             'BTP',             'construction',  'Construction & renovation contractor — milestone payments, before/after gallery, devis form · 5 pages',        true),
  ('photographe',     'Photographe',     'creative',      'Professional photographer — portfolio, FCFA packages, booking form, mobile money · 5 pages',                   true),
  ('agence-digitale', 'Agence Digitale', 'agency',        'Digital marketing agency — services, case studies, team, WhatsApp lead gen · 5 pages',                        true),
  ('musicien',        'Musicien',        'music',         'Musician / artist — Boomplay & Audiomack links, events booking, merch shop · 5 pages',                         true),
  -- Tier 3
  ('agriculture',     'Agriculture',     'agriculture',   'Farm / producer — seasonal availability badge, bulk orders, WhatsApp delivery, Wave / Orange Money · 5 pages', true),
  ('ong',             'ONG',             'ngo',           'Non-profit / NGO — projects, impact stats, donations via mobile money, volunteer signup · 5 pages',             true),
  ('eglise',          'Église',          'community',     'Church / faith community — service times, announcements, donations via Wave / Orange Money · 5 pages',          true),
  ('legal',           'Cabinet Juridique','legal',        'Law firm / legal consultant — practice areas, consultation booking, FCFA fees, confidential · 5 pages',         true),
  ('wholesale',       'Grossiste',       'wholesale',     'B2B wholesale distributor — product catalog, bulk order minimums, WhatsApp price list, mobile money · 5 pages', true)
on conflict (slug) do update
  set
    name        = excluded.name,
    category    = excluded.category,
    description = excluded.description,
    is_active   = excluded.is_active,
    updated_at  = now();
