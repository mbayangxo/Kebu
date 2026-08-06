# Kebu — Master Constitution (human reference)

Full product law for Kebu (African AI creation, commerce, hosting, learning, opportunity platform).

Agent-enforced copies live in `.cursor/rules/`:

- `kebu-constitution.mdc` — mission, DoD, phases, prohibitions
- `kebu-vertical-slice.mdc` / `kebu-single-slice.mdc` — one slice at a time
- `kebu-id.mdc` — Kebu ID = business identity (separate from personal eligibility)
- `kebu-ka-score.mdc` — KA Score = business readiness/performance score (not personal, not initially official credit)
- `kebu-security-data.mdc` — authz, RLS, structured sites, AI (when present)
- `kebu-commerce-k21.mdc` — commerce + optional K21 (when present)
- `kebu-business-os.mdc` — opportunity trust labels (when present)

## Naming

| Concept | Meaning |
|--------|---------|
| **Kebu ID** | Which business this is — permanent digital identity |
| **KA Score** | How that business is developing and performing |
| Personal eligibility | Whether a *person* may access restricted services — not Kebu ID, not KA Score |

KA Score is not a popularity score and is not initially a regulated bank credit score.

## Build order

1. Kebu ID and business membership/roles  
2. Real activity (sites, stores, orders, ops)  
3. Analytics  
4. **Then** KA Score (Business Readiness first slice — server-calculated, explainable, versioned)  

A hard-coded score card is not a KA Score implementation. Do not start KA Score until that slice is assigned.

## First production journey

Account → profile → eligibility → Kebu ID → website/store → template/AI → visual edit → products → publish → orders → analytics → optional K21 → KA Score when data exists.

## Phase 0 / slice status

- Create Mode slice 1 and Kebu ID slice 1 exist on `main`.  
- Apply pending Supabase migrations before treating live create/business flows as verified.  
- Do not skip to KA Score or later phases until foundation tickets are closed.

Detail for KA Score: `.cursor/rules/kebu-ka-score.mdc`  
Detail for Kebu ID: `.cursor/rules/kebu-id.mdc` and `docs/KEBU-ID-SLICE-1.md`
