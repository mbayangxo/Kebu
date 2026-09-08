# Kebu — Bug Protocol

**Standard:** discover → reproduce → root cause → fix → regression test → verify.

**Never hide errors** to make the UI appear functional.

**Related:** `docs/product/QUALITY_GATE.md` · `.cursor/rules/kebu-master-engineering.mdc`

---

## 1. Discover

Sources: manual QA · quality gate · user report · CI · Playwright · adversarial audit · console/network inspection.

Do not ignore or defer without **BLOCKED** label and reason.

---

## 2. Reproduce

Minimal steps · environment (local/staging/prod) · user role · browser/device.

If not reproducible, document hypothesis and monitoring — do not claim fixed.

---

## 3. Root cause

Trace full chain:

```
UI → state → API → auth → logic → Supabase → RLS → DB → response → UI
```

Fix **root cause** — not symptoms. No silent catch blocks that swallow failures.

---

## 4. Fix

Minimal correct diff · match existing conventions · shared components → verify **all dependents** (`kebu-do-not-degrade.mdc`).

---

## 5. Regression test

Add test when practical:

- Unit — pure logic  
- Integration — API + DB  
- E2E — critical journey  
- Playwright screenshot — visual regression (when baselined)  

---

## 6. Verify

- Happy path + failure path  
- Refresh persistence  
- Cross-user isolation  
- **`npm run ci`** — full gate chain (`docs/CI_PIPELINE.md`)  
- Update `docs/IMPLEMENTATION_STATUS.md` if slice status affected  

---

## AI-assisted triage (controlled pipeline)

**Forbidden:** AI or cron **auto-merging to production** without human review.

When Bug Sentinel or CI creates **`BUG-NNNN`**:

1. **Ingest** — logs, stack trace, failing test, affected route  
2. **AI analysis** (proposal only):  
   - Root cause hypothesis  
   - Affected files  
   - Proposed fix  
   - Tests to add  
   - Risk assessment (RLS, payments, shared components)  
3. **Human review** — accept, reject, or edit proposal  
4. **Branch** → implement fix  
5. **PR** → full CI gate chain  
6. **Review** → merge → staging → E2E → production  

Engineering Health: `docs/ENGINEERING_HEALTH.md`

---

## Severity (triage)

| Level | Examples |
|-------|----------|
| **P0** | Data leak · payment wrong · auth bypass · data loss |
| **P1** | Core journey broken · persist fails · RLS hole |
| **P2** | Wrong empty/error state · mobile broken · misleading fake success |
| **P3** | Visual polish · copy · non-blocking edge case |

P0/P1 block slice sign-off.

---

## Dependency rule

If bug reveals **broken prior slice**, **STOP** new feature work. Repair dependency end-to-end first.
