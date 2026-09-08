# Kebu Engineering Mandate

Kebu is a **real production-oriented full-stack platform** — not a landing page, prototype, or demo.

**Master contract (paste into Cursor):** `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`  
**Agent rules:** `.cursor/rules/kebu-product-architect.mdc` · `kebu-master-engineering.mdc` · `kebu-vertical-slice.mdc` · `kebu-single-slice.mdc` · `kebu-constitution.mdc`

---

## How to use this with Cursor

Do **not** give Cursor a vague “build Kebu” or “build Canva/Spotify/Shopify” prompt.

0. **Product Architect Phase** — *“STOP. Do not write code. Decompose the product into a complete blueprint.”* — `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md`  
1. Point it at this mandate + `docs/IMPLEMENTATION_STATUS.md`  
2. Assign **one slice**: *“Implement Slice N completely. Do not proceed to Slice N+1. End-to-end with Supabase before you stop.”*  
3. **Design QA** — inspect running app; fix visual deficiencies until standard met  
4. **Adversarial audit**: *“Audit Slice N. Trace every action frontend → Supabase → frontend. Fix bugs, RLS, authz, persistence, errors. Do not move on.”*  
5. Update status · repeat  

**Foundation first for new work:** Kebu Account + Kebu ID + Supabase + workspace/business — everything else depends on it.

---

## Core product

Kebu helps African users **discover → learn → create → launch → operate → scale** digital businesses.

Connected products (separate boundaries, shared core): Builder · Opportunity OS · Kebu Opportunity OS · Search · Cloud · Mail · Domains · Analytics · Business Infrastructure · AI (Yande) · Studio · Learn (No watching).

See `docs/KEBU-ECOSYSTEM.md` · `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md` · `docs/product/KEBU-ACCOUNT-MODEL.md`.

---

## Absolute full-stack rule

```
UI → state → validation → API → auth → authz → logic → Supabase → DB/storage
→ loading / empty / error / success → persistence → refresh → tests
```

**Never:** frontend-only · fake buttons · hardcoded fake data · disconnected APIs · unused tables · “complete” because UI looks finished · **building on a broken prior slice** · **hiding errors so the UI looks functional**.

---

## Dependency repair (stop and fix first)

If a **dependency slice is incomplete or broken**, **STOP** the current task. **Repair the dependency end-to-end** before adding new functionality.

Never stack new features on broken auth, migrations, RLS, persistence, or APIs.

**Never hide errors** to make screens look working — surface failures honestly; fix root cause or mark **BLOCKED**.

---

## Supabase

- Auth · PostgreSQL · **RLS** · Storage · migrations in `docs/migrations-to-apply/`  
- Every persistent feature = schema + migration + RLS  
- Service role **server-only** · never bypass RLS · never expose secrets to browser  

---

## Vertical slices

One complete slice at a time: inspect → report → implement → test → adversarial audit → repair → status update → next slice.

---

## Definition of done

Fresh account works · refresh persists · auth + authz · all UI states · invalid/duplicate/network/unauthorized handled · FE/BE contracts match · critical tests · typecheck · lint · build · no fake prod behavior.

Status: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `IMPLEMENTED` · `TESTED` · `PRODUCTION READY`

---

## Bug policy

Discover → reproduce → **root cause** → fix → regression test when practical. **Never hide errors** to make the UI appear functional. Never ignore or claim zero bugs.

If a **prior slice is broken**, **stop** and repair it before continuing — do not build on broken foundations.

---

## No fake completion

**NOT IMPLEMENTED** or **BLOCKED** with explicit dependency — never “Saved” / “Published” / “Paid” without real backend proof.

---

## Builder · Search · Opportunity (product law)

- Builder: next-gen African commerce + website **OS** — exceeds incumbents where it matters; structured schema; Kebu Business workspaces — `docs/product/KEBU-BUILDER-NEXT-GEN.md`  
- Search: crawl → index → rank; AI on top with citations — **never chat-as-search** — `docs/product/KEBU-SEARCH.md`  
- Opportunity OS (explore) ≠ Kebu Opportunity OS (for-you) — never merge  

---

## Documentation (keep in sync)

`docs/ARCHITECTURE.md` · `docs/DATABASE.md` · `docs/API.md` · `docs/SECURITY.md` · `docs/TESTING.md` · `docs/ROADMAP.md` · **`docs/IMPLEMENTATION_STATUS.md`**

---

## Most important rule

**One working vertical slice beats twenty unfinished screens.**

Current status: `docs/IMPLEMENTATION_STATUS.md`
