# 3I Generative Experience Engine — architect blueprint

2026-10-09 UTC. The user's “Continue I” authorizes local 3I development under the continuation track. Hosted signed-in S8, production migrations/deployment, defaults and rollout remain deferred. 3H feature/functional evidence is restored; its stable-host timing sign-off remains open and is carried into internal readiness. This blueprint does not claim that gate passed.

## Product and information architecture

3I translates a business brief and references into an original, editable site. Brand Brain supplies reusable identity/creative/taste/motion constraints. **Experience DNA** supplies project-specific audience, visitor goal, content requirements, reference observations and page intent. **Reference Intelligence** proposes evidence-labelled observations from supplied content. **Site Director** proposes whole-site/page/section compositions. **Model Gateway** isolates provider access and metering. None is a parallel document model: the final authority is KCD operations, capabilities, journal and immutable publishing.

Reference content and user notes are untrusted data, never system instructions. Models propose; server validation and an explicit user review determine changes. No invented business claims, contact details, proof, products, asset ownership or payments. Preserve African diversity and the owner's stated aesthetic; do not default every African business to earth tones or heritage patterns.

## Surfaces, journeys and navigation

| Surface | See and do | State/recovery | Persistence |
|---|---|---|---|
| Builder · Site direction | Project audience/goals, reference observations and ordered desired pages; edit/save/reload | Compact closed accordion; loading, empty, unsaved, saving, saved revision, failed/conflicted save, explicit discard/reload | Owner-scoped Experience DNA row; refresh retains saved values |
| Reference review | Supply an excerpt; request analysis; compare evidence, inference and uncertainty; edit/save owner observations | Loading/cancel/failure keeps source draft; source failure is never called analysis; no URL/screenshot inspection | Immutable observations retain source/provenance and accepted owner edits |
| Site plan review | Read ordered page/section purposes and proposed native composition; approve requested scope | Unsatisfied constraints/unsupported capabilities block application; stale document/brief/profile requires fresh review | Saved proposal ties exact source revisions/document expectations to transaction |
| Builder result | Apply approved plan as ordinary native nodes, edit per device, Undo/Redo, save/reload and publish | Existing canonical acknowledgement/conflict/retry/history UX | Existing KCD authority/journal; publishing remains detached snapshot |

First journey: open a native project → Site direction → define audience and visitor action → record why selected references matter → order desired pages → Save → reload → same revision/data. Saving direction never inserts/renames/deletes site pages or changes an element. Page intent is clearly labelled a desired plan. Site direction is project-level and remains mounted while selecting elements; its permissions are independent of an element lock.

Subsequent journey: supplied excerpt → model analysis → review evidence → save immutable owner-reviewed observations → select references → generate site plan from saved Experience DNA/Brand Brain → review scope, native preview and constraint warnings → server-validated KCD transaction → one Undo step → responsive edits → save/reload → publish snapshot. Whole-site, page and section scopes are explicit; replacement/deletion requires concrete review. Provider analysis and owner review never overwrite the saved manual brief.

## Feature and interaction inventory

S1 authoring: goal, audience, primary visitor action, desired visual experience; up to 12 labelled HTTPS references with owner observations; up to 12 ordered desired pages with title/slug/purpose, unique slugs and a home page. Add/edit/move/remove draft entries; removal changes only the brief after Save. Plain labels and useful empty guidance. No AI-labelled control exists in S1.

S2 Reference Intelligence + gateway: real metered server-side model calls, bounded input/output/time/cost, source provenance, strict structured output, honest provider failure, no automatic fetching of arbitrary URLs. References are not treated as inspected just because a URL exists. Prefer owner uploads/excerpts; any remote retrieval needs explicit safe fetching design (DNS/redirect/private address/size/content-type limits). No fabricated observations or fallback “AI” output.

S3 Site Director: reconcile business facts, accepted reference evidence, Experience DNA, attached Brand Brain and current site; generate an original responsive plan using native section/group/text/image/video capabilities. Validate bounded operations, semantics, asset allowlist, typography, motion/reduced motion, locks, device settings, unknown/future versions and all source revisions. Keep professional composition quality instead of a fixed hero/three-cards template.

S4 plan application/integration: concrete review, atomic operations with origin `ai`, canonical expected versions, idempotent transaction/retry, inverse history and immutable publish; whole-phase adversarial and quality gates. Include actual provider quality checks before claiming AI generation works, then 3J May Lècor reference-to-site benchmark. No provider/model selection UI unless it helps the owner make a product decision.

## Components and visual/interaction specification

Reuse native Builder accordion, `BUILDER` tokens, 12px labelled utility inputs and existing responsive inspector. A dedicated lazy-loaded direction editor keeps generation dependencies out of initial canvas code. References and pages use ordered compact rows, not oversized cards. Main actions stay adjacent to saved revision; status uses aria-live and failures use alerts. Existing Shopify dossier/video frames supply hierarchy/density principles, not branded assets or copied navigation.

Keyboard: native summary activation, labelled controls, normal tab order, move-up buttons rather than drag-only ordering. Closing the accordion retains draft; page/element selection retains it. Before unload/internal navigation, confirm unsaved draft loss. Reload asks before discarding; saving/uncertainty cannot silently discard or auto-retry. Phone controls wrap and lists use min-width:0 with no horizontal overflow. No new overlay/z-index scheme.

## Data, state, permission and backend design

