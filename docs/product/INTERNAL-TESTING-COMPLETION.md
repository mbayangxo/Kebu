# Kebu internal-use completion track

Updated 2026-10-09 UTC. User goal: finish the planned stages, then use Kebu internally for sustained real-content testing. Local implementation evidence does not replace signed-in release verification.

## Foundation slices

| Slice | State | Remaining |
|---|---|---|
| 3C S1–S5: document/registry/adapter/authority/history | Implemented with retained local/database evidence | Final combined S8 sign-off |
| 3C S6: native primitive editor | Implemented, local journeys tested | Signed-in full-stack journeys |
| 3C S7: immutable publishing/live compatibility | Implemented, SQL transaction/security/concurrency tested | Signed-in browser publishing/reload and R1 production-build verification |
| 3C S8: final gate | Partially verified | Signed-in QA (user deferred), human visual sign-off, QA baseline checks and explicit new-project default decision |

## Builder continuation

| Phase | State | Next work |
|---|---|---|
| 3D spatial editing | Implemented; all spatial slices and responsive art direction passed the final local development gate on Node 20.20.2 | Signed-in/release gates remain separate |
| 3E motion | Implemented; local development gate passed on Node 20.20.2 | Signed-in/release gates remain separate |
| 3F/3G rich media/editorial | Implemented; local development gates passed on Node 20.20.2 | Signed-in/release gates remain separate; seven legacy families support explicit conversion |
| 3H Brand Brain | Feature-complete; four-profile authoring, approved asset curation, durable site attachment and undoable native application locally verified | Absolute development timing sign-off remains open: current and pre-attachment controls both miss budgets on this host. Hosted signed-in/release checks remain separate. See `evidence/3h/complete/README.md` |
| 3I generative experience engine | Feature implementation and local functional QA complete: metered server gateway, excerpt evidence review, saved site/page/section plans, exact native apply/history and publishing | Real-provider contract/content-quality sign-off needs secure server AI configuration; independent-session reservation race verification remains a readiness check. No screenshot/URL inspection is claimed. See `evidence/3i/engine/README.md` |
| 3J real-content gate | Local features/functional QA complete; full sign-off blocked | Styled portfolio and actual specimen editing/persistence pass. Real generated quality, genuine signed-in S8, quota and stable-host timing remain open. Current QA security/stock/ledger repairs pass; one synthetic fixture cleanup is connector-blocked. See `evidence/3j/remaining-repairs.md`. |

The user's instruction to finish the planned work authorizes continued development; the roadmap's earlier implementation-authorization caveat is superseded by this instruction. Each new phase still requires its own product blueprint and verification. Defaults, production schema changes and public rollout are separate decisions and remain unchanged.

## Internal testing readiness

Before saying the native builder is ready for internal daily use: finish the planned capabilities above; verify a signed-in owner can create/open a native project, upload/select real assets, edit on each device, recover from rejected/conflicted saves, undo/redo, reload, publish and view the detached snapshot. Verify another user cannot read/edit/publish the project. Confirm the intended internal environment has the reviewed migrations and opt-in flags, and document how to restore saved content. These checks use the real persistence path; controlled local browser fixtures alone do not close them.

After readiness, retain real internal test projects and record discovered issues using the bug protocol. Local test data and screenshots must not be presented as real users, accounts or business activity. No production push/merge/deploy or migration is authorized by this checkpoint.

2026-10-08 UTC: Node 20.20.2 typecheck/lint/tests and a clean production build passed. The 3D local development gate is closed; this does not close signed-in S8 or authorize rollout. The 3E motion local development gate is also complete. The 3F/3G local gates also passed: 147 full browser cases plus 9 final rich-text cases, nine performance budgets, 5,376 tests and a clean 201-page build.

