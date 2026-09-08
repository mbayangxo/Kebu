# Kebu — Quality Gate

**Do not declare a task complete** until this gate passes.

Run after **every feature / vertical slice** — before updating status to IMPLEMENTED or TESTED.

**Related:** `docs/product/DEFINITION_OF_DONE.md` · `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md`

---

## 1. Visual audit

Inspect the **running application** — do not rely on source code alone.

| Check | Pass? |
|-------|-------|
| Spacing feels intentional (design system scale) | |
| Typography consistent (roles, not random sizes) | |
| Controls aligned · hierarchy clear | |
| Hover / focus / pressed / disabled states complete | |
| Mobile layout works (not broken shrink) | |
| Interactions obvious · feedback present | |
| No awkward empty dead zones | |
| Components consistent (not 5 button styles) | |
| Nothing looks like placeholder / AI-generic UI | |
| Matches approved screen spec + reference intent | |

**Loop:** List discrepancies → fix → **reinspect** until pass.

---

## 2. Functional audit

Trace **user action → UI → API → Supabase → UI → refresh**.

| Check | Pass? |
|-------|-------|
| Every visible control does what it claims | |
| State persists after refresh | |
| Supabase contains expected rows/files | |
| Failure paths show honest errors (not silent fail) | |
| Unauthenticated user denied appropriately | |
| Wrong user denied appropriately | |
| Invalid input rejected with clear message | |
| Empty state useful (next action clear) | |
| Loading state during async work | |
| Success state confirms outcome | |
| **No fake search / upload / payment / AI / stats** | |

---

## 3. Engineering audit

| Check | Pass? |
|-------|-------|
| `tsc` / typecheck clean | |
| Lint clean (or documented exceptions) | |
| Production build passes | |
| No console errors on tested paths | |
| No swallowed exceptions / empty catch hiding failures | |
| RLS verified (not bypassed in prod paths) | |
| No security regressions (authz, injection, XSS basics) | |
| No race / double-submit on critical actions | |
| Shared components: dependent screens re-verified | |

---

## 4. Inspect-as-user loop (mandatory)

```
1. Open running app as a user would
2. Compare rendered result to approved design / screen spec
3. List EVERY discrepancy (visual + functional)
4. Fix all discrepancies
5. Reinspect
6. Repeat until gate passes
```

Do **not** move to the next slice with known discrepancies.

---

## 5. Regression

- Bug fixes → add regression test  
- Important screens → Playwright screenshot baseline when enabled (`docs/product/TESTING.md`)  
- Before/after review on shared component changes  

---

## Sign-off

Only after all three audits + inspect loop:

**DONE** — update `docs/IMPLEMENTATION_STATUS.md` with evidence (tests run, manual steps).