S1 adds `project_experience_dna`: project primary key, immutable owner, strict bounded version-1 JSON and monotonic safe-integer revision. Composite project/owner FK reuses the 3H project ownership index; project deletion cascades under existing deletion authority. No client DELETE permission or revision reset. Authenticated owner-only read/insert/update RLS and explicit grants; security-invoker RPC locks the owned project, compares expected revision and returns canonical row. Direct writes also validate payload and advance revision. Future/unknown stored data refuses editing rather than being normalized away.

API `/api/projects/[id]/experience-dna`: authenticated owner GET; bounded strict PUT with expectedRevision and same-origin guard. Read failure is not an empty brief. Missing row is explicit revision 0. Validate acknowledgements against project, expected revision+1 and exact submitted DNA. Conflict/uncertainty retains draft and requires confirmed authoritative reload before another write. No service-role/team/support disclosure of private direction. Deterministic compiler labels all current observations `owner-authored`; provider proposals will need a separate version/provenance contract, not overwrite that label.

State: unloaded → loading → clean/new; edit → dirty; save → saving → clean canonical revision. Invalid input remains dirty. Server/network/bad ACK → dirty/uncertain; reload confirmation → authoritative clean or error with draft kept. Mounted/abort guards prevent stale requests or updates after unmount. Loading is on demand; no per-keystroke database writes.

Gateway later reuses existing account AI usage/entitlement systems; audit their concurrency limits before claiming hard quotas. Keep provider secrets server-only and select configured supported models from current primary docs. Do not introduce a new billing/auth architecture. A real-provider verification dependency can block AI sign-off, never be hidden with development fixtures.

## Verification and completion

Each slice requires full Node 20 CI and browser visual/failure journeys. S1: strict/oversized/future/unknown schema tests; actual SQL owner/foreign/anonymous/direct-write/revision/stale-replay/FK cases; API CSRF/auth/input/storage/canonical ACK/error cases; desktop/phone edit-reference-page-order-save-refresh, draft guards, conflict/uncertain reload and no KCD mutation. Use controlled local browser responses plus actual disposable PostgreSQL and distinguish them from hosted QA.

S2–S4: real provider validation/metering/failure, prompt injection/source evidence, unsafe assets, stale brief/profile/document rejection, exact atomic KCD diff and Undo/Redo/reload, public JS-off/on/device/reduced-motion output, database concurrency/RLS, unchanged performance budgets and real content quality. A saved manual brief is not automatic reference analysis or full 3I completion. Hosted migrations/advisors/signed-in S8 and stable-host performance remain separate release/internal-readiness requirements.

## S1 local result

Owner-authored Experience DNA is implemented and locally verified: 22 focused schema/API/actual SQL tests, 72 combined browser cases, seven final direction rechecks and manual desktop/phone visuals. Node 20.20.2 CI passed typecheck, zero lint errors, 5,453 tests / 110 environment skips and a clean 202-page build. Final lint after removing an unused test import retains the 289-warning baseline. Evidence: `evidence/3i/experience/README.md`. The stable project-level mount preserves drafts across element/hierarchy/device/page and inspector-tab changes. No site changes are made by saving direction. At this S1 checkpoint, S2–S4 were still unimplemented; the rebuilt result below supersedes that status.

## Rebuilt S2–S4 local result

The remaining engine is implemented through the existing KCD authority. The server gateway uses the existing Anthropic SDK behind a schema-based interface, forced structured output, bounded input/output/tokens/timeout, cancellation and zero retries. Reference evidence must be an exact quote from the supplied excerpt; observations retain model provenance and owner corrections save as new immutable versions. No fallback output, retrieval, screenshot interpretation or provider-picker UI is introduced.

Site Director proposals compile saved Experience DNA, the attached Brand Brain and selected owned reference reviews into native section/group/text/image/video compositions. The compiler assigns identities/order, verifies asset/link allowlists, semantics, palette/motion limits, locks, responsive properties and canonical transaction bounds. Site/page/root-section addition or replacement is explicit. Matching whole-site page identities are retained. A review shows warnings, element rationale/properties, removals/additions and an actual device-width native preview. Confirmation submits the exact saved AI transaction into the existing coordinator/journal/history.

The CLI-allocated local migration `20261009083046_experience_engine.sql` stores immutable private proposals, reserves an existing account allowance before provider work, and atomically compares the exact transaction, saved DNA/binding/profile revisions and all page/node versions before delegating to `apply_node_ops`. Committed journal recovery remains idempotent after later source changes. Reservation calls serialize with each other using an owner transaction lock; legacy AI routes retain their separate check/insert race, so no account-wide hard quota is claimed. Browser deletion/update of usage events is revoked; legacy INSERT remains.

Current evidence: 50 focused compiler/gateway/API/actual PGlite SQL tests; 171 combined functional browser cases without skips, including desktop/phone review/apply/history/reload/failure recovery and native public JavaScript-off/on/device/reduced-motion checks; manually inspected controls and previews; Node 20.20.2 CI with 5,485 passing tests / 111 environment skips, typecheck, zero lint errors / unchanged 289 warnings and a clean 202-page build. See `evidence/3i/engine/README.md`. The lost candidate's results are not reused as current evidence.

Feature implementation and local functional QA are complete. **Full 3I sign-off remains open:** the local server has no configured Anthropic key, so real provider contract and original content quality have not been verified. The opt-in test uses production prompts and the real SDK, fails if explicitly requested without configuration, and records actual output for manual review. PGlite verifies real SQL/roles/transactions, not independent-connection races. Hosted S8/migrations/advisors, stable-host performance and release/default decisions remain deferred or open; 3J requires its own blueprint and real-content benchmark.
