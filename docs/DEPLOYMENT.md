# Kebu — Deployment

**CI must pass before deploy.** See `docs/CI_PIPELINE.md`.

---

## Environments

| Environment | Purpose | Gate |
|-------------|---------|------|
| **Local** | Development | `npm run dev` |
| **Preview** | PR / branch preview | CI green |
| **Staging** | Pre-production E2E | CI + staging E2E |
| **Production** | Live users | Staging verified |

---

## Deploy flow

```
Feature complete (Definition of Done)
    ↓
npm run ci  (local)
    ↓
PR → GitHub CI (all gates)
    ↓
Code review
    ↓
Merge to main
    ↓
Staging deploy
    ↓
E2E on staging (Playwright + manual smoke)
    ↓
Production deploy
    ↓
Post-deploy: Bug Sentinel checks (when live)
```

**If CI fails → DEPLOYMENT STOPS.**

---

## Migrations

1. Add migration to `supabase/migrations/` (and `docs/migrations-to-apply/` when used)  
2. Apply to staging Supabase  
3. Run DB + RLS tests  
4. Apply to production **before** or **with** code that depends on schema  
5. Verify: `docs/VERIFY-AFTER-MIGRATIONS.md`

Never deploy code requiring columns/tables that are not migrated.

---

## Secrets

Server-only (never `NEXT_PUBLIC_` unless intentionally public):

- Supabase service role  
- AI provider keys  
- Payment webhooks (JOKO, PayPal, Paystack, Wave, Stripe)  
- Cron secrets  
- Email (Resend)  

Configure per environment in hosting provider (Vercel / future Kebu Cloud).

---

## Rollback

- Revert deploy to last green CI commit  
- Migrations: **prefer forward-fix** — do not drop production data without runbook  
- Document incident in Engineering Health (`docs/ENGINEERING_HEALTH.md`)

---

## Forbidden

- Deploy from failing CI  
- Hot-patch production without PR + tests  
- Cron or AI **auto-editing production** (see AI bug pipeline in `docs/product/BUG_PROTOCOL.md`)  
- Skip staging for schema-breaking changes  
