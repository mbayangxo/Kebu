# Security documentation

Security is implemented per slice, not deferred.

## Principles

1. **Server-side authz** — UI hiding is not authorization  
2. **Secrets server-only** — Supabase service role, AI keys, JOKO, cron secrets in env  
3. **RLS** — tenant isolation on Supabase tables  
4. **Validation** — Zod (or equivalent) on all mutation bodies  
5. **Rate limits** — builder and business mutation routes  
6. **Audit** — `business_audit_logs` for Kebu ID events; extend per sensitive product  

## Threat focus

| Risk | Mitigation |
|------|------------|
| IDOR | Owner/member checks; project `owner_id`; domain scoped to `project_id` |
| Score tampering | Reject client-submitted score fields (`POST /api/businesses`) |
| XSS in sites | `containsUnsafeSiteContent`, structured renderer (no arbitrary HTML injection) |
| Cross-tenant leaks | RLS + 404 on unauthorized business fetch |
| Enumeration | Non-sequential Kebu public IDs; draft public lookup 404 |
| Abuse | Rate limits; idempotency on business create |

## Environment variables (server)

| Variable | Use |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server session |
| `SUPABASE_SERVICE_ROLE_KEY` | Middleware domain resolve, admin reads — **never client** |
| `CRON_SECRET` | Site health cron |
| JOKO / Stripe / AI keys | Payments & AI routes |

## Tests

`tests/kebu-id/security.test.ts` — authz contracts, score injection rejection.

Gaps: integration tests for all API routes; security review before PRODUCTION READY.

## Reporting

Production incidents: document in `docs/decisions/` as ADR + fix + regression test.
