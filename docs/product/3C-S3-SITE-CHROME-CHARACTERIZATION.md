# 3C S3 — Site chrome: characterization of 3B behavior and the canonical KCD semantic

**Date:** 2026-09-29 · **Scope:** read-only characterization of how the universal header/footer ("site chrome") is
produced in the three 3B surfaces, then the canonical rule KCD adopts. No 3B behavior is changed by S3.
**Source line:** `creative-core/3c` (3B builder code identical to the frozen `phase3b/tested-freeze`).

## 0. The three surfaces

| Surface | Entry point | Definition builder | Renderer |
|---|---|---|---|
| **Editor** (Builder canvas; desktop inline, tablet/phone iframe `?embed=1` fed by `postMessage`) | `app/create/[id]/page.tsx` | `buildEditorPreviewDefinition(project, pages, sections, siteChrome)` (`lib/create/editor-definition.ts`) | `SiteRenderer` (`mode="preview"`, `editor.editDevice`) |
| **Preview** (standalone `/create/[id]/preview`, the "Preview" button / journey step) | `app/create/[id]/preview/page.tsx` | `buildDefinitionFromProjectParts(project, pages, sections)` — **no chrome** | `SiteRenderer` (`mode="preview"`) |
| **Published / Live** | Publish: `goLiveWebsiteProject` → `buildSnapshotFromDb` (`lib/create/persist-site.ts`); Live: `loadPublicDeployment` → `/sites/[subdomain]` | `applySiteChromeToDefinition(base, chrome)` at publish; stored as a `website-v1` snapshot in `deployments.snapshot` | `SiteRenderer` (`mode="live"`) on the stored snapshot |

`SiteRenderer` itself never reads `site_chrome`: chrome exists only if the definition it receives contains the synthetic
`kebu-chrome-header` / `kebu-chrome-footer` sections. (`MaylecorMotionChrome` / `MaylecorSiteFooter` are a different
mechanism — derived from the flagship motion-hero section's own props, not from `site_chrome` — and are identical in all
three surfaces.)

## 1–10. Behavior per surface

| # | Question | Editor | Preview (standalone) | Published / Live |
|---|---|---|---|---|
| 1 | **Authority** | `projects.site_chrome` (in-memory copy, saved via `PATCH /site-chrome`; also written when a `navigation`/`footer` row is added or patched) | `project_sections` navigation/footer **rows** only; `site_chrome` ignored | `projects.site_chrome` at publish time, frozen into the snapshot; live reads only the snapshot |
| 2 | **Insertion** | `useChrome = chrome.enabled && !projectUsesEmbeddedNav(all section types)`; if so navigation/footer rows are stripped (`stripChromeSections`) and header/footer sections injected on **every page** (`composePageSectionsWithChrome`) | none — rows rendered where stored | `applySiteChromeToDefinition(base, chrome)` when `chrome.enabled` — **no embedded-nav check**; strips rows, injects on every page |
| 3 | **Ordering** | header first, footer last on every device (`orderSectionsForDevice` pins the synthetic ids) | rows in `sort_order` (a nav row is wherever it is stored) | same as Editor (snapshot carries the synthetic ids; pinned at render) |
| 4 | **Visibility** | `props.hidden`, page `hiddenSections` (may list `kebu-chrome-*`), no section-level `visibility` on chrome | rows' own `hidden` / `_visibility` / layouts | same as Editor |
| 5 | **Device** | chrome props may carry `deviceOverrides` (navigation/footer schemas include it); merged per device by the renderer; one DOM | row overrides | same as Editor (single DOM, per-device CSS plan) |
| 6 | **Page-specific** | identical header/footer on every page; per-page hide via page layouts | per-page rows (non-embedded templates: nav rows on every page for 81, home page only for 4, none for 37) | same as Editor |
| 7 | **Disagreement** (`site_chrome` vs rows) | `site_chrome` wins; rows kept but not rendered | rows win; `site_chrome` edits (header panel) are **not** reflected — Preview can show a stale menu | `site_chrome` wins |
| 8 | **Missing** | `GET /api/projects/[id]` runs `loadOrBootstrapSiteChrome`: if not enabled/no parts and no embedded nav, **writes** chrome derived from the home page's nav/footer rows, else defaults. Embedded nav → none | nothing added (the same GET bootstraps the DB, but Preview does not render it) | `buildSnapshotFromDb` runs the same bootstrap (writes) if stored chrome is not enabled |
| 9 | **Identity** | synthetic `kebu-chrome-header` / `kebu-chrome-footer`; selecting them edits `site_chrome` | row UUIDs | synthetic ids baked into the snapshot |
| 10 | **Dependence** | — | — | see §11 |

