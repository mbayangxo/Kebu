# Kebu Product Depth & Quality Program

Status: governing engineering specification
Branch introduced: `work/kebu-ecosystem-ux`

## Purpose

Kebu is not considered complete because a route, component, API, table, or happy-path demo exists. A capability is complete only when a real user can finish the promised job end-to-end, data persists correctly, permissions hold, failures recover honestly, offline behavior follows its contract, and automated evidence proves the critical journey.

This program exists to prevent empty shells, hard-coded production behavior, dead controls, silent failures, incompatible schema changes, and new features being built over known defects.

## Non-negotiable engineering rules

1. **Complete vertical slices.** UI -> domain command -> API/service -> authorization/RLS -> canonical persistence -> return state -> errors/retries -> observability -> automated journey evidence.
2. **Fix before expand.** A newly discovered defect in a dependency is fixed or explicitly blocks the dependent capability. Do not build over it.
3. **No fake production success.** Demo/fixture data is restricted to explicit test/demo environments. Production failures render honest failure/empty/retry states; they never silently substitute believable fake data.
4. **No dead controls.** Every visible interactive control must perform its advertised action, be intentionally disabled with an explanation, or not render.
5. **Supabase is canonical persistence where appropriate, not the interaction loop.** Interactive editors use local-first state/operation logs and synchronize to canonical backend state. Never require a network round trip for each drag/keystroke.
6. **One domain command path.** UI and Yande invoke the same tested engine commands. AI may orchestrate engines; it must not create a parallel implementation.
7. **Backward compatibility is a release requirement.** Durable documents/orders/sites/mail models are versioned. Old fixtures must continue to open/read correctly or migrate deterministically.
8. **Security is part of the slice.** Tenant isolation, RLS/authorization, input validation, auditability, secrets handling, abuse/rate limits, and safe file processing are not post-launch tasks.
9. **Offline is explicit.** Each capability declares full, partial, read-only, queued, or unsupported offline behavior and tests reconnect/conflict behavior.
10. **Evidence over labels.** "Working", "done", "ready", and "mature" require linked automated/manual evidence.

## Maturity states

- Missing: promised capability is absent.
- Foundation: primitives exist but no complete user job.
- Partial: some user paths work; known gaps prevent dependable completion.
- Functional: happy path works end-to-end with real persistence.
- Reliable: failure, retry, permissions, compatibility, and offline contract are tested.
- Release-ready: all mandatory quality/security/performance/accessibility gates pass.
- Mature: sustained production evidence + user task success + regression protection. Code existence alone cannot grant this state.

## Repository contracts

Each major product should own:

```
products/<product>/
  product.manifest.yaml
  capabilities.yaml
  critical-journeys.yaml
  quality-gates.yaml
  security-gates.yaml
  performance-budgets.yaml
  offline-contract.yaml
  compatibility-contract.yaml
```

Do not create duplicate product architecture merely to satisfy this directory shape. Manifests should point to existing implementation packages, tests, APIs, migrations, and ownership.

## Capability ledger

Maintain a single generated/validated ledger with:
Product | Capability | Maturity | User jobs | Dependencies | Persistence | RLS/Auth | Offline | Compatibility | Tests | Performance | Accessibility | Known defects | User feedback | Reference capabilities

Reference products are expectation/radar inputs, never cloning requirements.

## Mandatory release gates

At minimum, affected critical paths run:
TypeScript -> lint -> unit -> integration -> database/migration -> RLS/tenant isolation -> E2E journey -> accessibility -> security/dependency/secret checks -> performance budget -> offline/sync where declared -> compatibility fixtures -> visual regression where relevant.

A failed mandatory gate blocks release readiness. Never weaken a test to make CI green unless the product contract intentionally changed and that change is reviewed.

## Product engines

### Studio
Build/evolve shared engines, not disconnected feature shells:
- Document Engine: scenes/pages, objects, groups, layers, transforms, constraints, z-order, history, versioning.
- Media Engine: resumable upload, codecs, metadata, proxies, thumbnails, waveforms, storage/cache lifecycle.
- Timeline Engine: multi-track video/audio/text/effects, trim/split/ripple, snapping, transitions, keyframes, speed, gain/fades, deterministic seeking.
- Render Engine: consistent editor/preview/export semantics, background jobs, progress, cancellation, retry, deterministic output.
- Caption Engine: speech-to-text integration, timestamps, editable transcript, timeline objects, styling, SRT/VTT and burned/selectable output.
- Photo Engine: non-destructive crop/resize/rotate/masks/adjustments/filters/background operations/compositing.
- Brand Engine: logos, fonts, palettes, reusable components, guidelines, permissions and brand-aware generation.
- Asset Engine: uploads, Kebu/marketplace assets, licensing metadata, search, collections/favorites, deduplication.
- Collaboration Engine: presence, comments, permissions, versions, concurrent-edit/conflict strategy.
- Import/Export Engine: format parsing/normalization, validation, graceful unsupported-property handling, export presets.
- Publishing Engine: publish/share to Kebu destinations without reconstructing the design.
- Offline/Sync Engine: durable local cache, operation log, background sync, deterministic conflict/recovery behavior.

