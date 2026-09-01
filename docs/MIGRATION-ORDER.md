# Apply Kebu migrations in Supabase

Run **one file at a time** in Supabase → **SQL Editor** → New query → paste → **Run**.

If a step fails, **stop** and fix before continuing. Do not skip ahead.

## Required order

| Step | File | Unlocks |
|-----:|------|---------|
| 1 | `001_alkebulan_schema.sql` | Base schema + `country_profiles` |
| 2 | `009_opportunity_country_explorer.sql` | **Country Explorer** (Senegal seed) |
| 3 | `004_create_projects.sql` | Projects (if not already) |
| 4 | `005_kebu_id_draft_business.sql` | **businesses**, **business_members** |
| 5 | `006_kebu_id_lock_draft_status.sql` | Draft lock policies |
| 6 | `007_business_registration.sql` | Registration tracker |
| 7 | `008_website_builder.sql` | Sites + **deployments** |
| 8 | `010`–`017` | Billing, templates, domains, docs (as needed) |

Skip `002_network.sql` and `003_tracker_vault.sql` unless you use those legacy features.

## Common errors

### `relation "public.businesses" does not exist` on 006

**Cause:** Migration **005 never succeeded.**  
**Fix:** Run the full `005_kebu_id_draft_business.sql` (tables are created *before* RLS policies in the fixed version).

### `relation "public.business_members" does not exist` on 005

**Cause:** Old 005 tried to create RLS on `businesses` before `business_members` existed.  
**Fix:** Pull latest repo and re-run **005** from the fixed file.

### Country Explorer empty but no error

Run **001** then **009**. Check: `select country, publish_status from country_profiles;`

## Quick verify after 001 + 009

```sql
select country_code, country, publish_status from public.country_profiles;
```

Expect at least **SN / Senegal / published**.

## Quick verify after 005

```sql
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('businesses', 'business_members');
```

Expect **2 rows**.
