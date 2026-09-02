# Security documentation

Security is implemented per slice, not deferred. **Nothing is “unhackable”** — we reduce risk continuously.

## Principles

1. **Server-side authz** — UI hiding is not authorization  
2. **Secrets server-only** — Supabase service role, AI keys, JOKO, cron secrets in env  
3. **RLS** — tenant isolation on Supabase tables  
4. **Validation** — Zod (or equivalent) on all mutation bodies  
5. **Rate limits** — builder, public, AI, and auth (admin login) routes  
6. **Audit** — `business_audit_logs` for Kebu ID events; Create uses structured logs  

## Hardening slice (accounts / sites / platform)

| Control | Status |
|---------|--------|
| Project ownership + RLS | In place |
| Admin cookie = signed session (not raw password) | In place (`lib/admin/admin-session.ts`) |
| Auth rate limit (admin login) | In place (`authRateLimit`) |
| `/shop` + `/support` require login (middleware) | In place |
| HSTS in production | In place |
| Same-origin check on publish + section save | In place |
| Block unsafe scripts in section props | In place |
| Distributed rate limits (Redis) | Not yet — in-memory per instance |
| MFA for owners | Not yet |
| Durable Create audit table | Not yet |

## Threat focus

| Risk | Mitigation |
|------|------------|
| IDOR | Owner/member checks; project `owner_id`; domain scoped to `project_id` |
| Admin cookie theft | Signed expiring token; password never in cookie |
| Password guessing | `authRateLimit` on admin login; enable Supabase auth rate limits in dashboard |
| CSRF on cookie APIs | Same-origin check + SameSite=lax |
| XSS in sites | `containsUnsafeSiteContent` + structured renderer |
| Cross-tenant leaks | RLS + 404 on unauthorized fetch |
| Abuse | Rate limits; idempotency on business create |

## Environment variables (server)

| Variable | Use |
|----------|-----|
| `ADMIN_PASSWORD` | Admin portal password (never put in browser cookie) |
| `ADMIN_SESSION_SECRET` | Optional HMAC secret for admin session cookies |
| `KEBU_SUPPORT_ADMIN_EMAILS` | Support staff who may open user sites (audited) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only |
| `CRON_SECRET` | Cron routes |

## Tests

- `tests/kebu-id/security.test.ts` — authz / score injection  
- `tests/security/admin-session.test.ts` — signed admin cookie + origin guard  
- `tests/create/support-access.test.ts` — support allowlist  

## Reporting

Production incidents: document in `docs/decisions/` as ADR + fix + regression test.
