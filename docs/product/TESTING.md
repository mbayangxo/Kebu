# Kebu — Testing

**Definition of Done:** `docs/product/DEFINITION_OF_DONE.md`  
**Bug protocol:** `docs/product/BUG_PROTOCOL.md`

---

## Test pyramid (Kebu)

| Layer | When |
|-------|------|
| **Unit** | Pure functions, validators, pricing, schema transforms |
| **Integration** | API routes + Supabase (test DB or mocked client with real contracts) |
| **E2E** | Critical user journeys (auth, publish, checkout, team invite, …) |
| **Visual regression** | Important stable screens (Playwright screenshots) |

Do not mock away the behavior under test for the slice being verified.

---

## Commands (repo)

```bash
npm run ci            # full gate chain — run before claiming done
npm run typecheck
npm run lint
npm test              # unit (+ integration/db/rls by filename)
npm run test:e2e      # Playwright (when configured)
npm run build
```

Check `package.json` for current scripts before assuming.

---

## Visual regression (Playwright — recommended for serious UI)

**Goal:** Catch unintended UI destruction — do not trust “looks good” from code review alone.

### Baseline screens (expand per product)

When Playwright is set up for a surface:

```
/home
/dashboard
/create/[id]          # builder
/my-sites/[id]        # business hub
/shop/[projectId]     # merchant ops
/pricing
```

### Workflow

1. Capture **approved** screenshot baselines per screen + viewport (desktop + mobile)  
2. On UI change: run compare → review diff  
3. Intentional change → update baseline with review  
4. Unintentional regression → fix before merge  

### Cursor instruction after UI slice

```
Add or update Playwright screenshot test for [screen].
Compare against baseline. Fix unintended diffs.
```

**Status:** Playwright visual regression = **NOT STARTED** repo-wide until assigned slice installs config + first baselines.

---

## Inspect-as-user (mandatory even without Playwright)

Quality gate requires opening the **running app** and comparing to spec — `docs/product/QUALITY_GATE.md`.

---

## Regression on bug fix

Every fixed P1/P2 bug should add a test when practical — prevents recurrence.

---

## Test data

Development fixtures must be **labeled** — never presented as production analytics or fake user content without disclosure.

See: `kebu-no-fake-functionality.mdc`
