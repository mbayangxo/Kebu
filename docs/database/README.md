# Database documentation

Database: **Supabase Postgres** with Row Level Security.

Migrations: `supabase/migrations/` — apply in numeric order.

## Core migration map

| File | Domain |
|------|--------|
| `001`–`004` | Legacy Alkebulan / opportunity base |
| `005`–`006` | Kebu ID draft business + RLS locks |
| `007` | Business registration, progress, readiness scores |
| `008` | Website builder (projects, sections, deployments, site_domains) |
| `010` | Site billing / JOKO |
| `011`–`012` | Template section types |
| `013` | Site SEO settings |
| `014` | Site health, developer marketplace tables |
| `015` | Custom domain columns |
| `016` | Registration timeline alignment |

## Entity relationships (simplified)

```
auth.users
    └── businesses (owner via business_members)
            ├── kebu_ids (public_kebu_id)
            ├── registration_progress
            ├── business_readiness_scores
            └── (future) ka_scores

auth.users
    └── projects (owner_id)
            ├── sections / pages
            ├── deployments (live snapshot)
            └── site_domains
```

## Policies

- Owners/members via RLS on business tables  
- Project owner_id on builder tables  
- Public read: live `deployments` only  
- Service role: custom domain middleware lookup (server only)  

## KA Score (future)

Tables not created yet. Spec: `.cursor/rules/kebu-ka-score.mdc`, `docs/KEBU-ID-KA-SCORE-STATUS.md`.

Planned: `ka_scores`, `ka_score_versions`, `ka_score_factors`, …

## Verification

After applying migrations:

```sql
select version from supabase_migrations.schema_migrations order by version;
```

Per-slice verification queries: see slice docs in `docs/product/`.
