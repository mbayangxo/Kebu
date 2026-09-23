# Kebu Capability Audit — Live Ledger

Generated baseline: 2026-09-22
Governing spec: `docs/KEBU_PRODUCT_DEPTH_QUALITY.md`

This ledger supersedes broad statements such as “the page was audited.” It records the evidence required beneath each product surface. **Unknown is a finding, not a pass.** A capability may not be promoted to Reliable/Release-ready without evidence links.

## Audit dimensions

For every capability record all applicable evidence:

`UI | domain engine | API/server | Supabase schema | migration | RLS/authz | storage | external provider | loading/empty/error | persistence/reopen | offline/reconnect | compatibility | unit | integration | RLS | E2E | accessibility | performance | security | observability | feedback`

Allowed evidence states: **PASS, FAIL, PARTIAL, BLOCKED, N/A, UNKNOWN**.

## Baseline findings from repository inspection

| Area | Capability / evidence | Current finding | Next proof required |
|---|---|---|---|
| Global | Existing quality contract | PASS (documented) | Automate enforcement; documentation alone is not runtime proof |
| Global | CI | PARTIAL | Current CI runs migration hygiene, typecheck, lint, broad tests and build. Add explicit RLS/DB/E2E/accessibility/security/performance/offline/compatibility gates |
| Global | Implementation status | FAIL (stale) | `docs/IMPLEMENTATION_STATUS.md` says last updated 2026-09-10 and conflicts with newer Mail/Studio work; regenerate from ledger/evidence |
| Global | Page audit == capability audit | FAIL | Route-by-route UI audit is insufficient; enumerate actions and downstream dependencies |
| Global | Production fake/dead-control enforcement | UNKNOWN | Repository-wide scanner + allowlist + runtime journey checks |
| Global | Feedback/Product Intelligence | UNKNOWN | Inventory existing help/support primitives; implement only missing universal feedback lifecycle |
| Mail | Resend dependency | PASS | `resend` package exists |
| Mail | External outbound transport | FUNCTIONAL IN CODE | Real provider call exists; verify deployed env/domain + send to external inbox |
| Mail | Inbound Resend webhook | FUNCTIONAL IN CODE | Signature verification and inbound persistence exist; verify real webhook round trip |
| Mail | Inbound idempotency | FUNCTIONAL IN CODE | provider message ID duplicate check exists; adversarial duplicate webhook test |
| Mail | Inbound attachments | PARTIAL | download/size/storage path exists; prove safe file policy/quarantine/malware strategy and E2E |
| Mail | Thread/reply | PARTIAL | internal thread identity/reply linkage exists; verify standards-level external reply/thread behavior |
| Mail | Bounce/complaint/suppression | UNKNOWN | inventory handlers/provider events; implement/test missing lifecycle |
| Mail | Deliverability | BLOCKED ON DEPLOYED CONFIG PROOF | verify sending/receiving domain, SPF/DKIM/DMARC and provider configuration |
| Studio | Offline media cache | FUNCTIONAL IN CODE | E2E offline edit/reconnect/conflict evidence |
| Studio | Canvas document / versions | FUNCTIONAL IN CODE | compatibility fixtures + reopen evidence |
| Studio | Assets | FUNCTIONAL IN CODE | upload/import/licensing/search/offline matrix |
| Studio | Audio | FUNCTIONAL IN CODE | timeline/render/export journey evidence |
| Studio | Captions | FUNCTIONAL IN CODE | generate/edit/timing/export/offline/provider-failure journey |
| Studio | Brand | FUNCTIONAL IN CODE | permission/reuse/cross-project journey |
| Studio | Timeline/video | PARTIAL | full multi-track trim/split/ripple/snap/keyframe/transition/speed/audio/export matrix |
| Studio | Render/export | PARTIAL | editor-preview-export semantic parity, cancellation/retry/background-job evidence |
| Studio | Photo editing | UNKNOWN | inventory current non-destructive operations vs promised capability set |
| Studio | Collaboration | PARTIAL | comments/collaborators/versions exist; concurrent editing/presence/conflict proof |
| Studio | Import/export | PARTIAL | enumerate formats, unsupported-property behavior, compatibility fixtures |
| Studio | Publishing | PARTIAL | prove Studio -> Kebu destinations without lossy reconstruction |
| Commerce | Catalog/products/variants | FUNCTIONAL IN CODE | E2E create/edit/publish/reopen + tenant isolation |
| Commerce | Inventory | FUNCTIONAL IN CODE | concurrency/last-item/reservation/cancel/return tests |
| Commerce | Cart/checkout | FUNCTIONAL IN CODE | idempotency, interruption/retry and multi-provider journeys |
| Commerce | Orders | FUNCTIONAL IN CODE | state-machine invariant + duplicate event tests |
| Commerce | Payments/ledger | PARTIAL | provider reconciliation, duplicate webhook, failure/refund invariants |
| Commerce | Fulfillment | FUNCTIONAL IN CODE | partial fulfillment/retry/customer notification journey |
| Commerce | Returns/refunds/exchanges | UNKNOWN | inventory and close missing complete lifecycle |
| Commerce | Customers | FUNCTIONAL IN CODE | consent/history/tenant-isolation proof |
| Commerce | Markets/localization | FUNCTIONAL IN CODE | currency/tax/shipping/localization matrix |
| Commerce | Analytics | PARTIAL | reconcile analytics to canonical order/payment events; no invented metrics |
| Work | Documents | PARTIAL | block/structured-object/revision/comment/mention capability inventory |
| Work | Rooms/chat | PARTIAL | threads/reactions/attachments/realtime/permissions/offline matrix |
| Work | Tasks/calendar/spaces | FUNCTIONAL UI/API UNKNOWN DEPTH | enumerate every action beneath each surface and prove persistence/authz/failure/reopen |
| Search | Filters/query | FUNCTIONAL UI/API | permission-aware indexing, freshness, failure, ranking and cross-product result journey |
| Sites | Builder/publish | PARTIAL | critical edit->save->reopen->publish->public render compatibility/offline/security journeys |
| Business | Context + detail | PARTIAL | role matrix and cross-product business-context propagation |
| Reach | Campaigns/wallet | PARTIAL | money/auction/impression integrity and abuse/security evidence |
| Yande | Engine orchestration | UNKNOWN | prove AI invokes shared domain commands rather than parallel mutation paths |

