# Handoff to Claude Code — device preview accuracy + Builder panel density

Written by the Cowork session (no live/Supabase network access from its sandbox — code-only audit).
You have live access to run the app and click through it — please verify everything below visually,
including the fixes already committed (see "Already fixed this round" at the bottom) before building
on top of them.

Pull latest first: `git log --oneline -5` should show `Fix real TS/runtime bugs found while auditing
the Builder...` as HEAD (or later). If you're starting from patches instead of a shared remote, make
sure patches 0007–0009 are applied before starting this work, so you're not duplicating any of it.

---

## 1. Device preview (desktop/tablet/mobile toggle) doesn't visibly change ordinary sections

**Reported symptom:** switching the desktop/tablet/phone toggle above the Builder canvas does
nothing visible — the founder tested this specifically on the May Lécor (Maylecor) project.

**Two separate causes found — don't conflate them:**

### 1a. Maylecor's hero/cutout canvas — likely correct as-is, not a bug

`app/components/create/legally-blonde-layout.tsx` (the actual flagship canvas renderer behind
May Lécor's "Russian-style" hero — see `docs/reference/kebu/MAY-LECOR-BUILDER.notes.md`, which
states "May Lecor = `legally-blonde-hero` + `portfolio:maylecor`") renders its hero via
`app/components/create/scaled-artboard.tsx`, always at a fixed `designWidth={1200}`. `ScaledArtboard`
uses a CSS `transform: scale()` to fit that fixed 1200px design into whatever container width it's
given — so switching device DOES change the container width, but the composition itself (cutout
positions, city skyline, everything) is always the same design, just visually shrunk. No separate
mobile layout exists for this canvas anywhere in the codebase (`grep -n "mobile" legally-blonde-layout.tsx`
returns nothing inside the hero code).

This is very likely intentional and matches how the original Tilda/Russian reference site behaved —
those fixed-canvas "poster" style artist sites are typically scale-only by design, not responsively
redesigned per breakpoint. **Do not change this without the founder confirming they actually want a
distinct mobile composition** (different cutout crop/positions on phone vs desktop) — that's a design
decision, not a bug. The founder is sending the original reference site URL separately; once you have
it, compare its actual mobile scroll/parallax behavior against what's implemented now before deciding
whether this needs a real fix or is already correct.

### 1b. Ordinary sections (nav, footer, product grids, etc.) — this IS a real bug

`app/components/create/builder-editable-preview.tsx` renders the live canvas directly as plain DOM
(confirmed: no `<iframe>` anywhere in that file). Meanwhile `app/components/create/site-renderer.tsx`
(the component that actually renders each section type) uses ordinary Tailwind responsive utility
classes throughout — e.g. `SiteNav`'s desktop links are `hidden items-center sm:flex` and its
hamburger button is `sm:hidden` (site-renderer.tsx ~L575, ~L588).

Tailwind's `sm:`/`md:`/`lg:` breakpoints are `@media` queries keyed to the **real browser viewport
width**, not the width of a containing `<div>`. In `app/create/[id]/page.tsx` (~L3807–3889), switching
device correctly changes the *outer frame's* `maxWidth` (via `BUILDER_DEVICE_FRAME[device]`,
~L3839), but everything rendered inside that frame is still checking the actual browser window size —
so on a normal desktop monitor, the "mobile" preview frame shrinks visually but the nav bar inside it
never actually switches to its hamburger variant, grids don't collapse columns, etc. That's the "nothing
happened" the founder is seeing, and it'll reproduce on any project that isn't a fixed-canvas flagship
template (i.e. anything using ordinary section types, not just Maylecor).

