# May Lècor reference recreation acceptance — OPEN

Observed October 17, 2026 UTC through the signed-in production Kebu UI. This is a capability investigation, not completion evidence.

## Required outcome

A normal user must be able to create, customize, save and preview the reference's layout and scroll behavior using Kebu's product controls. Editing a pre-seeded portfolio site or writing a bespoke renderer does not prove this outcome. Preserve May's existing pages and photographs. Do not publish without approval.

## Actual observations

- Owner login succeeded. Six portfolio sites are visible. May's existing project is `c11f9749-2d33-46d1-9649-8d762db4ce25`.
- Home draft editor shows pink collage, May portraits, circular name and skyline. The prior turn saved the corrected accented artist name and introduction; this investigation made no further persisted content changes.
- Opening the actual saved-draft Preview and selecting HOME shows Russian text/artwork and a different composition, without the editor's May portraits in the inspected initial viewport. MOBILE preview also displays clipped desktop navigation, Russian artwork, large white areas and skyline/checkerboard imagery. This fails editor/preview parity; mobile mode here is Kebu's preview toggle, not an independent physical-phone test.
- The draft preview confirms the corrected artist name in navigation/footer. Saving text is insufficient proof of layout fidelity.
- Normal Create site > Start from an aesthetic > Music & labels loads five designs: Artist dark stage, Music label — roster, Musician — Press kit (EPK), Musicien, Streaming launch. No reference collage design appears among these choices. The gallery initially remained loading across multiple observations before eventually loading; it is not permanently broken.
- Import my website and Build with code are explicitly labelled COMING SOON. No new generic site was created as a substitute for the requested design.
- One canvas drag attempt left the cutout style unchanged. Clicking the portrait exposed section settings and skyline selection. This is an inconclusive interaction observation, not a confirmed root cause or a successful drag test.
- `https://ksendrdesign.ru/legallyblonderu` returns the site-served page “402 Please renew your subscription.” Exact contemporary reference comparison and scroll sampling are BLOCKED. Archived layer metadata in the repository is historical material, not a verified current visual/behavior baseline.

## Source investigation (not a fix)

`app/components/create/legally-blonde-layout.tsx` uses `LegallyBlondeEditCanvas` for editing but separate generated hero/scroll layer lists for preview. The animated non-editor path renders `LEGALLY_BLONDE_LAYERS.scroll`, including historical Russian text. This explains a strong parity-risk boundary; no source patch or regression gate is claimed here.

## Acceptance still required

1. Obtain a working reference or a full desktop/mobile recording showing initial state and successive scroll positions.
2. Repair editor/preview rendering parity, preserving saved user photo positions, size, stacking, typography and links.
3. Expose reusable collage/layout/motion controls through ordinary creation, without exposing May's private photos or brand as a public template.
4. Recreate May's draft through those controls. Verify save, reload, Undo/Redo, page navigation and mobile behavior.
5. Compare matched viewport sizes and scroll positions against the reference. Keep exact-match acceptance OPEN until that comparison passes.

No push, deployment, production configuration, migration or publish action was performed during the hosted investigation. Browser screenshot captured at `/workspace/scratch/may-preview-parity-failure-oct17.jpg` is transient evidence; the text findings above are the durable repository record.

## Subsequent local repairs (not deployed)

- Removed the separate historical Tilda scene renderer from the visitor path. Editing, draft preview and published rendering now share the saved collage canvas. Historical layer metadata/assets remain in the repository; no production site data was rewritten.
- Visitor rendering preserves positions, dimensions, crop, opacity, rotation, stacking, titles and cutout links without exposing editing controls. Explicitly removed photos stay removed. Keyboard focus selects overlapping cutouts.
- Shared chrome uses container width rather than the desktop browser width for responsive navigation. The outer site renderer no longer duplicates the embedded home navigation.
- Parallax uses a real viewport-sized pinned scene and scroll track. The listener binds to the actual scrolling container or window, excluding body/root pseudo-scroll containers. Motion-off and reduced-motion users receive a static composition.
- Extra cutouts honor their saved foreground/background drift role; the inspector now offers those movement options. Story-photo and album-mockup slots render in the shared scene.
- Added **Cutout collage** to the normal Add section catalog. Its public defaults contain no May or Russian imagery, private brand menu, or fabricated social links. Existing historical showcase/May seed defaults are preserved separately. The owner restore control only appears for existing May-logo compositions.
- React review covered read-only interaction boundaries, listener cleanup, consistent rendering, and accessible keyboard selection. No release or exact-reference acceptance is implied.

## Local validation boundaries

- Four new render regression tests passed: saved geometry/links/May imagery, removed layers, public defaults without private imagery, unsafe legacy link suppression.
- Five actual-component browser cases passed with zero skips/failures: keyboard movement → explicit fixture save → preview → reload; 375px frame inside desktop viewport; scroll transform and motion-off; normal Add section picker; 390px phone and reduced-motion. The fixture uses localStorage explicitly, **not hosted SQL/auth evidence**.
- Existing actual Builder operation gate: 10 passed / 9 explicitly disabled optional timing probes; save/Undo/Redo/reload/device overrides/conflicts/pages remained green.
- The first browser launch failed because an old local Chromium binary was incomplete. Re-extracting the already-installed package to a new local path repaired the runner. Later browser failures caught overlapping-layer focus and an incorrect scroll target; both were repaired and rerun.
- Initial CI caught an unintended historical-default replacement; it was corrected by keeping the historical default function and introducing a separate public collage default. Final typecheck and lint passed (zero errors / 345 warnings); Vitest passed 5,947 tests / 168 explicit skips. The CI chain reached build but its generated Turbopack persistence cache was invalid. Removing only `.next` and rerunning the build succeeded (221 pages). A final independent typecheck and 22 focused tests passed after the last source adjustment. The initial CI exit remains recorded as 1, with the clean build separately recorded as exit 0.

## Still open

The exact Russian composition, timing, many-layer transitions and responsive reference cannot be certified from descriptions or archived metadata alone. Personal Context search confirmed earlier discussion but did not recover a usable recording/file identifier. The current reference URL remains unavailable. The existing skyline/figure source images have baked collage/checkerboard artifacts; rendering fixes do not clean those pixels. Clean approved cutouts, reference comparison, a full ordinary-account hosted creation/persistence journey, and release approval remain outstanding. Missing AI-provider configuration is unchanged.