## 11. Measured on the corpus (126 templates as stored after 3B's own chrome bootstrap)

| Comparison (every page × Desktop/Tablet/Phone composition) | Differs |
|---|---|
| Editor vs Published | **0 / 126** templates |
| Editor vs standalone Preview | **122 / 126** templates (every non-embedded template) |

- Owner sites: **May Lecor** and **K-Direction** embed their own navigation → no site chrome anywhere; identical in all
  three surfaces. **DkLNS** and **Ndaoan House** (header only), **RECT** and **For The Mayjor Good** (header + footer) use
  site chrome → Editor = Published; standalone Preview shows the stored rows instead.
- 37 templates have no navigation rows at all: Editor and Published show the (default or bootstrapped) site header;
  standalone Preview shows **no header**.

**The one Editor ≠ Published case (reachable, but only through inconsistent state):** a project whose sections embed
navigation (May Lecor, K-Direction flagships) **and** whose stored `site_chrome` is enabled with a header/footer.
Editor: no universal chrome. Published: universal header + footer injected around the flagship layout.
It is reachable today through side doors that set `enabled: true` without the embedded-nav check:
- **Shop → Pages panel** (`app/components/shop/shop-pages-panel.tsx`): `GET /site-chrome` returns *default* chrome when
  the stored value is `{}`, so the panel always believes the site uses chrome (its flagship-hero menu branch is
  unreachable) and saving the menu `PATCH`es an enabled header/footer into `site_chrome`;
- adding or patching a `navigation`/`footer` section (`app/api/projects/[id]/sections/route.ts`).
Verified on the corpus: May Lecor + enabled chrome → Editor `legally-blonde-hero`; Published
`navigation*, legally-blonde-hero, footer*`. Whether any **production** project is in this state cannot be checked
from here (no production access); the May Lecor owner site is the most plausible candidate (its menu is edited from the
Shop Pages panel).

## A. Intended 3B product semantics

One universal header/footer, stored once (`projects.site_chrome`), applied to **every page** when enabled, header first
and footer last on every device, page layouts may hide them per device, and it **replaces** stored navigation/footer
sections — **except** on flagship layouts that embed their own navigation, which never get universal chrome.
Evidence: migration 065 ("Universal header … applied to every page when enabled"), `projectUsesEmbeddedNav` ("Flagship
layouts embed their own nav — skip universal chrome"), the Editor (the surface where the owner designs the site) and
the Builder hides the chrome controls on those sites; `SiteRenderer`'s flagship shells (`maylecorOnly`,
`legallyBlondeOnly`) assume the page contains only the flagship section, which injected chrome breaks.

## B. Implementation accidents

1. **Standalone Preview ignores site chrome** (it predates W13 and was never updated): it shows stored rows, stale menus,
   and no header on 37 templates — it does not preview what visitors see.
2. **Publish has no embedded-nav check**, and the Shop Pages panel / section routes can enable chrome on embedded-nav
   sites — together they produce the Editor ≠ Published case.
3. **Bootstrap writes on read** (`GET` and publish mutate `site_chrome`) — a side effect of loading, not a render rule.
4. The Builder's chrome *panel* uses a stricter "chrome active" test than its own canvas (also treats the
   `portfolio:maylecor` / `portfolio:kdirection` descriptions as embedded), so if a flagship section were removed the
   canvas would show a header the panel does not offer to edit. UI only; out of S3 scope (S8 inspector).

## C. Would converging change what anyone sees?