**Proposed fix** (matches how Shopify's theme editor / Webflow / Framer do accurate device preview):
render the canvas inside a **same-origin `<iframe>`** sized to the exact target device width. An
iframe has its own independent viewport, so CSS media queries inside it respond to the iframe's own
width, not the parent page's — this is the standard, correct fix for "preview at a different screen
size while sitting inside one real browser window."

**Why this needs care (please verify each step live, not just read the diff):**

- The iframe's `document` needs the app's compiled Tailwind CSS. Two reasonable approaches: (a) give
  the iframe a `src` pointing at a dedicated internal preview route that renders `BuilderEditablePreview`
  standalone with its own `<head>` styles, or (b) clone the parent document's `<link>`/`<style>` tags
  into the iframe's document on mount. Prefer (a) if there's already a public/preview rendering path
  that doesn't require the full Builder chrome — check `app/sites/[subdomain]` or similar public
  rendering routes first; reusing that is safer than building a second CSS-injection path.
- **The riskiest part**: today's click-to-select-a-section, drag-to-reorder, inline text editing, and
  image-drop-to-replace all assume direct same-document DOM access (`onClick` handlers, refs, native
  drag events wired directly in `site-renderer.tsx`/`builder-editable-preview.tsx`). Once that markup
  lives inside an iframe, none of the parent page's event handlers fire on it directly — you'll need a
  `postMessage` bridge (iframe → parent: "user clicked section X"; parent → iframe: "select section X",
  "apply this content patch") or mount a second, fully independent editor tree inside the iframe fed by
  serializable props/callbacks. This is the part most likely to silently half-break editing if rushed.
- **Recommended sequencing**: ship read-only accurate-width preview first (no editing interactions
  inside the iframe yet — just confirm a mobile preview of an ordinary site visually matches a real
  phone: hamburger appears, desktop nav links disappear, grids collapse). Verify that visually across
  desktop/tablet/mobile on a real (non-flagship) project. Only after that's confirmed working, wire
  click-to-select/drag/inline-edit back in across the iframe boundary, testing each interaction
  individually as you go (don't ship all-at-once).
- Also check `app/create/[id]/page.tsx`'s "Fullscreen edit" mode (~L4108–4184) — it reuses the same
  `device` state and `BuilderEditablePreview` component, so it should pick up whatever fix you build
  here, but verify it explicitly since it's a separate render path (own `<div>` wrapper, not the main
  canvas section).

**Acceptance criteria (verify live):**
1. Open a non-flagship Kebu site (not Maylecor/K-Direction/Legally Blonde) that has a `navigation`
   section. Switch device to Mobile in the Builder — the nav should visibly switch to its hamburger
   button, matching a real phone. Switch back to Desktop — links should reappear.
2. Confirm every existing editing interaction (select section by click, drag-reorder in the section
   list, inline text edit, image drag-drop) still works identically after the change, at all three
   device sizes.
3. Confirm the fullscreen-edit mode's device toggle shows the same accurate behavior.
4. Leave Maylecor's `ScaledArtboard`-based hero alone unless the founder confirms (after reviewing the
   original reference site) that they want a genuinely different mobile composition, not just a scaled
   one.

---

## 2. Builder panels look too "boxy" — compact them like Shopify's theme editor

The founder is comparing Kebu's Builder against Shopify's theme editor / theme store screenshots and
wants the panel organization to feel like Shopify's: compact rows, accordion sections, only one panel
group open at a time ("exclusive open panels"), and a clear highlight on whatever is currently
selected. See `docs/reference/shopify/PRODUCT-BENCHMARK-FROM-VIDEO.md` — it already states the goal
precisely: *"organization · accordion density · exclusive open panels — not a visual Shopify clone."*

**What's already good (use as the reference for "compact" in this codebase — don't rebuild these):**
- `app/components/create/builder-section-list-dnd.tsx` — the left-rail section list. Small icon
  thumbnails, thin rows, expand/collapse chevron for nested blocks, real keyboard support (drag +
  arrow-key reorder via dnd-kit, plus explicit ↑/↓ buttons). This is already Shopify-shaped.
- `app/components/create/add-section-picker.tsx` — the "+ Add section" dropdown. Compact rows with
  icon + label + one-line hint, category tabs, chevron. (I just added click-outside-to-close and
  Escape-to-close to this one this round — previously it only closed via the toggle button or picking
  an item, so it stayed open over the canvas after clicking elsewhere. Already committed — verify it
  live.)

