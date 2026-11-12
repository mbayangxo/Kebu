# Kebu — production slice engineering contract

This is the Definition of Done for Kebu product work. It applies to new features, Galaxy reconstruction and repairs to existing products.

## Core rule

**Build complete vertical slices. Do not build finished-looking shells.**

A production slice is:

**product intent → UI → interactions → server/API → Supabase data model/RPC/storage → authentication/RLS/permissions → background work where required → validation and failure recovery → loading/empty/error/offline states → responsive behavior → accessibility → security → tests → CI/build verification → deployment verification**

Not every slice needs every layer, but every applicable layer must be real and verified.

## Engineering standard

Work as if Kebu is being built and reviewed by a senior multidisciplinary product engineering team expected to meet the quality bar of a major commerce/platform company.

That means:

- Prefer clear, cohesive modules with explicit ownership over giant files and tangled cross-feature helpers.
- Reuse intentional primitives; do not create parallel versions of the same system.
- Keep business rules server-side and database invariants in the database when concurrency or integrity requires them.
- Use typed contracts between boundaries. Avoid importing application route modules merely to share types.
- Keep operational data real. No hardcoded users, metrics, orders, opportunities, messages or activity.
- Preserve working behavior unless the new architecture deliberately replaces it and tests cover the transition.
- Treat performance as a product requirement: avoid unnecessary client work, waterfalls, oversized payloads and uncontrolled queries.
- Design for low-bandwidth/offline African use cases where the feature can reasonably support them.
- Keep migrations reviewable, reversible/recoverable where practical, and safe to validate outside production first.
- Document important invariants and non-obvious architectural decisions near the owning system.

## Bugs are blockers, not scenery

Never knowingly build over a bug.

When implementation exposes a TypeScript error, broken API, bad schema assumption, missing RLS rule, permission leak, race condition, stale route, invalid state transition, dead interaction, failing test, accessibility regression or frontend/backend disconnect:

1. reproduce or establish the failure;
2. identify the underlying cause rather than masking the symptom;
3. fix it at the correct layer;
4. add or improve regression coverage when practical;
5. rerun the affected gates;
6. record any genuinely unresolved risk explicitly.

Do not silence errors, weaken type checking, skip tests, add permissive authorization, catch-and-ignore meaningful failures, or return fake success to make a gate green.

## Supabase and data integrity

Supabase is authoritative for persisted Kebu application state unless a documented subsystem has another source of truth.

- Every user-owned or restricted table requires an explicit authorization model and effective RLS review.
- SECURITY DEFINER functions/RPCs require deliberate search_path, privilege and EXECUTE review.
- Service-role access stays server-side.
- Sensitive mutations must be authorized on the server even when the UI hides controls.
- Concurrency-sensitive inventory, money, quotas, reservations, counters and state transitions must be atomic/idempotent as appropriate.
- Webhooks must verify provider authenticity and be safe under duplicate/reordered delivery.
- Storage buckets and object policies follow the same least-privilege model as tables.
- Schema assumptions must be verified against migrations/effective schema before production deployment.
- Never test a risky financial/data migration first against production.

## Security while building

Security is part of implementation, not a cleanup phase.

For every slice, threat-model the boundaries that matter: authentication, authorization, tenant isolation, input validation, output encoding, CSRF/origin behavior, rate/abuse limiting, secrets, file uploads, external URLs, payment state, webhooks, data exposure and destructive actions.

Prefer least privilege, fail closed for security configuration, safe defaults and explicit allowlists. Do not expose internal exception details to public clients. Do not rely on client validation for security.

High-risk changes require targeted security tests before the slice is considered complete.

## Product and state completeness

Every interactive control must either work or not exist. Do not ship decorative buttons.

Implement applicable states deliberately:

- loading / skeleton
- empty
- success / confirmation
- recoverable error
- offline / low-data
- permission denied / unavailable
- destructive confirmation
- optimistic/pending state and rollback where used
- expired/stale/conflict state where relevant

Real empty states are preferable to fake sample content.

## Responsive and accessible by construction

Do not postpone mobile and accessibility until after desktop is “done.”

Keyboard navigation, focus visibility, semantic controls, labels, contrast, reduced-motion considerations and screen-reader behavior are part of the component contract. Mobile may transform the composition rather than squeezing desktop panels into a narrow viewport.

## Required verification

Before calling a slice complete:

1. TypeScript passes.
2. Lint passes.
3. Relevant unit/integration tests pass.
4. Targeted security/data-integrity tests pass where applicable.
5. Production build passes.
6. Critical E2E flows pass when the environment supports them; if CI skips E2E, that is an unresolved verification item, not a pass.
7. Supabase migrations/RLS/RPCs used by the slice are verified in a non-production environment before production use.
8. Desktop and mobile behavior are reviewed.
9. Loading/empty/error/offline/permission states are reviewed where applicable.
10. Deployment health is checked when a deployment is part of the slice.

A queued or pending CI/deployment is not green. A skipped required gate is not green. “Files were committed” is not “done.”

## Branch discipline

Current reconstruction work stays on:

`work/kebu-security-remediation`

Do not create extra working branches for this effort unless explicitly requested. Do not merge or push to `main` without explicit user approval.

## Existing products

Galaxy is a reconstruction, not permission to discard working systems. For an existing capability such as Studio or Builder, audit each subsystem as:

- **keep** — sound and already meets the new contract;
- **repair** — architecture is useful but contains bugs/debt;
- **redesign** — behavior works but UX/product design must change;
- **finish** — partially implemented end-to-end path;
- **retire** — redundant/unsafe path with a verified replacement.

Removal requires understanding callers, data, permissions and migration impact first.

## Completion report

When a slice is actually complete, report:

- user-visible behavior delivered;
- backend/Supabase/security work delivered;
- bugs discovered and fixed;
- tests/gates run and exact outcomes;
- deployment status;
- commit SHA;
- unresolved risks or skipped verification, if any.

Never use “done,” “production-ready,” “secure,” or “fully verified” while a known required gate is failing, pending or skipped.
