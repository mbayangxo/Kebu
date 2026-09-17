# Kebu Builder — UX Standard Audit (September 2026)

Read-only audit of the Builder (`app/create/[id]/page.tsx`, `app/components/create/*`, `lib/create/design-worlds/*`) against `docs/product/KEBU-BUILDER-UX-STANDARD.md`. Nothing in this document has been fixed yet — it is the punch list, ranked by real-world impact, to work from next.

No code changes were made as part of this audit. Findings are grouped by the standard's own sections.

---

## P0 — Fake/dead functionality (violates the standard's "most important rule" directly)

1. **"Save draft" button does nothing.** `builder-studio-chrome.tsx:305-315` renders a "Save draft" button wired to `onSaveDraft`. Its handler in `page.tsx:1075-1079` calls no persistence function at all — in the only branch where it does anything (`idle`/`saved`) it just re-sets state to `"saved"`; in the branches where a user would actually want it (`"queued"` or `"error"`, i.e. a failed/pending save) it does **nothing**, not even a retry. This is the exact "fake button that does nothing" pattern §Core Principle and §2 prohibit, sitting on the single most trust-critical action in a website builder.

2. **No "unsaved changes" state exists at all.** The `saveState` type (`page.tsx:111`) is only `idle | saving | saved | queued | error` — there is no `unsaved`. Between a keystroke and the 500ms autosave debounce firing, the save indicator (`page.tsx:1032-1041`) still shows the previous state (typically "Draft saved"), actively lying to the user that everything is persisted while an edit sits only in memory. §7 requires the user to always know whether changes are saved/saving/unsaved/failed; one of the four required states is structurally missing.

3. **No leave-page guard.** Zero matches for `beforeunload` anywhere in `/app`. Closing the tab, refreshing, or navigating away during the 500ms debounce window — or while `saveState` is `queued`/`error` — silently discards the edit with no warning. §7 explicitly requires "if the user attempts to leave with unsaved changes, handle that intentionally."

4. **Gallery sections vanish entirely on live sites with no images.** `site-renderer.tsx:1879-1881` filters gallery `items` down to ones with a non-empty `src`; if every item is empty (true for most existing design-world templates — see below), the whole section returns `null` on the published site. Not a placeholder, not an empty state — the section disappears, misrepresenting the template's own structure to a visitor. The "Empty slot / Drop photo here" UI only renders in the editor, never live.

## P0 — Templates ship with essentially no imagery (§6)

Sampled 12 of the ~20 design-world files (both the four newest — CLARTÉ, NUÉE, NUANCE, MERIDIAN FILMS — and eight older ones: fashion, barbershop, real-estate, agriculture, restaurant-table, tech, portfolio, music). **Every image slot in every sampled file is an empty string.** This is systemic, not something only the newest templates missed.

- Product cards with an empty `imageUrl` render a flat gray "No image" box (`site-renderer.tsx:1614, 1631-1638`) — literally the "empty rectangle" §6 prohibits.
- No documented platform policy excuses this: `AGENTS.md` and the global-access/core-architecture docs only mention low-bandwidth framing for Search result cards, not "ship templates with zero images." `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md` explicitly expects "editorial photography, lookbooks, campaign imagery" and "room imagery, lifestyle" — so this is a gap against Kebu's own pre-existing spec, not a new problem introduced by the standard.
- Copy quality is the opposite story and should be treated as the reference bar: real product names, real FCFA/naira prices, specific benefit claims, no Lorem-ipsum filler anywhere sampled.
- Open question to resolve before fixing: is there an actual image pipeline (Supabase storage / AI generation) templates are meant to call, or does "author uploads later" only make sense for merchant-authored sites and not for stock templates whose entire job is to show a finished look before anyone uploads anything? This needs an answer before populating images at scale.

## P1 — Panels, drawers, modals & layering (§3-4)

- **No panel anywhere implements the required CLOSED/OPENING/OPEN/CLOSING state model** — every one audited is a plain boolean toggle with no transition state.
- **No shared z-index scale.** Values found scattered across at least 10 magnitudes: `z-10/20/30/40/50`, `z-[55/60/80/85/90/100/120/130/200/201]`, plus inline `zIndex: 3/5/9999/10/12/14/30/40/50/99999`. No `Z_LAYERS` constant exists. Two unrelated overlays (`site-renderer.tsx:443` desktop dropdown backdrop and `:599` mobile drawer backdrop) both hard-code `z-40` with nothing preventing both being open at once — stacking order falls back to DOM order instead of intent, a real click-interception risk.
- **Mega-nav dropdown has no way to close on touch.** `maylecor-motion-chrome.tsx:259-330` opens on `mouseEnter`/click but relies on `mouseLeave` to close — on touch devices that event never fires, so once opened by tap the menu is genuinely stuck open (no outside-click, no Escape). This is the standard's "effectively impossible to close" failure mode, live today.
- **"Upload new aesthetic" modal backdrop doesn't dismiss on click.** `upload-aesthetic-button.tsx:96-176` renders a full backdrop but only wires the Cancel button — no outside-click, no Escape. Single point of failure if that button is ever hidden or mis-styled.
- **Duplicate, divergent "Ask Yande"/site-command-bar implementations.** `page.tsx:3976-4186` inlines one AI panel (no Escape handler); `builder-site-command-bar.tsx` is a separate, more complete version of the same feature that is never imported anywhere — dead code with its own z-index scheme, own (incomplete) dismissal rules, and a different panel width (360px) than the live 280px sidebar.
- Lower-severity: `add-section-picker.tsx` has no Escape/outside-click either, though as an inline (non-overlay) panel the risk is lower.