**What to check (I couldn't identify the exact offending panel without a live screenshot):**
1. Ask the founder for (or take yourself) a screenshot/recording of the specific Kebu Builder panel
   that looks too boxy — don't guess and restyle the wrong thing.
2. Strong candidate: the **section settings/property panel** that opens after clicking a section on
   the canvas (in `app/create/[id]/page.tsx`, look for `<SidebarDetails>` usage around L3800 and
   wherever per-section property editors — color pickers, text fields, toggles — are laid out). If
   each property group renders as a large bordered/padded card rather than a compact accordion row,
   that's almost certainly what's being described.
3. Also check `app/components/create/builder-panel-section.tsx` directly — if it's the shared wrapper
   for property-editor groups, that's the single place to fix panel density project-wide rather than
   patching each panel individually.
4. **"Exclusive open panels"**: confirm that opening one section's settings (or one nav accordion
   group) automatically closes any other currently-open one, matching Shopify. Note:
   `app/components/kebu-nav-shell.tsx`'s `NavLink` component currently gives each top-level nav item
   its own independent `open` state — multiple nav groups CAN be open at once today. I fixed a Rules-
   of-Hooks bug in that same function this round (useState was being called conditionally — now
   unconditional), but did NOT change the independent-open-state behavior since it wasn't reported as
   broken; decide with the founder whether exclusive-open should apply there too, or just to the
   Builder's own section/property panels.
5. **Selection highlight consistency**: `app/components/create/site-renderer.tsx` (~L182) already
   gives a selected section a blue canvas outline (`outline-2 outline-[#2C6ECB]`). Verify the
   left-rail section-list row for that same section highlights in sync (it should, via
   `selectedSectionId` in `builder-section-list-dnd.tsx`, but confirm live) — canvas selection and
   list selection should never visually disagree about what's selected.
6. When you find and fix the actual "big box" panel, match the density of the two "already good"
   components above rather than inventing a new visual language.

---

## Already fixed this round (please verify live, not just re-read the diff)

Committed as `Fix real TS/runtime bugs found while auditing the Builder: ReferenceError, dropped
button style, broken hook, a11y gap` plus one follow-up commit adding the Add Section picker's
outside-click dismissal. None of these were visually verified live (no network access to the
Supabase-backed app from this sandbox) — please click through each one for real:

- `app/components/create/site-renderer.tsx` — `SiteNav`'s `navScale` prop was declared in its type
  and passed by every caller, but missing from the actual destructuring, so `navScale ?? 1` at the
  nav-resize-handle call site threw a real `ReferenceError` and crashed the header. **Verify:** open
  the nav size/style editor in the Builder and drag the resize handle at the bottom of the header —
  it should not crash.
- `app/components/shop/shop-orders-panel.tsx` — the "Cancel order" button had two `style={...}` props
  on one JSX tag (invalid JSX); the duplicate silently dropped the intended red destructive-action
  color. **Verify:** open Shop admin → Orders, confirm "Cancel" renders in red/warning styling.
- `app/create/[id]/page.tsx` — `queueSiteSettingsSave` was rebuilding the site's `commerce` settings
  from only two fields instead of the full object before saving. Hardened via `mergeSiteCommerce()`.
  **Verify:** set several payment toggles in Shop admin → Payments, then go change something unrelated
  in the Builder (favicon, meta title) and save — confirm the payment toggles are still intact
  afterward.
- `app/components/kebu-nav-shell.tsx` — `NavLink` called `useState` conditionally (real ESLint error,
  Rules of Hooks violation). Fixed by hoisting the hook unconditionally. **Verify:** the nav sidebar
  with expandable groups (Sales channels-style children) still expands/collapses correctly and
  doesn't warn in the console.
- `app/components/create/email-flows-panel.tsx` — an email-flow step's expand/collapse header was a
  plain `<div onClick>` with no keyboard affordance. Added `role="button"`, `tabIndex`, `aria-expanded`,
  Enter/Space handling. **Verify:** Tab to a flow step header and press Enter/Space — it should expand.
- `app/components/create/add-section-picker.tsx` — the "+ Add section" dropdown now closes on
  click-outside and Escape.

`npx tsc --noEmit` and `npm run lint` are both clean (0 errors) as of this commit — worth re-running
after your changes to keep them that way. The production build could not be verified end-to-end from
this sandbox (blocked from fetching Google Fonts during build, an environment restriction, not a code
issue) — worth a full `npm run build` on your end before calling any of this done.