- **Editor:** no — the canonical rule *is* the Editor's rule.
- **Published sites:** no existing snapshot changes (see D). A future **kcd-1** publication equals today's publication
  for every project **except** the side-door conflict state above, where the universal header/footer would no longer
  be injected. That is a visible change to a live site → **not decided in S3**: KCD reports the state explicitly
  (`site_chrome` conflict issue) and the kcd-1 publish preflight (S7) must block it until an owner decision resolves the
  stored state (e.g. disable the stored chrome, or remove the embedded flagship section). No behavior is silently chosen.
- **Standalone Preview (3B):** unchanged in S3. On the KCD path (per-project flag) Preview shows the canonical result —
  i.e. exactly the Editor/Published result — which is the invariant you set; it is not a new appearance for any site
  (it is what the site already looks like live).

## D. Legacy website-v1 snapshots

Snapshots are self-contained: chrome is baked in as ordinary sections with the synthetic ids (or, before migration 065,
as stored rows); live never reads `site_chrome`. They keep rendering through today's `SiteRenderer` unchanged — the
compatibility renderer needs no chrome logic. kcd-1 publications use the canonical rule. The two never mix.

## Canonical KCD rule (implemented in S3)

```
SOURCE OF TRUTH      projects.site_chrome  →  document.meta.siteChrome (stored value, verbatim; the only copy)
APPLIES              parsed enabled ∧ (header ∨ footer) ∧ no embedded-nav flagship section in the document
PAGE PROJECTION      pure function of (source, page) at render time — never stored, never an op target:
                       header (id kebu-chrome-header) first, footer (kebu-chrome-footer) last, on every page;
                       stored navigation/footer sections on that page are suppressed (kept, not rendered)
ORDER / VISIBILITY   3B device composition, unchanged (pinned; page layouts may hide the synthetic ids)
CONFLICT             stored chrome enabled ∧ embedded nav → explicit document issue; editor/preview render the rule;
                     kcd-1 publish blocked (S7) until resolved
MISSING              no chrome rendered; the 3B bootstrap stays an explicit load-time write (S5 wiring), not a render
                     side effect
```

**Revision of S2 interpretation 5.** S2 represented chrome as one stored node copy per page (with write-back that
refused disagreeing copies). Those copies were editable by node operations — duplicated content guarded only at
write-back. S3 removes them: the document holds the single source; pages get a render-time projection. There is
nothing to diverge, and chrome edits keep going to the one source (today `PATCH /site-chrome`; the KCD edit path is S5).

## 12. Finding during S3 gates — 3B cannot publish multi-page sites that use site chrome

`buildSnapshotFromDb` injects the chrome into **every page** with the same synthetic ids, and `goLiveWebsiteProject`
then runs `validateWebsiteDefinition`, which rejects any section id repeated **across the whole definition**. Result:
`{ ok: false, error: "Site failed validation before go-live.", detail: "Duplicate section id: kebu-chrome-header" }`
for every site with ≥ 2 pages and applicable site chrome.

Reproduced with the real `goLiveWebsiteProject` (in-memory tables, no network): fashion-atelier (4 pages), DkLNS (8),
RECT (5), For The Mayjor Good (8) → refused; fashion-atelier home page alone → published; May Lecor (13 pages, embedded
navigation, no chrome) → published. On the corpus: **231** of the stored-template cases are refused for this reason.
The existing multi-page publish test (`tests/create/multipage-publish.test.ts`) covers only the embedded-navigation
case, so the defect is untested. Whether production users are affected depends on production data (not checked:
no production access); every multi-page non-flagship site would be.

This is a defect in the frozen 3B release, not a semantic question; S3 does not change 3B. The canonical KCD rule is
unaffected (the projection is not stored, so there is nothing to duplicate), and kcd-1 publishing (S7) does not validate
through website-v1. The live byte-identity gate compares these sites against what 3B's publish composes before the
refusal. **A 3B fix needs a separate, explicitly approved change** (e.g. make the duplicate check per page, or skip the
synthetic chrome ids) — recommended before any further 3B release.
