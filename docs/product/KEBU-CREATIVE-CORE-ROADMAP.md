# Kebu Creative Core — phase roadmap (3C → 3J)

**Recorded:** 2026-09-29 · **Updated:** 2026-10-09. The user's continuation authorizes development of the planned phases, with a product blueprint before each phase's code.
**Current work:** 3J is in progress: its blueprint, manual May Lècor native content benchmark, adversarial/history/snapshot checks, six five-page public browser cases and explicit real-provider/completion-gate harness are implemented locally. Full styled owner-portfolio reconstruction, specimen-specific editor/persistence verification and real generated creative-quality sign-off remain open. The explicit provider run failed because the server AI key is absent. See `evidence/3j/README.md`. 3I real-provider sign-off, 3H stable-host timing, independent-session quota verification and hosted signed-in S8 remain separate readiness gates. Do not mark 3J complete or Kebu ready from the manual specimen.

## Governing principle

```
foundation models propose / intend changes
      → Kebu translates them into validated KCD operations (Transactions, origin: "ai")
      → Kebu Creative Core remains the authority (registry, capabilities, apply_node_ops, journal)
      → every change stays editable, undoable, responsive, versionable and publishable
```

No phase below may introduce a parallel AI-builder architecture, a second document model, or direct writes that
bypass the 3C operation authority. Generated output is ordinary KCD content: the same nodes, ops, history and publish
path a human editor uses.

## Phases

| Phase | Scope | Builds on |
|---|---|---|
| **3C** | Creative Document Core — model, registry, legacy adapter, renderer boundary, storage authority, operation history, primitive pilot, kcd-1 publishing, inspector | 3B |
| **3D** | Free positioning, drag/resize, snapping, z-order, layers panel, nested per-device reorder | 3C |
| **3E** | Motion engine (defines the `motion` / `interaction` payloads 3C stores opaquely) | 3C–3D |
| **3F / 3G** | Masks, video, rich text, effects; decomposition of Hero / editorial / gallery / media-heavy legacy sections into primitives | 3C–3E |
| **3H** | **Brand Brain** — Brand DNA · Creative DNA · Taste DNA · Motion DNA: durable, structured, editable brand/creative/taste/motion profiles that constrain and inform generation and editing | 3C–3G |
| **3I** | **Generative Experience Engine** — Reference Intelligence (analysing references into structured intent) · Experience DNA · Site Director (plans whole-site structure, pages and sections as KCD transactions) · Model Gateway (provider-agnostic model access; models propose, never write) | 3C–3H |
| **3J** | **Real-world Creative Torture Gate** — adversarial, real-content quality gate, including the **May Lècor Reference-to-Site benchmark** (reference → generated, fully editable KCD site; also the target for rebuilding owner-portfolio sections from ordinary primitives, per the 3C freeze) | 3C–3I |

## Constraints carried from 3C

- AI output enters only as `Transaction`s through the server authority (3C freeze §4) — never direct row writes.
- Unsupported capabilities are surfaced and block publish; generation never silently drops or fakes content.
- The website-v1 compatibility window remains through 3J (3C freeze §11).
- 3H/3I/3J require their own Product Architect phase and design freeze before any code.

### 2026-10-09 UTC — continuation checkpoint

3J local implementation and runnable QA are complete: styled five-page native portfolio, 35 focused checks, ten browser cases, persisted editing/history/publication and recovery. CI passed 5,520 tests / 116 explicit skips, typecheck, zero lint errors / 289 existing warnings and production build. Five digest tests passed after a final test-only assertion-isolation improvement. Full sign-off remains blocked by absent real AI configuration/generated-quality review, non-root native PostgreSQL process rejection (spawn EINVAL), stable-host timing and deferred hosted S8. Original asset artifacts and unsupported legacy behavior remain documented. See evidence/3j/README.md. No production operation, deployment, defaults, push or merge occurred.


### 2026-10-10 UTC — QA reservation security repair verified

Restored the saved 20dc95b source checkpoint before changing QA. Applied canonical migration `20261010003722_qa_checkout_reservation_access.sql` only to Kebu-qa: reservation RLS, removal of browser table/column privileges, and service-only execution for six privileged checkout RPCs. All function bodies and data preserved. Local PostgreSQL regression: 25 passes. Hosted role verification: 22 denials, actual service CRUD/release passed, zero residue and persistent grants confirmed. Full CI: typecheck, zero lint errors / 289 existing warnings, 5,545 passes / 116 explicit skips and 202-page build. The exposed-reservation advisor error is gone; other findings remain under review. Evidence: `evidence/3j/reservation-security.md`.

Internal readiness and full 3J remain BLOCKED: hosted legacy checkout functions reference missing columns and lack canonical branch source, real signed-in S8 is unverified, AI configuration/generated quality is absent, native independent sessions and stable-host timing remain open. The completion gate still refuses sign-off. No production operation, deployment, defaults, push, merge or project pause.


### 2026-10-10 UTC — remaining QA security, atomic stock and ledger repair

QA-only security/stock/ledger migrations applied and post-verified. Browser access to five internal RPC names removed; 18 mutable paths fixed; existing bodies retained. Canonical stock helpers now use atomic relative SQL updates, aggregate duplicate cart lines and fail closed. Recovered missing payment ledger from original migration documents with explicit owner read/service write grants. Thirty-eight focused checks and full CI passed: 5,576 passes / 116 skips, zero lint errors / 289 existing warnings and 202-page build. Ten hosted role denials, service job/stock/refund record-completion, auth trigger and shadow resistance passed. Separate hosted stock sessions refused overselling.

Internal readiness remains BLOCKED. One synthetic concurrency fixture (one auth row, project and product) remains because scoped cleanup requests fail with connector Invalid or expired requestState; exact guarded cleanup and evidence retained. Legacy checkout/cart schema drift, cancellation/refund lifecycle and payment-provider verification still require repair. Signed-in S8, real AI, quota and stable timing remain open. No production operation/deploy/default change/push/merge/pause. See `evidence/3j/remaining-repairs.md`.
