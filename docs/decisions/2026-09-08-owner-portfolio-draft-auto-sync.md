# ADR: Owner portfolio drafts auto-sync from seed

**Date:** 2026-09-08  
**Status:** Accepted

## Problem

May Lecor (and other `owner_portfolio` sites) are **not** public aesthetics. Edits in Cursor update the **code seed**, but the DB draft stayed old until a manual upgrade/publish — confusing the owner.

## Decision

1. Still **not** listed in the public Aesthetic store.  
2. On every **draft load** (`GET /api/projects/[id]`), run portfolio seed sync (`ensureProjectPagesBeforePublish` / May upgrade).  
3. `MAYLECOR_SEED_REVISION` — when bumped, stock hero layers (cutouts, city, logos) refresh into the **draft**. User Storage uploads are preserved.  
4. **Publish** still required only to update the **live** public site. Draft preview / editor always shows the synced draft.

## Freeform mobile

Phone preview can store independent layout in `deviceOverrides.mobile` for cutout heroes (`extraCutouts`, `layerScales`, etc.) — freeform mobile without changing desktop.
