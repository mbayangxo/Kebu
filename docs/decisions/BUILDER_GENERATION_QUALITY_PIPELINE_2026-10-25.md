# Builder generation, inspection and repair pipeline

Status: SHARED BUILDER/STUDIO SOURCE IMPLEMENTATION; hosted release not performed.
Implementation and verification: `docs/handoffs/CLAUDE_SHARED_GENERATION_REPAIR_2026-10-26.md` and `docs/audits/KEBU_SHARED_GENERATION_REPAIR_2026-10-26.md`. The original architecture contract remains below; shipped native limits and actual check coverage are explicit in the handoff.
Date: 2026-10-25.
User approval: extend Kebu's existing Builder with a provider-independent brief → editable website → inspection → bounded repair → saved preview workflow.
This document does not supersede product law, existing pricing, permission boundaries or the completion register.

## Product outcome

A customer supplies a brief and owned assets, approves a visual direction, receives an editable responsive website, sees the result of automated checks, and can request a revision or continue in the visual editor. Every result is a native Kebu document. Publishing/export uses existing permission and release gates.

Do not add a second editor or a separate arbitrary-code generator as the default.
Do not prescribe Higgsfield, a particular LLM, a new framework, a $100 price or a hosting-plan upgrade.
Generated media is optional. Uploaded/owned media is sufficient for the first complete journey.

## Established integration points

- lib/yande/gateway.ts: existing shared structured/chat model boundary and usage recording. Currently provider-specific internally; retain existing caller contracts while introducing an adapter underneath.
- lib/create/experience-model-gateway.ts: existing bounded structured proposal caller. Retain schema validation, submit_proposal semantics, owner attribution, cancellation and input bounds.
- Native document operations and operation journal: generation and repair must use these validated mutations, with the same authorization and conflict rules as manual edits.
- Existing Builder generation/improvement routes, quota reservations, asset provenance checks, versions and publishing: audit/reuse these before adding any parallel infrastructure.
- Existing platform worker/jobs, leases, retries and idempotency: inventory capabilities before selecting a durable execution mechanism. Adopt compatible existing primitives where sufficient; choose a new runtime only for a documented gap.
- Existing browser acceptance and hosted RLS checks: extend these for the new journey; fixture results never substitute for managed hosted acceptance.

## First vertical slice

1. Save a versioned brief for an authorized project.
2. Produce a structured design direction and ask the customer to approve it.
3. Enqueue one durable job against the approved brief revision and an immutable document base revision.
4. Generate a native document candidate using existing Yande proposals and validated operations.
5. Render the candidate in a private preview.
6. Run deterministic checks and optional separately reported visual review.
7. Attempt only authorized bounded repairs.
8. Save a candidate version and report its actual quality status.
9. Let the customer approve the candidate or continue editing it.
10. Publish/export only after the existing gates and authorization pass.

No AI or inspection request may write directly to the live published version.
An unchecked draft remains available for manual editing, clearly marked unchecked.

## Data and authorization contract

Proposed logical records; inspect existing tables/RPCs and reuse equivalents before creating migrations:

- Brief revision: project, author, purpose, audience, pages, brand tokens, reference attachments, owned asset references, motion preferences, language and accessibility preferences. Business facts remain user-supplied.
- Direction revision: brief revision, layout/typography/palette/media/motion proposal, approval actor/time and immutable hash.
- Generation job: project/tenant, requested_by, approved direction, base document revision, candidate revision, state, cancellation flag, retry counters, cost ceiling, reserved/settled usage and timestamps.
- Job stage attempt: job, stage, attempt, lease token/expiry, input fingerprint, output artifact references, provider request identifier and safe error code.
- Quality report: candidate revision, renderer/checker versions, viewport/route/state, executed/not-run checks, evidence references, severity and issue object IDs.
- Repair proposal: exact candidate base, issue IDs, bounded operations, changed object IDs, measured result and approval/auto-apply authority.
- Artifact manifest: version, owned asset IDs, content hashes, dimensions/formats, provenance/license metadata, integrity checks and private storage paths.

All reads/writes are scoped to the authorized project and tenant. Recheck permissions when the worker executes, when a candidate is applied and before publishing. A queued request never grants lasting authority after membership revocation.
Job control/status endpoints must not expose other tenants' briefs, artifacts, errors or provider credentials.
Raw provider payloads and private previews are not public logs.

## Durable job semantics

Stages: queued → planning → awaiting_direction_approval → generating → rendering → checking → repairing (bounded) → checking → ready_for_review.
The first slice may create its job after approval, entering queued → generating.
Terminal results include succeeded, failed and cancelled; stale-base work becomes needs_rebase and cannot silently overwrite the current document.
ready_for_review is a workflow state, not proof of a passing quality report.

- Jobs reference immutable inputs. A changed brief/direction creates a new revision.
- Creation uses a client request idempotency key scoped to project, actor and input revision.
- Workers claim leases with fencing tokens. An expired worker cannot commit results after another worker takes over.
- Provider submissions use an idempotency mechanism where available. After an ambiguous timeout, reconcile the provider request before submitting again; do not promise exactly-once external calls.
- Stage outputs are durable before the next stage is acknowledged. Restart resumes completed stages without regenerating accepted artifacts.
- Cancellation blocks future stages and promotion. Reconcile in-flight provider results and actual incurred cost honestly.
- Reserve budget before chargeable work; settle by recorded usage. Cancellation, failure and retries must not duplicate quota debits.
- Retry only transient errors, with bounded backoff; validation/authorization errors are terminal.
- Persist progress. Do not keep a web request open for the full pipeline.

