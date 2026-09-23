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


## Flagship acceptance suite — Builder authoring depth

These are user jobs, not UI suggestions. Each must persist, survive refresh/reopen, publish correctly, respect undo/redo, and have browser-level evidence.

### Text authoring
- Click/select text on canvas and write/replace copy directly.
- Change font family from available/project/brand fonts.
- Increase/decrease font size precisely; support typed numeric size where appropriate.
- Change weight, style, line height, letter spacing, alignment, color and text decoration where supported.
- Responsive typography may differ by breakpoint without corrupting other breakpoints.
- Undo/redo text and typography mutations.

### Layers and visual objects
- Bring photo/object forward; send backward; bring to front; send to back.
- Layer ordering is deterministic, visible in Layers, keyboard accessible where applicable, persisted and reflected in public render.
- Duplicate/delete/lock/hide objects without orphaning media references.
- Move/resize/crop/fit/position images; preserve original asset for nondestructive editing.

### Page growth and section insertion
- Insert a section before/after any compatible section, including directly underneath the currently selected section.
- Page height grows naturally; long pages remain scrollable in editor, preview and public render.
- Add/reorder/duplicate/delete/hide sections without giant blank gaps or broken anchors.
- Contextual insertion controls appear near insertion point; users should not need to hunt through unrelated settings.

### Navigation/header composition
- Delete/disable navigation intentionally and restore/add it later.
- Switch navigation layout: horizontal, vertical and supported responsive variants.
- Replace navigation logo.
- Resize logo.
- Align logo left/center/right where layout supports it.
- Adjust header/navigation height, width/padding, background and spacing.
- Navigation links/pages remain structurally valid after layout changes.
- Mobile navigation behavior is separately testable.
- Header changes persist and public render matches preview.

### Animation/motion
- Animate logo, image, text and compatible sections.
- Provide a curated motion system: entrance, exit where relevant, reveal, fade, slide, scale, rotate, parallax/scroll-linked where safe, hover/micro-interaction and timing controls.
- Respect reduced-motion preferences and public performance budgets.
- Motion is represented as structured editable data, not one-off CSS pasted by AI.
- Preview/export/public render should share motion semantics where applicable.

### Offline/destruction behavior
- Disconnect network during text edit, image manipulation, section insertion, undo/redo and save.
- Never claim cloud-saved when only local.
- Preserve local work across refresh/crash to the declared offline contract.
- Reconnect exactly once/idempotently; surface conflicts instead of silently overwriting.
- Undo/redo remains coherent across local queued operations.

## Contextual Builder panel contract

The panel is an inspector, not a settings warehouse.

- Closed by default on editor entry.
- Opens because the user selects a rail tool or editable canvas object.
- Shows only controls relevant to the current selection/task, plus a small predictable path to advanced controls.
- Selecting text prioritizes Content / Typography / Color / Spacing / Effects/Animation — not shop, SEO, pages or unrelated site settings.
- Selecting an image prioritizes Replace / Crop-Fit / Position / Size / Layer / Effects/Animation / Alt text.
- Selecting navigation prioritizes Layout / Logo / Links / Size & spacing / Background / Responsive / Animation.
- Selecting a section prioritizes Content / Layout / Style / Spacing / Background / Animation / Visibility.
- Global tools (Pages, Assets, Design system, Apps/Connections, History) live at the rail/global level rather than being mixed into every object inspector.
- Avoid giant cards and nested card-inside-card layouts. Use compact grouped controls, consistent labels, consistent typography, disclosure for advanced settings and stable control ordering.
- One control owns one concept. Eliminate duplicate SEO/nav/design controls unless there is an intentional scoped/global distinction.
- Inspector width and scroll behavior must not crush the canvas or create nested unusable scroll regions.
- Preserve selection while changing relevant controls; switching unrelated global tools may clear/transition selection intentionally.
- Add visual-regression screenshots for representative Text, Image, Navigation and Section inspector states.

## Shop activation acceptance suite

A site may exist without commerce. Shop activation is an explicit capability transition:

1. User chooses **Activate Shop** for an existing site/business.
2. Kebu creates/enables the commerce configuration idempotently; repeated activation cannot duplicate shop state.
3. User can add products, variants, media, price, stock, collections and merchandising.
4. User can add/configure a Shop page and choose from compatible shop-gallery presentations/design worlds.
5. Shop styling consumes the site's design/brand system while allowing scoped overrides.
6. Preview shows real catalog data; empty catalog is honest.
7. Publish exposes only intended products and correct stock/price.
8. Checkout/order/fulfillment/refund follows the P0 commerce journey.
9. Deactivation must define what happens to public routes, catalog, orders and historical financial records; never delete history accidentally.

## Studio flagship creative-job suite

Studio must support exact destination formats as document presets with current, centrally maintained specifications rather than hard-coded assumptions scattered across components. Presets define canvas size/aspect, safe areas where applicable, duration/media constraints where applicable, export compatibility and template metadata.

Required job families:
- Instagram feed/post, story and reel-oriented creative presets.
- TikTok vertical creative/video presets.
- YouTube thumbnail/channel/banner and video-oriented creative presets.
- Spotify artist/marketing banner/artwork presets where a stable supported destination format exists.
- Flyers and show posters.
- Press kits and media kits.
- Brand decks and pitch decks.
- Lookbooks/catalog-style documents.
- Email graphics and web banners.
- Packaging/artwork documents.
- Logos and reusable brand assets.

Every template remains fully editable: replace/upload photo/video, crop/fit/mask, add/edit text, font/size/color/layout/layers, brand application, save/reopen, duplicate, resize/adapt where supported, export.

### Brand Kit
- Upload/store logos including true alpha transparency.
- Brand colors, fonts, typography roles, imagery/style guidance and reusable brand assets.
- Generate/draft brand-aware creative through the same document/asset engines; generated output remains editable.
- Apply brand kit to new or existing compatible documents with preview/undo.
- Brand permissions/versioning for business/team contexts.

### Photo/image depth
- Nondestructive crop/resize/rotate/flip/fit/fill/position.
- True layer ordering and opacity/blend/effects where supported.
- Background removal creates/stores a real alpha-channel asset.
- Transparent asset round trip test: remove background -> export transparent PNG -> re-import into Studio -> use in Builder -> publish -> inspect pixels/render; no checkerboard/grid may be baked into the image.
- Retouch architecture should support localized masks/adjustments and AI-assisted operations (e.g. blemish/under-eye/object cleanup) without destructively replacing the only original.
- Original asset remains recoverable.

### Export contract
Required baseline exports are evidence-driven by document type:
- PNG, including alpha transparency when requested.
- JPEG/JPG for flattened raster output.
- PDF for supported document layouts.
- Video/audio formats as defined by media projects.

**Adobe Illustrator (.AI) is not a baseline promise until a tested, legally/technically supportable writer exists.** Do not fake `.ai` by renaming SVG/PDF or another format. For editable vector interchange, implement/test SVG and/or PDF first; add AI only when round-trip compatibility is proven against representative Illustrator documents.

Exports must test dimensions, color/alpha behavior, fonts, image fidelity, page count, file validity, re-import where supported, and failure/cancel/retry.

## Acceptance principle

A feature does not pass because its control exists. It passes when a real artifact can be created, saved, reopened, changed, exported/published, and consumed by the destination without corruption.
