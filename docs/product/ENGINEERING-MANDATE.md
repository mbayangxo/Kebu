# Kebu Engineering Mandate

Kebu is a **real production-oriented full-stack platform** — not a landing page, prototype, or demo.

This document is the engineering contract for all slices. Agent rules: `.cursor/rules/kebu-constitution.mdc`, `kebu-vertical-slice.mdc`, `kebu-single-slice.mdc`.

---

## Core product

Kebu helps African users **discover → learn → create → launch → operate → scale** digital businesses.

Connected products (separate boundaries, shared core):

1. **Kebu Builder** — sites, stores, templates, AI, domains, hosting, payments architecture, analytics  
2. **Kebu Opportunity OS** — discovery, country/industry intelligence, build-this-opportunity  
3. **Kebu Cloud** — deploy apps, DB, workers (future; invisible to beginners)  
4. **Kebu Mail** — business email on custom domains (future)  
5. **Kebu Domains** — connect/buy domains, DNS (partial via Builder today)  
6. **Kebu Analytics** — business intelligence (future product)  
7. **Kebu Business Infrastructure** — Kebu ID, registration, KA Score, team, documents  
8. **Kebu AI** — assistant across products with RBAC  

See `docs/KEBU-ECOSYSTEM.md` for the full map.

---

## Architectural principle

Products share **authentication, Kebu ID, billing, AI gateway, audit, notifications** — but must **not** become one tangled app.

- Clear domain boundaries  
- No duplicate core logic  
- **No fake integrations**  

---

## Absolute full-stack rule

**Never:**

- Frontend-only features  
- Buttons that pretend to work  
- Hardcoded fake data where persistence is required  
- Frontend API calls without backend  
- Backend without frontend flow  
- Unused database tables  
- UI for non-existent functionality  
- “Complete” because the page looks finished  

**Every feature:**

```
UI → state → validation → API → auth → authz → logic → DB/storage → external services
→ loading / empty / error / success → persistence → tests
```

---

## Vertical slice development

**One complete vertical slice at a time.**

For each slice: define outcome → FE/BE/DB/auth → states → implement full flow → test → fix → refresh verify → authz verify → mobile → **then** next slice.

---

## Definition of done

Not done until:

- Fresh account works  
- Refresh persists data  
- Backend + DB verified  
- Validation, auth, authz  
- All UI states + invalid input + duplicates + network errors  
- Unauthorized rejected; cross-user denied  
- Important actions logged  
- Automated tests for critical paths  
- FE/BE contracts match  
- No placeholder/TODO treated as done  
- Typecheck, lint (changed files), build, tests pass  

---

## Bug policy

Find root cause: frontend → API → backend → DB → external. Fix underlying issue. Add regression test when practical. **Do not hide errors.**

---

## Database policy

Real entities, migrations only, FKs/constraints, server validation, ownership, RLS, indexes, idempotency where needed.

---

## Security policy

Secrets server-side only. Authz on server. Protect IDOR, injection, XSS, abuse, rate limits, file uploads.

---

## AI policy

Provider interface, validated output, no silent destructive ops, user understands when AI acts.

---

## African-first

Mobile, low bandwidth, affordability, plain language, first-time founders — not generic Western SaaS with new colors.

---

## Before every implementation

Inspect repo → plan → files/DB/APIs/tests → avoid duplicating existing systems.

---

## After every implementation

Typecheck · lint · unit · integration · E2E · build · migration validation · manual user journey trace.

---

## No fake completion

If not implementable yet, label **NOT IMPLEMENTED**. Build integration boundaries + document remaining config.

---

## Most important rule

**One working vertical slice beats twenty unfinished screens.**

Current status: `docs/IMPLEMENTATION_STATUS.md`