## Provider-independent capabilities

Keep text/structured generation, image generation, video generation and visual inspection as distinct capabilities.
Adapters declare capability support, configured models, limits, pricing configuration, timeout/cancellation behavior, synchronous/asynchronous operation, webhook verification and idempotency support.
Use an opaque job/request identifier for asynchronous media. Validate webhook authenticity and bind results to the correct tenant/job.

Fallback is allowed only to a configured compatible capability within the approved data and cost policy.
A failed provider produces a visible failed/degraded stage; no success-shaped placeholder output.
Missing media credentials leave owned/uploaded assets usable. No generation provider is required to open or edit a website.
Copy accepted generated assets to durable storage before attaching them to a document; validate type/size and retain provenance. Do not depend on temporary provider URLs.
Select provider/model IDs from verified available capabilities at implementation time; no hardcoded branding in the Builder flow.

## Quality and repair contract

A report cannot be PASS if mandatory checks were not run.
Separate deterministic failures, visual concerns and unavailable checks.
Vision review cannot overrule an authorization failure, broken navigation/form or build failure.
Every issue identifies candidate revision, page, object where applicable, viewport, interaction/animation state, observed evidence and check version.

Required checks for the supported first-slice scope:
- Valid native schema/operations; permitted asset references; no invented business facts.
- Successful render; no uncaught page errors; missing assets and failed required requests surfaced.
- Phone, tablet and desktop layouts, including narrower in-between widths.
- Unexpected horizontal overflow, clipped text and unusable interactive targets. Intentional layering/overlap must not be treated as an automatic defect.
- Navigation, menus, keyboard access and configured form success/failure behavior.
- Motion at defined states plus reduced-motion behavior; static screenshot stability is a separate check.
- Page weight and performance against documented budgets; low-bandwidth media alternatives.
- Visual review of hierarchy, spacing and adherence to the approved direction.

Repair defaults: at most two automatic repair attempts per candidate, additionally constrained by the job's explicit time/cost budget.
Auto-repair is limited to allowlisted low-risk presentation changes. Copy/business claims, navigation destinations, forms, commerce, data access and external side effects require reviewed proposals.
Repairs use validated native operations and preserve authored content, IDs, media provenance and unrelated manual work.
Apply with compare-and-swap on the document revision. If the customer edits while work is in progress, mark needs_rebase; recompute/preview against the newer revision instead of overwriting it.
Re-run affected checks and required regression checks. Preserve the last passing candidate and a complete revision trail.
Exhausted repairs become needs_attention with specific issues; never loop indefinitely or silently publish a failing candidate.

## Delivery and product states

Customer language: Brief, Choose direction, Building, Checking, Needs your input, Ready to review.
Show actionable failures and retained work. Never label optional/unconfigured services as completed.
Provide a preview and a comprehensible change summary; advanced evidence can be expanded.
Support explicit candidate approval, rollback and manual continuation.
Static exports include bundled owned assets and a manifest. Dynamic exports must declare backend/service dependencies, environment variable names (never secrets), required configuration and supported deployment targets.
External edits are not synchronized automatically unless a later explicit sync feature is implemented.

## Implementation sequence and acceptance

A. Complete schema reconciliation and hosted save/permission foundations already in progress.
B. Audit existing worker and quota primitives; add the minimum durable job + status + cancellation path and provider adapter boundary.
C. Connect one approved brief/direction to native candidate generation and real private preview.
D. Attach deterministic checks, reports and the bounded repair loop.
E. Validate candidate review, visual/manual edits, revision conflicts and existing publish/export handoff.
F. Expand media providers, motion coverage and supported site types after this journey passes.

Required executed evidence:
- Restart during a stage resumes without losing accepted output.
- Duplicate submissions produce one logical job and one quota reservation.
- Ambiguous provider timeout is reconciled; cost/retry boundaries hold.
- Two independent users cannot read/control each other's job or artifacts.
- Revoked membership blocks later worker commits and promotion.
- Cancellation prevents promotion and accounts for in-flight usage.
- Malformed proposals/assets are rejected with retained user work.
- Manual edits during generation/repair survive; stale proposals cannot apply.
- Failed checks trigger only bounded repairs; exhausted repairs remain visible.
- Owned-assets-only website works with media providers unconfigured.
- Provider adapter contract tests plus a separately recorded real configured-provider journey.
- Desktop/tablet/phone preview, save/reopen and actual supported export/publish.
- Existing Builder and Studio regression gates remain green.

## Recovery and current status

This contract was saved through the connected GitHub app because the local execution environment returned CreateProcess / exec-server unavailable. No application code, schema, provider calls, paid infrastructure or production publishing changed while recording it. No runtime tests were executed for this document.

Do not lose the separate migration checkpoint: workspace_item_identity_guard was applied and its trigger verified in production in the preceding session. workspace_item_visibility had expired-request-state retries and the last call was aborted, so its current state must be read from Supabase before any retry. Never infer success or failure from the interrupted call.
Library reconciliation must preserve production's existing inherited folder-sharing policies; the canonical newer policy set cannot be replayed blindly.
PR19 is the separate Inspector regression recovery checkpoint; verify its integration/check status rather than treating it as already merged.

This is an implementation contract, not a claim that generation/audit/repair is shipped.
