# Kebu — Definition of Done

A feature is **NOT DONE** until every **applicable** item below is satisfied.

**Authoritative context:** `docs/product/PRODUCT_RULES.md` · **Quality gate:** `docs/product/QUALITY_GATE.md`

Label honestly: **NOT IMPLEMENTED** · **BLOCKED** · **IN PROGRESS** — never fake completion.

---

## Checklist

### User interface

- [ ] UI implemented per approved screen spec  
- [ ] Responsive (mobile + desktop compositions where applicable)  
- [ ] Loading state  
- [ ] Empty state  
- [ ] Error state  
- [ ] Success state  
- [ ] Validation (client + server where applicable)  
- [ ] Accessibility basics (labels, focus, keyboard where applicable)  
- [ ] Uses design system tokens / shared components where they exist  
- [ ] **Visual QA completed** (inspect running app — not code-only review)  
- [ ] **No MVP-looking placeholder UI** presented as finished  
- [ ] **No dead buttons** or fake controls  

### Security & identity

- [ ] Authentication enforced where required  
- [ ] Authorization / RBAC enforced server-side  
- [ ] Cross-user access denied (tested)  
- [ ] RLS policies correct and tested  
- [ ] No secrets in browser · service role server-only  

### Data & backend

- [ ] Database schema + migration in `docs/migrations-to-apply/`  
- [ ] Migration applied to target Supabase (when judging DB features)  
- [ ] Backend logic complete (API / server action)  
- [ ] Persistence verified **after refresh**  
- [ ] Invalid / duplicate / network failure handled  
- [ ] Idempotency where duplicates are costly  

### AI features (when applicable)

- [ ] Prompt validation  
- [ ] Loading / progress UI  
- [ ] Real provider call (metered, server-side)  
- [ ] Result stored (asset/project/history as spec requires)  
- [ ] Failure surfaced honestly — not fake success  

### Engineering quality

- [ ] TypeScript — no errors  
- [ ] Lint — no new violations  
- [ ] Production build passes  
- [ ] No console errors on happy path  
- [ ] No unhandled promise rejections on tested paths  
- [ ] No duplicate logic where shared abstraction exists  
- [ ] Shared component changes verified on **all dependent screens**  

### Testing

- [ ] Unit tests for critical logic (where practical)  
- [ ] Integration tests for API + DB paths (where practical)  
- [ ] E2E test for critical user journey (where practical)  
- [ ] **Regression test** added for fixed bugs  
- [ ] Playwright screenshot baseline updated (when visual regression enabled for that surface)  

### Analytics & ops (when applicable)

- [ ] Real analytics events — not fake dashboards  
- [ ] Audit log for sensitive actions (where product requires)  

### Documentation

- [ ] `docs/IMPLEMENTATION_STATUS.md` updated  
- [ ] Screen spec / decision record updated if behavior changed  

---

## Minimum bar summary

**Nothing is “built”** until UI, business logic, database, authentication, permissions, error states, and backend are **connected and tested end-to-end**.

```
UI + all states + auth + authz + Supabase + migration + RLS + persist on refresh
+ validation + CI gates + visual QA + no fake functionality = DONE
```

**CI gates** (`docs/CI_PIPELINE.md`): TypeScript → Lint → Unit → Integration → DB → RLS → E2E → Build. **Any failure → deployment stops.**

Missing any **applicable** item = **INCOMPLETE**.

---

## Anti-patterns (automatic fail)

- Button renders but does nothing / “Coming soon” without NOT IMPLEMENTED label  
- Hardcoded data where persistence is required  
- UI-only save that disappears on refresh  
- Hidden/suppressed errors for a functional-looking screen  
- New screen with one-off Button/Card instead of shared primitives (when library exists)  
- Fixing mobile breaks desktop (unchecked shared component change)  