## P1 — Component architecture (§8)

- `page.tsx` is 4,277 lines: 39 `useState` hooks, 21 inline handler functions covering section CRUD, billing/payment orchestration, subdomain validation, autosave/debounce, and an AI-preview workflow, plus 19 hand-written inline `fetch()` calls with repeated boilerplate — none of it extracted into hooks or a service layer, despite `app/hooks/` already establishing that convention elsewhere in the repo (`use-kebu-account-context.ts`, etc.).
- `site-renderer.tsx` is 2,708 lines and, separately from the animation work already scoped to 4 design worlds, contains several non-trivial components defined inline (`QuizSection`, `SiteNav`, `NavResizeHandle`, `EditableText`) that are natural candidates for their own files.
- A default-theme color literal (`#0F0D33` / `#E9006B` / `#FAFAF8` / `Fraunces`) is hardcoded independently in at least 9 places (`page.tsx`, `site-aesthetics.ts`, `mayjor-good-site.ts`, and 6 component files) instead of one shared constant.
- `site-renderer.tsx:1844-1845` reimplements WhatsApp-link building inline for the `whatsapp` section type, dropping the empty-phone fallback that the existing shared helper `whatsAppOrderHref()` (`site-commerce.ts:124-125`) already handles correctly and that the same file already imports and uses elsewhere.

## P2 — Visual density (§5)

Overall the Builder chrome is disciplined (compact 280px rail, 10-12px labels, `py-1.5/2` controls) — this is narrower than a full sweep suggests, but four real instances:

- `nav-links-editor.tsx:106,177` — every nav link, and every dropdown sub-item inside it, gets its own bordered card (a card nested inside a card for sub-items), inconsistent with the flat divider-row pattern used everywhere else in the sidebar.
- `builder-popup-panel.tsx:27,51` — wraps its content in a second bordered/rounded-2xl container even though it's already rendered inside an `EditorAccordion` that supplies its own chrome — a frame-within-a-frame for a handful of fields.
- `builder-shop-panel.tsx:240-259` — two same-weight dark CTAs ("Manage →" and "Full shop admin") stacked ~20px apart for overlapping destinations, reading as competing rather than primary/secondary.
- `builder-site-command-bar.tsx:86` — 360px panel width vs. the 280px primary rail; a second, uncoordinated width scale (moot if this dead file is removed per the P1 duplication finding above).

## P2 — Performance (§9)

- **Zero code-splitting anywhere in the Builder** — no `next/dynamic`/`React.lazy` usage across `app/create/` or `app/components/create/`; the full ~4,277-line page plus ~40 imported panels and the 2,708-line renderer all load eagerly on first paint regardless of which sidebar tab is active.
- **Over-fetch on load.** `app/api/projects/[id]/route.ts:47-78` fetches `project_pages` and `project_sections` for the *entire* project on every Builder load, unfiltered by the page currently being edited — column lists are explicit (good), but row scope isn't bounded to what's on screen.
- **Full site definition rebuilt unmemoized on every render.** `page.tsx:976-990` calls `buildEditorPreviewDefinition(...)` directly in the render body (not `useMemo`), which itself maps/filters *all* pages' sections every call; `site-renderer.tsx` has zero `useMemo`/`useCallback`/`memo` usage anywhere despite running several non-trivial helpers per section per render.
- **Inconsistent image lazy-loading.** Only 2 of 12 `<img>` tags in `site-renderer.tsx` carry `loading="lazy"`; the rest — including clearly below-the-fold gallery images — are eager-loaded, with no `next/image`, no `srcset`/`sizes`.
- Sequential (non-parallel) fetch waterfall on initial load (`page.tsx:194-274`) adds avoidable latency.

## What's already working and should not be re-built

- Autosave itself (500ms debounce → real Supabase `PATCH` calls) is genuinely wired, not fake.
- Error handling on save failure is real: network failures fall back to a working offline queue (`lib/create/offline-queue.ts`, auto-flushed on the `online` event); HTTP failures set a visible error state with a red `role="alert"` banner and field-level issue hints.
- Copy quality across design-world templates is strong and should be the bar the imagery work is held to.

---

### Suggested next step

Given the P0 items are concentrated and concrete (2 dead-end save-button/state bugs, 1 missing browser guard, 1 template-imagery gap), the fastest path to closing the biggest trust gaps is: fix the save-state machine and `beforeunload` guard first (small, isolated, high-impact), then decide the imagery sourcing question before touching any of the ~20 template files at once.