### Commerce
One canonical kernel:
Catalog -> Inventory -> Cart -> Checkout -> Payment -> Order -> Fulfillment -> Return/Refund -> Customer -> Ledger

Deepen through variants/SKUs/bundles/collections; inventory reservations and multi-location history; idempotent checkout; order state machine; payment/webhook reconciliation; partial fulfillment; returns/exchanges; customer/consent history; markets/localization; trustworthy analytics; stable events/webhooks/extensions.

Critical invariant: an order event must not create divergent copies across Commerce, Inventory, Money, Analytics, Mail, Business, and Notifications. Shared events/IDs and reconciliation are required.

### Work / future Slack + Notion depth
Do not build clone shells now. Build reusable primitives:
- Document/block/structured-object engine + revisions/mentions/comments.
- Collaboration/presence/permission engine.
- Communication engine for DMs, Rooms/channels, threads, reactions, attachments.
- Work Graph linking person/team/business/room/project/task/document/file/event.
- Permission-aware search index.
- Notification engine for mentions, assignments, replies and changes.
Later Work experiences should be views over these shared primitives.

## Cross-product flows

Kebu products must compose. Example commerce journey:
Studio asset -> Site storefront -> Shop product/variant -> inventory -> checkout -> payment -> order -> merchant/customer notifications -> Money/ledger -> Analytics -> fulfillment -> return/refund -> reconciliation.

Cross-product journeys belong in the Quality System and must use stable identifiers/events rather than UI-to-UI coupling.

## Feedback / Product Intelligence

Add a universal authenticated entry point:
- Report a problem
- Suggest an improvement
- Give feedback

After meaningful completed jobs, optionally ask: "Did Kebu help you finish what you came here to do?" Yes / Not quite, followed by a reason when useful.

With explicit consent, reports may attach non-sensitive diagnostics: product/route, build version, device/browser class, network state, feature flags, safe recent errors, trace ID, screenshot/screen recording. Never attach passwords, tokens, private document contents, sensitive form values, or raw secrets.

Persist to Supabase with RLS and expose in Kebu Admin Product Intelligence. Support duplicate grouping and lifecycle: New -> Reproduced -> Planned -> Fixing -> Verification -> Released. User feedback can downgrade/reopen a capability's quality status.

## No-fake/dead-control enforcement

Add static and runtime checks for production paths, including suspicious TODO/FIXME markers, fixture/demo imports, random/fake metrics, placeholder identities, hard-coded tenant/user/business IDs, `href="#"`, empty handlers, silent catch blocks, fake fallback after API failure, and unimplemented API responses.

Allow explicit test/demo fixtures only behind clear environment boundaries.

## Compatibility policy

Durable formats have explicit versions, migration paths and representative historical fixtures. CI must open/read old Studio documents, Sites documents, Commerce orders, and other durable records with current code. Financial/order history that should be immutable must not be rewritten merely to match a new UI model.

## Resend / Mail closure

Do not rebuild existing Mail transport if Resend support already exists. Audit the current transport and close the real-world loop using secrets/environment configuration (never repository literals):
Kebu -> external inbox; external inbox -> Kebu; reply/threading; attachments; bounce/complaint; invalid recipient; retry/backoff; duplicate webhook/idempotency; scheduled mail; quota/suppression; SPF/DKIM/DMARC/domain verification; attachment malware/quarantine strategy; phishing/abuse protections; audit/observability.

No API keys in commits, fixtures, logs, screenshots, or chat transcripts.

## Execution order

1. Inventory reality before adding parallel architecture: map existing engines, manifests/tests, APIs, Supabase schema/RLS, migrations, hard-coded/dead-control audit findings and unresolved defects.
2. Implement Quality System schema + Capability Ledger + CI validation.
3. Close shared foundation defects and unresolved security/offline/observability issues.
4. Deepen Studio as complete engine-backed slices.
5. Deepen Sites + Commerce kernel and cross-product commerce journeys.
6. Close Mail/Resend real-world round trip and mail security.
7. Deepen Library/Documents/Work primitives.
8. Deepen Search/Yande integration over permission-aware shared engines.
9. Expand remaining products only when dependencies meet their gates.

Culture/measurement and other new major surfaces may remain product specifications until their required foundations are ready.

## Definition of done for a capability

A capability is not done until:
- the promised user job can be completed from entry to outcome;
- real canonical data persists and survives leave/reopen;
- authorization/RLS and tenant boundaries are proven;
- loading/empty/error/retry/cancel states are honest;
- critical failure/recovery scenarios are tested;
- declared offline behavior works and reconnects safely;
- old compatible data still works;
- performance/accessibility budgets pass;
- telemetry/diagnostics exist without leaking sensitive data;
- automated evidence is linked from the ledger;
- no known blocker is hidden by fallback UI or fake data.

The target is not perfection. The target is that every capability Kebu claims can be trusted to finish the job.
