# Kebu foundation audit — 2026-09-19

Status: remediation in progress on `work/kebu-security-remediation`. Do not merge or apply the historical SQL backlog merely because files exist.

## Live Supabase source of truth

Project: Kebu. At the initial audit, the live public schema contained the production
Kebu data model while `supabase_migrations.schema_migrations` recorded only four
migrations:

- `20260915204226 create_developer_apps`
- `20260919051124 add_site_password_fields`
- `20260919102208 quarantine_accidental_rect_objects`
- `20260919102210 enforce_opportunity_verified_access`

The history has since been reconciled without replaying legacy SQL; see
`supabase/MIGRATION_HISTORY.md`. Historical bundles now live outside the executable
migration directory and must not be pasted into production.

## Security findings verified against live database

- Every table in the public schema has RLS enabled.
- `platform_cron_runs` and `shop_checkout_email_otps` have no client policies; this intentionally denies normal Data API access and they are server-owned.
- No public views were found.
- The only public `SECURITY DEFINER` function is `handle_new_user()`; EXECUTE is not available to anon, authenticated, or PUBLIC, and its search path is explicitly set.
- Reconciled migration `20260919204303_harden_public_database_boundaries` fixed mutable search paths on `update_updated_at`, `set_updated_at`, and `touch_updated_at` and restricted public deployment reads to `status = 'live'`. The live policy/advisor state was re-checked after application.
- Supabase Auth leaked-password protection is disabled and should be enabled in project Auth settings.
- Performance advisor reports numerous unindexed foreign keys. Supabase documents these as performance guidance; add indexes based on real query paths and measured workload, not mechanically. Index-usage inspection confirmed active use of project-owner, verified-domain, live-subdomain, deployment-project, and analytics access paths.
- Reconciled migration `20260919212918_remove_duplicate_business_public_id_index` removed the redundant `businesses_public_kebu_id_uidx` while preserving the `businesses_public_kebu_id_key` UNIQUE constraint-backed index. The duplicate-index advisor warning was re-checked and cleared.

## Tenant/domain foundation

- `projects` is owner scoped by RLS.
- `site_domains` is owner scoped through project ownership.
- Hostnames are unique and verified-hostname/project indexes exist.
- Custom-domain middleware only resolves verified domains.
- Kebu provisions apex + www against one Vercel project.
- Domain removal now detaches hosting before deleting the Kebu registry row, leaving a retryable record on provider failure.
- At large scale, custom-domain resolution needs a distributed/cacheable hostname-to-site lookup; the current request path performs live Supabase lookups and is not the final 100k–500k-site design.

## Internal/support access

- Production admin sessions require a dedicated `ADMIN_SESSION_SECRET`; the login password must not double as the signing key.
- Cron bearer comparison is timing-safe.
- Whole-project deletion is owner-only. Support/team editor access must not escalate through service-role access into project deletion.
- Support access is allowlisted and logged, but a mature support system should add explicit staff roles, ticket/reason, time-bounded support sessions, and finer-grained read/edit/destructive permissions.

## Repository/migration hygiene

The repository currently contains canonical-looking migrations plus historical manual bundles and duplicate migration-number families. Until reconciliation is complete:

1. Do not apply `APPLY_*.sql` bundles to production.
2. Do not rewrite live migration history by guessing which old files ran.
3. Do not delete RECT quarantine; it is intentionally recoverable.
4. All future DDL should be represented by one canonical migration path after the baseline is established.
5. CI, tests, build, and database advisors must pass after schema changes.

## Known next-scale work

- Replace per-instance in-memory rate limiting with a distributed limiter before high traffic.
- Add cached/edge domain resolution before large multi-tenant scale.
- Strengthen E2E coverage beyond the current public-page smoke test, especially checkout/payment/webhook/fulfillment and cross-tenant access.
- Rework CI E2E triggering so pull-request code is exercised against the corresponding preview environment.
- Decompose behavior-heavy giant UI modules separately from security/database remediation.


## Second foundation pass
- Production cron and admin-session secrets now reject missing, weak, and obvious placeholder values; privileged endpoints fail closed.
- The in-process fallback rate limiter is memory-bounded. It remains a local abuse guard, not a substitute for distributed edge enforcement.
- Builder page, section, product, and custom-domain mutation paths now consistently enforce same-origin checks where audited.
- Live schema inspection confirmed the modern commerce columns are present. Product/order routes no longer silently retry old schema shapes; migration drift now fails visibly instead of being hidden.
- Preview E2E is triggered from Vercel deployment_status and checks out the exact deployment SHA. The previous static-base-URL CI path was removed to prevent false green tests against the wrong deployment.
- Distributed rate limiting/WAF remains an infrastructure configuration item because the connected Vercel surface does not expose a safe write action for firewall rules, and no external Redis dependency is being introduced without an explicit provider decision.
- Supabase leaked-password protection remains an account-level Auth setting; the connected Supabase surface exposes no Auth-config mutation action.

## Measured database review — 2026-09-20

The performance advisor still reports 60 unindexed foreign keys. These were not
converted mechanically into 60 write-amplifying indexes. Live statistics show the
remaining warned commerce/support relations are currently empty or very small,
while the observed hot paths already have targeted indexes:

- `deployments`: about 90 rows, with project and published-deployment indexes
- `site_analytics_events`: about 1,039 rows, with project/time/type indexes
- `project_sections`: about 193 rows, with strong index usage on editor queries
- `projects`: about 6 rows, with owner, subdomain, and business indexes
- orders/products/payment ledger: project/provider/customer/order access paths indexed
- support sessions and privileged audit events: active-session/project/audit lookups indexed

No additional index migration was justified from the current row counts and query
paths. Revisit the advisor as production data grows and add indexes when a real
join/filter path or query plan demonstrates benefit. `multiple_permissive_policies`
findings require semantic RLS review and must not be "fixed" by deleting policies.

The security advisor reports only the two intentional no-client-policy tables plus
the Auth-level leaked-password warning. `platform_cron_runs` and
`shop_checkout_email_otps` have no anon/authenticated grants. Leaked Password
Protection still requires an authorized Supabase dashboard change.