## Audit procedure — every page and every capability

For every route:

1. Enumerate every visible action, keyboard action, background action and deep link.
2. Trace each action to its component/handler.
3. Trace handler to shared domain command/service.
4. Trace service to API/server action/job/provider.
5. Trace persistence to exact tables/storage/events and migrations.
6. Trace authorization to server checks + RLS/tenant policy.
7. Trace return state after refresh/reopen and another device/session where relevant.
8. Exercise loading, empty, invalid input, unauthorized, provider failure, network loss, retry, cancel and double-submit.
9. Exercise offline contract and reconnect/conflict when applicable.
10. Open representative historical fixtures with current code.
11. Record automated evidence: unit, integration, DB, RLS, E2E, accessibility, security, performance, visual.
12. Search the dependency path for fake fallback, hard-coded identity/tenant/data, swallowed exceptions, dead controls and duplicated domain logic.
13. File every defect as a blocker to that capability's promotion; repair root cause before dependent expansion.
14. Re-run affected cross-product journeys.
15. Only then update maturity.

## Critical journeys to prove first

1. **Studio:** import media -> edit multi-track timeline -> captions -> save -> close/reopen -> offline edit -> reconnect -> export.
2. **Sites:** create -> edit -> save -> close/reopen -> responsive preview -> publish -> public render -> update -> rollback/version compatibility.
3. **Commerce:** product+variant -> inventory -> storefront -> cart -> checkout -> payment -> order -> notification -> fulfillment -> refund/return -> ledger+analytics reconciliation.
4. **Mail:** create mailbox -> external send -> receive externally -> external reply -> inbound webhook -> thread -> attachment -> duplicate webhook -> bounce/complaint.
5. **Work:** create space -> room -> invite/permission -> message/file/task/doc/event -> reconnect -> search -> notification -> revoke access.
6. **Account/Business:** Personal/Business/Work context switch -> permissions -> product actions -> verify no cross-tenant leakage.
7. **Search/Yande:** create/update content in source product -> index -> permission-aware search -> open result -> Yande invokes same domain action -> source reflects mutation.

## Reporting rule

Never report “all audited” unless every in-scope ledger row has no UNKNOWN and all mandatory dimensions are PASS/N/A or explicitly BLOCKED with an external dependency. Report exact counts by maturity and unresolved blocker list.