2026-10-09 UTC: All planned 3H features are implemented. The combined browser matrix passed 165 cases without skips, including public rendering; 55 focused schema/planner/API/actual SQL tests passed. Node 20.20.2 CI passed typecheck, lint (zero errors / 289 existing warnings), 5,431 tests (110 environment skips) and a clean 202-page production build. Development timing is not signed off: repeated measurements vary substantially and the previous editor also exceeds unchanged budgets on the same host. Continue with the 3I product blueprint; carry the stable-host timing recheck and deferred signed-in QA into the internal-readiness gate. Do not claim all 3H gates or internal readiness passed.

2026-10-09 UTC, 3I engine reconstruction: the complete current source passed 50 focused compiler/gateway/API/actual PostgreSQL checks and all 171 combined functional browser cases. Node 20.20.2 CI passed typecheck, zero lint errors / unchanged 289 warnings, 5,485 tests / 111 environment skips and a clean 202-page build. The extra skip is the explicit real-provider test: no Anthropic key is configured in this local server, so production prompts/real output/content quality remain unverified. The next planned development phase is the 3J blueprint and real-content benchmark; do not mark 3I fully signed off or Kebu ready for daily internal use from controlled fixtures. No hosted schema/advisors, deployment, defaults, push or merge occurred.

### 2026-10-09 UTC — continuation checkpoint

3J local implementation and runnable QA are complete: styled five-page native portfolio, 35 focused checks, ten browser cases, persisted editing/history/publication and recovery. CI passed 5,520 tests / 116 explicit skips, typecheck, zero lint errors / 289 existing warnings and production build. Five digest tests passed after a final test-only assertion-isolation improvement. Full sign-off remains blocked by absent real AI configuration/generated-quality review, non-root native PostgreSQL process rejection (spawn EINVAL), stable-host timing and deferred hosted S8. Original asset artifacts and unsupported legacy behavior remain documented. See evidence/3j/README.md. No production operation, deployment, defaults, push or merge occurred.


### 2026-10-10 UTC — QA reservation security repair verified

Restored the saved 20dc95b source checkpoint before changing QA. Applied canonical migration `20261010003722_qa_checkout_reservation_access.sql` only to Kebu-qa: reservation RLS, removal of browser table/column privileges, and service-only execution for six privileged checkout RPCs. All function bodies and data preserved. Local PostgreSQL regression: 25 passes. Hosted role verification: 22 denials, actual service CRUD/release passed, zero residue and persistent grants confirmed. Full CI: typecheck, zero lint errors / 289 existing warnings, 5,545 passes / 116 explicit skips and 202-page build. The exposed-reservation advisor error is gone; other findings remain under review. Evidence: `evidence/3j/reservation-security.md`.

Internal readiness and full 3J remain BLOCKED: hosted legacy checkout functions reference missing columns and lack canonical branch source, real signed-in S8 is unverified, AI configuration/generated quality is absent, native independent sessions and stable-host timing remain open. The completion gate still refuses sign-off. No production operation, deployment, defaults, push, merge or project pause.


### 2026-10-10 UTC — remaining QA security, atomic stock and ledger repair

QA-only security/stock/ledger migrations applied and post-verified. Browser access to five internal RPC names removed; 18 mutable paths fixed; existing bodies retained. Canonical stock helpers now use atomic relative SQL updates, aggregate duplicate cart lines and fail closed. Recovered missing payment ledger from original migration documents with explicit owner read/service write grants. Thirty-eight focused checks and full CI passed: 5,576 passes / 116 skips, zero lint errors / 289 existing warnings and 202-page build. Ten hosted role denials, service job/stock/refund record-completion, auth trigger and shadow resistance passed. Separate hosted stock sessions refused overselling.

Internal readiness remains BLOCKED. One synthetic concurrency fixture (one auth row, project and product) remains because scoped cleanup requests fail with connector Invalid or expired requestState; exact guarded cleanup and evidence retained. Legacy checkout/cart schema drift, cancellation/refund lifecycle and payment-provider verification still require repair. Signed-in S8, real AI, quota and stable timing remain open. No production operation/deploy/default change/push/merge/pause. See `evidence/3j/remaining-repairs.md`.
