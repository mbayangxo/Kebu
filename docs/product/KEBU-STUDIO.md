# Kebu Studio — product specification

**Status:** **IN PROGRESS** — Master law: `docs/product/KEBU-STUDIO-MASTER-SPEC.md`. Canva = quality bar only (`KEBU-STUDIO-CANVA-BLUEPRINT.md`).

**Agent rule:** `.cursor/rules/kebu-account-model.mdc` (Studio placement) · Account model: `docs/product/KEBU-ACCOUNT-MODEL.md`

---

## When assigned — development protocol

1. `docs/product/PRODUCT_RULES.md` — five specs · no fake UI · quality gate  
2. **Master:** `docs/product/KEBU-STUDIO-MASTER-SPEC.md`  
3. **Editor maturity map:** `docs/product/KEBU-STUDIO-CANVA-BLUEPRINT.md`  
4. `docs/reference/canva/PRODUCT-BENCHMARK.md` — **quality reference, not clone**  
5. One vertical slice end-to-end → Design QA → audit → next  

**Forbidden:** fake Generate · fake export · “Build Canva” checklist chrome without persistence · copying Canva UI/assets.

---

## Framing for Cursor

**Wrong:** “Build Canva but African” as a checklist clone.

**Right:** **Kebu Studio** = ambitious **create anything** workspace with **AI built in**, connected to **Builder → Shop → Reach** — one brand pipeline, not export-and-re-upload silos.

Personal Kebu includes **Studio basic** (free). Premium Studio is a **separate monetization line** ($2–5/mo target).

---

## Create anything (target scope)

When built, Studio should support (slice-by-slice):

Social posts · presentations · flyers · posters · logos · pitch decks · business documents · menus · invitations · album artwork · music covers · videos · thumbnails · advertisements · product photography · packaging concepts · brand identities · website graphics · resumes · proposals · …

---

## AI-native creation

Instead of blank canvas only:

> “I need a launch campaign for my new Senegalese skincare company.”

Studio generates **as editable assets**. User edits visually. Output is structured + brand-token aware — not arbitrary uneditable blobs.

---

## Pipeline (differentiator)

```
Kebu Studio → Builder (site) → Shop (products) → Reach (promote)
```

One continuous creation pipeline — sync brand slice-by-slice.

---

## Build discipline

- One vertical slice at a time · end-to-end only  
- **Forbidden:** fake Studio nav · empty canvas · fake AI  

---

## Current repo (honest)

- `/studio` · `/studio/new` · `/studio/templates` · `/studio/[id]`  
- **Through S16:** crop · copy/snap · resize · PDF/ZIP · uploads (**073**)  
- **S8b:** page timeline · video-seek WebM  
- **S8c-lite:** soundtrack · BPM/beat analysis · beat grid · snap scrub · audio sync on play  
- **Architecture:** composition engine contract (`lib/studio/composition.ts`) + video roadmap (`KEBU-STUDIO-VIDEO-ARCHITECTURE.md`) — Quick Edit / Storyboard / Full Timeline **not CapCut-complete yet**  
- **NOT:** full multi-track UI · keyframes · auto captions · live cursors · folders · conversational mutations · full Africa library  

**Next (assign one):** Design editing depth (fonts/brand) **or** Video **V2 Storyboard**. Same ceiling as pros; easier entry.

See: `KEBU-STUDIO-MASTER-SPEC.md` · `KEBU-STUDIO-VIDEO-ARCHITECTURE.md` · `KEBU-STUDIO-CANVA-BLUEPRINT.md`.
