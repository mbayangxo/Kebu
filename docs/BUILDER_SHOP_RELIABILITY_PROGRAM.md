# Builder + Shop Reliability Program

Priority: P0
Owner rule: Builder is Kebu's first complete proof product. Do not expand unrelated product surface while a P0 Builder critical journey is broken.
Governing quality contract: `docs/KEBU_PRODUCT_DEPTH_QUALITY.md`
Evidence ledger: `docs/CAPABILITY_AUDIT_LEDGER.md`

## Product outcome

A user must be able to create and operate a professional artist/brand website and sell merchandise without leaving Kebu because a core Builder or Shop job is missing or unreliable.

The flagship acceptance fixture is a real, complex artist site (including the existing May Lècor portfolio project) rather than a toy demo.

## Agent/workstream policy

Parallel agents are useful for **auditing independent domains**, not for independently rewriting shared Builder state. One integrator owns shared editor state, schema, persistence and release gates.

Safe parallel workstreams:
1. Editor shell + interaction state
2. Document/schema + persistence + compatibility
3. Canvas/direct manipulation + responsive behavior
4. Media/assets + image/video behavior
5. Pages/navigation/header/footer/forms/blog/SEO/domain
6. Publish/render/performance/accessibility
7. Shop/commerce lifecycle
8. Security/RLS/offline/recovery
9. Test/benchmark/adversarial QA (read-heavy; fixes coordinated through integrator)

Agents must not create duplicate engines or alternative schemas to avoid a failing dependency.

## P0 Builder critical journeys

Every row requires: UI -> domain logic -> API -> Supabase -> RLS -> refresh/reopen -> failure recovery -> test evidence.

- Open editor: canvas loads; **left inspector/panel is closed by default**. A rail action or canvas selection opens the relevant panel. Clicking active rail item closes it.
- Select/edit text: select -> edit -> save/autosave -> refresh -> exact content remains.
- Image: upload/import -> storage -> select -> replace/crop/fit/position/alt -> save -> refresh -> public render.
- Section: add -> configure -> reorder -> duplicate -> hide/delete -> undo/redo -> save -> refresh.
- Direct manipulation: select/move/resize where supported; keyboard movement; handles; no accidental canvas navigation.
- Pages: create/rename/duplicate/delete/reorder/nest -> navigation updates intentionally -> refresh -> public routes correct.
- Header/footer/navigation: edit links/layout -> responsive preview -> save -> publish.
- Responsive: desktop/tablet/mobile preview and device overrides persist without corrupting other breakpoints.
- Design system: typography/colors/spacing/backgrounds/theme/aesthetic -> persist -> apply consistently.
- Forms: create -> publish -> submit -> validate -> persist -> owner receives/reads submission -> spam/error behavior.
- Blog/content: create/edit/publish/unpublish -> public render -> SEO metadata.
- Assets: upload/reuse/delete/reference safety -> offline/reconnect behavior where promised.
- Versioning: edit -> version -> restore -> refresh; historical fixture opens without destructive migration.
- Yande: proposed structured change -> preview -> accept/reject -> same domain mutation path -> undo/version.
- SEO/domain: metadata/sitemap/robots/domain settings are real and not duplicated/conflicting.
- Publish: draft -> preview -> publish -> public site -> update -> republish -> rollback/recover.
- Offline/data saver: visited project opens to promised level; edits queue honestly; reconnect is idempotent/conflict-aware.
- Error recovery: failed save/publish/upload never claims success and never destroys local work.
- Accessibility/performance: editor keyboard/focus baseline; public output meets budgets and avoids layout shift/broken media.

## P0 Shop critical journey

Product + variants -> media -> inventory -> storefront -> cart -> checkout -> payment -> order -> merchant notification -> fulfillment -> cancellation/return/refund -> stock/ledger/analytics reconciliation.

Destruction cases:
- two buyers attempt last unit
- checkout double-submit
- duplicate payment webhook
- provider accepts payment but Kebu response fails
- Kebu creates order but notification fails
- partial fulfillment
- cancellation restores correct stock
- partial/full refund reconciles ledger
- expired/abandoned cart
- network loss during checkout
- unauthorized merchant/customer access
- replayed webhook/request

## Builder capability ledger

Status must be evidence-based: UNKNOWN / PARTIAL / FUNCTIONAL / RELIABLE / RELEASE-READY.

| Domain | Required depth | Baseline |
|---|---|---|
| Editor shell | closed-by-default contextual panel, compact chrome, deterministic selection | PARTIAL — source defaults panel closed; production regression still requires E2E proof |
| Document model | structured editable schema, versioning, migrations, compatibility | PARTIAL |
| Persistence | autosave/manual save, idempotency, reopen, conflict handling | PARTIAL |
| Canvas | select/edit/move/resize/duplicate/delete/reorder/undo/redo | PARTIAL |
| Responsive | desktop/tablet/mobile preview + overrides | PARTIAL |
| Pages/nav | CRUD, hierarchy, links, route correctness | PARTIAL |
| Design | tokens, type, colors, spacing, backgrounds, reusable aesthetics | PARTIAL |
| Media | upload/storage/reuse/crop/fit/position/video/alt | PARTIAL |
| Forms | build/publish/submit/owner retrieval | UNKNOWN |
| Blog | author/publish/render/SEO | PARTIAL |
| SEO/domain | canonical metadata + domain lifecycle | PARTIAL |
| AI/Yande | structured preview/apply through shared commands | PARTIAL |
| Offline | queue/reconnect/conflict/data-saver | PARTIAL |
| Publish/render | preview/live parity, public performance, rollback | PARTIAL |
| Shop | complete merchandise lifecycle | PARTIAL |
| Accessibility | editor + generated site | UNKNOWN |
| Performance | editor + public budgets | UNKNOWN |
| Security | authz/RLS/storage/tenant isolation | PARTIAL |
| Observability | save/publish/upload/payment failure visibility | UNKNOWN |
| Compatibility | old Kebu projects survive new releases | UNKNOWN |

## Immediate defects / truth checks

1. Source currently initializes `leftPanelOpen` to `false` and resets it to false when project changes. If production opens the panel automatically, treat this as a deployment/state/runtime regression and reproduce it in Playwright before changing UI code.
2. Existing Builder tests include source-string assertions. They are useful guardrails but are **not proof of behavior**. Add browser-level assertions for P0 journeys.
3. Existing status/backlog documents contain stale contradictions. Never use their IMPLEMENTED label as evidence without current tests/runtime proof.
4. Do not delete old project-specific compatibility code until representative historical projects are fixtures and migrations are proven.

## Release gate

Builder may be called RELEASE-READY only when:
- every P0 journey above has browser-level evidence,
- Supabase/RLS tests prove tenant isolation,
- old project fixtures open/edit/publish,
- offline/reconnect contract passes,
- public output meets defined performance/accessibility budgets,
- no P0/P1 Builder defects are open,
- May Lècor site can be edited and published through the normal product path without special manual database/code intervention.

Shop may be called RELEASE-READY only when the full commerce journey and destruction cases reconcile inventory, order state, payment ledger and analytics.
