# Opportunity OS — Slice 1: Country Explorer

## What shipped

DB-backed country profiles (extends `country_profiles`) + separate `country_ai_analyses`.

- `/opportunity` hub
- `/opportunity/countries` list (API → DB)
- `/opportunity/countries/[code]` verified sections + optional AI analysis
- `GET /api/opportunity/countries`
- `GET /api/opportunity/countries/[code]`
- `POST /api/opportunity/countries/[code]/ai-analysis` (auth + rate limit; stored as `ai_generated`)
- `POST /api/opportunity/countries/seed` (admin password + service role)

## Apply

1. `001_alkebulan_schema.sql` (if needed for `country_profiles`)
2. `009_opportunity_country_explorer.sql` (Senegal seed)

Optional: seed more curated countries:

```bash
curl -X POST "$APP/api/opportunity/countries/seed" \
  -H "x-admin-password: $ADMIN_PASSWORD"
```

## Trust

Verified/curated profile fields ≠ AI analysis. UI labels them separately.

## Not in this slice

Industry/resource/import/export explorers, Opportunity AI chat, Build This Business auto-drafts, full admin CMS.
