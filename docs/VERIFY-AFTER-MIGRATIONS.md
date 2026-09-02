# Verify after migrations (Country · Documents · Domains)

Apply these in Supabase **SQL editor** (or CLI) in order, then run the checks below.

## Migrations to apply

| Order | File | Unlocks |
|------:|------|---------|
| 1 | `001` (if not already) | `country_profiles` base |
| 2 | `009_opportunity_country_explorer.sql` | Country Explorer + AI analyses |
| 3 | `005`–`007` (if not already) | Kebu ID + registration |
| 4 | `008` (if not already) | Builder projects |
| 5 | `015_custom_domains.sql` | `site_domains` + connect UI |
| 6 | `016_registration_timeline.sql` | Tracker step labels |
| 7 | `017_business_documents.sql` | Docs table + Storage bucket |

**Env (deploy):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (required for custom-host routing). Optional: `ANTHROPIC_API_KEY` for country AI analysis.

---

## 1. Opportunity OS — Country Explorer

**Wired today:** `/opportunity` → `/opportunity/countries` → `GET /api/opportunity/countries` → `country_profiles`  
Detail: `/opportunity/countries/[code]` → `GET /api/opportunity/countries/[code]` (+ optional `POST …/ai-analysis`)

### Manual check
1. Open `/opportunity/countries` — list loads (Senegal after 009 seed; more via admin seed).
2. Open `/opportunity/countries/sn` — curated sections show; **Sources & freshness** block visible when data present.
3. Trust: profile labeled **Curated / public overview**; AI block labeled **AI-generated** (separate).
4. `/map` and `/map/sn` redirect to Country Explorer (no hard-coded legacy explorer).
5. (Optional) Run AI analysis while logged in — needs `ANTHROPIC_API_KEY`; otherwise honest 503.
6. Refresh — same data (not memory-only).

### If it fails
- Empty list + no error → publish_status / seed missing (run admin seed or re-check 009).
- Error mentioning migrations → apply **001 + 009**.
- `/opportunity/[id]` sample cards → **not** Country Explorer (still sample data).

---

## 2. Business documents

**Wired today:** `/business/[id]` → `BusinessDocumentsPanel` →  
`GET/POST /api/businesses/[id]/documents` · `DELETE …/documents/[docId]` → Storage `business-documents` + `business_documents` → syncs `documents_uploaded` on `registration_progress` → readiness recalc.

### Manual check
1. Register or open a business dashboard.
2. Upload **Founder ID** + **Business plan** (PDF/JPEG/PNG/WebP, ≤10 MB).
3. Checklist shows ✓ for both; timeline **Documents Uploaded** completes.
4. Refresh page — files still listed; step still complete.
5. Remove one required type — step reverts to incomplete.
6. Other user’s business id → 404 (no cross-access).

### If it fails
- “Apply migration 017” → run `017_business_documents.sql` (creates table + bucket + RLS).
- Upload 500 with storage error → bucket/policies from 017 missing.

---

## 3. Custom domains

**Wired today:** Editor Site tab →  
`GET/POST/DELETE /api/projects/[id]/domains` · `POST …/domains/[domainId]/verify` → `site_domains`  
Middleware: verified host → `resolveSubdomainForCustomHost` (service role) → `/sites/{subdomain}`.

### Manual check
1. Project has a subdomain set and is **published** (`/sites/{sub}` works on the app host).
2. Site tab → add `yourdomain.com` → DNS steps show **CNAME `www` → `cname.vercel-dns.com`** (or your Vercel `*.vercel.app` deployment hostname — both are accepted after the latest deploy).
3. At your registrar (e.g. Namecheap): Host `www`, Value `cname.vercel-dns.com`. Do **not** use `{sub}.kebu.africa`.
4. Redirect bare `yourdomain.com` → `https://www.yourdomain.com`.
5. After DNS propagates → **Verify** → status `verified`. HTTPS is attached by Kebu automatically (ops: `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`).
6. With `SUPABASE_SERVICE_ROLE_KEY` on the host → visit custom host → same site as `/sites/{sub}`.
7. Wrong user’s project → 404.

### If it fails
- “Apply migration 015” → run `015_custom_domains.sql`.
- UI still says “expected `{sub}.kebu.africa`” → **production is on old code**; commit/push the DNS target fix and redeploy.
- Rows stuck with old `dns_target` → run `030_repair_site_domain_dns_targets.sql` in SQL Editor.
- Verify OK but HTTPS missing → set **`VERCEL_TOKEN` + `VERCEL_PROJECT_ID`** on the Kebu server (users must never open a hosting dashboard).
- Verify OK but host does not resolve → missing **service role** on middleware, or DNS not pointed.

---

## Automated checks (already green without live DB)

```bash
npx vitest run tests/opportunity tests/kebu-id/business-documents.test.ts tests/kebu-id/registration-progress-meta.test.ts tests/create/custom-domains.test.ts tests/create/domains-api.test.ts tests/create/resolve-custom-domain.test.ts
```

---

## Code status (pre-migration)

| Slice | FE ↔ API ↔ DB design | Needs migration applied | Needs commit/push for prod |
|-------|----------------------|-------------------------|----------------------------|
| Country Explorer | Yes | **009** (+ 001) | Mostly on `main` |
| Documents | Yes | **017** (+ 016 labels) | Routes/lib/migration still local WIP |
| Domains | Yes | **015** + service role; **030** if stale `dns_target` | **DNS verify fix not on prod until commit/push + redeploy** |

After you apply migrations, walk the three manual checklists above and report any step that fails — we fix root cause, not UI workarounds.
