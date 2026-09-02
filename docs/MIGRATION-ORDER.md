# Apply Kebu migrations in Supabase

## If you already have 001–020 (and maybe 028) — read this first

**Error `policy "Users can read their own profile" already exists`** means you re-ran **`APPLY_ALL_PHASE_ONE.sql` from the top** on a database that already has migration 001. That is expected — **do not run the full file again.**

1. Run **[`VERIFY_PHASE_ONE.sql`](../supabase/migrations/VERIFY_PHASE_ONE.sql)** — see which rows are ❌.
2. If only **021–027** are missing, run **[`APPLY_MIGRATIONS_021_027.sql`](../supabase/migrations/APPLY_MIGRATIONS_021_027.sql)** (one paste, safe to re-run).
3. If **028** is missing, run **[`028_builder_section_types_extended.sql`](../supabase/migrations/028_builder_section_types_extended.sql)**.
4. If **029** fails on `project_sections_section_type_check`, run **[`FIX_SECTION_TYPES_029.sql`](../supabase/migrations/FIX_SECTION_TYPES_029.sql)** then **029** again.
5. If custom domains show obsolete `*.kebu.africa` DNS targets, run **[`030_repair_site_domain_dns_targets.sql`](../supabase/migrations/030_repair_site_domain_dns_targets.sql)**.
6. Run **VERIFY** again until all needed rows are ✅.

---

## Easiest: one file (fresh Supabase project only)

Open and paste the **entire** file into Supabase → **SQL Editor** → **Run**:

**[`supabase/migrations/APPLY_ALL_PHASE_ONE.sql`](../supabase/migrations/APPLY_ALL_PHASE_ONE.sql)**

That file runs **001 → 027** (skips legacy 002/003) in the correct order.

**Check what you already have:** run [`VERIFY_PHASE_ONE.sql`](../supabase/migrations/VERIFY_PHASE_ONE.sql) first — it only reads status (✅/❌ per table).

- **Fresh Supabase project:** run the whole file once.
- **Already ran 001 + 009:** run only the sections from `004_create_projects.sql` through `017_business_documents.sql` inside that file (or run 004–017 files one at a time).
- **Already ran through 020, need 021–027:** use **`APPLY_MIGRATIONS_021_027.sql`** only.

---

## Or run files one at a time

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
| 8 | `010`–`017`, `018`, `020`, `021`, `022`, `025`, `026` | Billing, templates, domains, docs, Kebu records, products, Create designs, API grants, email campaigns, **Opportunity intake + stories** |

Skip `002_network.sql` and `003_tracker_vault.sql` unless you use those legacy features.

## Common errors

### `policy "Users can read their own profile" already exists`

**Cause:** Re-ran **`APPLY_ALL_PHASE_ONE.sql` from the beginning** on a DB that already has 001.  
**Fix:** Do **not** re-run the full file. Run **[`APPLY_MIGRATIONS_021_027.sql`](../supabase/migrations/APPLY_MIGRATIONS_021_027.sql)** if VERIFY shows only 021–027 missing. Run **028** separately if needed.

### `relation "public.businesses" does not exist` on 006

**Cause:** Migration **005 never succeeded.**  
**Fix:** Run the full `005_kebu_id_draft_business.sql` (tables are created *before* RLS policies in the fixed version).

### `relation "public.business_members" does not exist` on 005

**Cause:** Old 005 tried to create RLS on `businesses` before `business_members` existed.  
**Fix:** Pull latest repo and re-run **005** from the fixed file.

### `Database error saving new user` on signup

**Cause:** `auth.users` signup trigger failed to insert into `public.user_profiles`.  
**Fix:** Run `019_fix_auth_signup_trigger.sql` in the SQL editor (also appended to `APPLY_ALL_PHASE_ONE.sql`).


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
