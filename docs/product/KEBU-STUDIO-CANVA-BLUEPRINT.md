# Kebu Studio — Canva maturity blueprint (not a clone)

**Status:** Living product architect output · **2026-09-07**  
**References:** `docs/reference/canva/PRODUCT-BENCHMARK.md` · `docs/product/KEBU-STUDIO.md` · screenshots still **NOT STARTED** in `docs/reference/canva/`  
**Law:** Compete on **workflow completeness + Africa pipeline** (Builder → Shop → Reach). Do **not** pixel-clone Canva or ship fake chrome.

---

## 1. What Canva is (reverse-engineered)

Canva is a **professional browser creative OS**, not “AI prompt → preview.”

### Core loop

```
Discover → Pick size / template → Edit on canvas → Manage assets →
Collaborate → Autosave → Export / publish / reuse
```

### Surfaces

| Surface | Job |
|---------|-----|
| **Home** | Your designs · create blank (sizes) · templates · folders · search |
| **Template gallery** | Browse / filter / preview → open editable design |
| **Editor shell** | Left tools · center canvas · right properties · top actions |
| **Brand** | Logos, colors, fonts tied to identity |
| **Export** | PNG / PDF / video / share / publish |
| **Team** | Invite · roles · comments (live cursors = later) |

### Editor maturity bar (from dossier)

Persistent shell · layers · pages · typography · media · undo/redo · shortcuts · zoom/pan · select/resize/align/group/duplicate · templates · uploads · autosave · export · AI **on top of** a real project model.

---

## 2. Kebu differentiation (must not lose)

| Canva-like | Kebu must exceed |
|------------|------------------|
| Export file | **Builder** theme / site graphics |
| Download | **Shop** product image |
| Share link | **Reach** tracked promote (`/r/…`) |
| Generic brand kit | **Kebu ID** business brand |
| Global templates | Africa-first commerce formats (WhatsApp status, markets, flyers) |

---

## 3. Information architecture (target)

```
/studio                    Home — library · create · shared · AI history
/studio/new                Create — Blank sizes | AI campaign | → templates
/studio/templates          Gallery — filter · search · open
/studio/[id]               Editor — Canva-class shell
/reach                     Promote links from Studio creatives
```

---

## 4. Screen inventory

| Screen | Exists | Gap |
|--------|--------|-----|
| Studio home library | Partial | No search / rename / duplicate / delete UI |
| Create blank (sizes) | ❌ | `/studio/new` is AI-only |
| Template gallery | ✅ | Keep expanding catalog |
| Editor | ✅ strong | Crop, snap, copy/paste, PDF, folders still open |
| Brand kit panel | ✅ | Deeper kit library later |
| Share & roles | ✅ S9a | No live cursors |
| Video layer + motion | ✅ S8a | First-frame export fixed in **S8b** |
| Page timeline | ✅ **S8b** | Multi-track audio / keyframes still open |
| Reach promote | ✅ S10a | No paid ads |

---

## 5. User journeys (must stay end-to-end)

1. **Blank:** Home → Create blank (IG post) → edit text → autosave → reload  
2. **Template:** Gallery → open → edit → PNG  
3. **AI pack:** Prompt → 2–3 designs → edit → Shop / Reach  
4. **Collab:** Invite editor → they open Shared → save  
5. **Promote:** Share → Reach link → real clicks  

---

## 6. Feature inventory vs Canva (honest)

### Done (keep hardening)

Canvas layers · multi-page · pan · multi-select · align/group · upload image/video · undo/redo · zoom · autosave · PNG · motion WebM · templates · AI · brand kit · Shop export · share roles · Reach link  

### Next slices (ordered — one at a time)

| ID | Slice | Why (Canva parity) |
|----|-------|---------------------|
| **S11** | **Create & Library OS** — blank sizes · duplicate · rename · delete · search | ✅ Canva **home** |
| **S12a** | **Image craft** — flip · object-fit · replace | ✅ |
| **S12b** | Image crop (source window + PNG export) | ✅ |
| **S13** | **Editor power** — copy/paste · snap guides · Nudge arrows | ✅ |
| **S14** | **Resize design** — change artboard / format keep layers | ✅ |
| **S15** | **Export pack** — PDF · ZIP multi-page PNG | ✅ |
| **S16** | **Uploads library** — reusable assets across designs | ✅ (apply **073**) |
| **S17** | **Folders / collections** | Home organization |
| **S18** | **Version history** | Restore prior canvas |
| **S19** | **Elements pack** — icons / lines / frames (structured) | Elements tab depth |
| **S20** | **Comments** (async) | Collab without CRDT |
| S8b | **Page timeline** — durations · playhead · video-seek WebM | ✅ First CapCut-class slice |
| **S8c-lite** | **Music analysis + beat grid** — soundtrack · BPM · markers · snap | ✅ |
| **Composition** | Multi-track / storyboard **schema** (`lib/studio/composition.ts`) | ✅ Architecture — not CapCut UI |
| S8c / V2+ | Storyboard · Quick Edit · multi-track UI · keyframes | ❌ Per `KEBU-STUDIO-VIDEO-ARCHITECTURE.md` |
| S9b | Realtime cursors | Figma class — later |

**Framing:** full creative studio (Design · Image · Video · Audio · AI · Brand · Publish) — not Canva+CapCut frankenstein. Same project: Quick Edit → Full Timeline.

---

## 7. Data model (current + S11)

**Existing:** `create_designs` · `studio_generation_runs` · `studio_design_collaborators` · brand kit tables · Reach campaigns  

**S11:** no new tables — duplicate/rename/delete via `create_designs` APIs  

**Later:** `studio_folders` · `studio_assets` · `studio_design_versions`  

---

## 8. Permissions

| Role | Library | Edit | Share | Delete | Duplicate |
|------|---------|------|-------|--------|-----------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ (new owned copy) |
| Editor | Shared list | ✅ | ❌ | ❌ | ✅ → own copy |
| Viewer | Shared list | ❌ | ❌ | ❌ | ✅ → own copy |

---

## 9. States (every surface)

Loading · empty · error · success · offline/retry · unauthorized · migration-missing (503 honest)

---

## 10. Testing requirements

Unit: presets · duplicate title rules · access  
API/integration when available  
Manual: blank create → edit → refresh · duplicate · delete · search  

---

## 11. Build rule

**One vertical slice → Design QA → adversarial audit → next.**  
S11–S16 are implemented end-to-end (library · craft · crop · copy/snap · resize · PDF/ZIP · uploads). Full Canva surface area (folders, brand lock, realtime cursors, magic expand, etc.) remains later — this blueprint is the honest map.
