# Hosted readback — 2026-10-22

Read-only database and actual browser observations. No editor save, publish, delete, production migration, ownership/access change or DNS operation occurred.

The existing production browser session can navigate My Sites and retains its owner-filtered draft after reload. This is old-production authenticated navigation/read evidence only. It does not execute the recovery source's 26 hosted acceptance cases or cross-user RLS checks. The generic artist draft visible there is a different project/owner from the published portfolio. Different ownership does not establish whether team/support editing is authorized.

The published maylecor project (c11f9749-2d33-46d1-9649-8d762db4ce25), updated 2026-10-17T04:15:23.507328Z, has 13 saved pages: music, home, photos, videos, mays-world, shop, updates, about, press, audio, maygazine, may-by-may, mayjor-good. Home and music both have sort_order 1; no ordering repair was performed. Preserve all page IDs, authored content and assets; a five-page fixture is not this portfolio.

## Editing hazard

Production source 71815f99c50022482e545e22e1f6e040ee1cafe4 invokes ensureProjectPagesBeforePublish during project GET and may reseed the saved draft merely by opening the editor. The actual portfolio editor was therefore not opened. Recovery source removes that behavior, but requires schema reconciliation and hosted acceptance before rollout. Capture a private backup by read-only SQL before editing; do not change owner/access to bypass authorization.

## Public visual observations

The browser opened https://www.maylecor.com/ and showed Russian hero reference text, a visible baked checkerboard around a city cutout, clipped pink title/navigation and a large unpainted region in the initial viewport. Six social links point to the homepage. These are current production observations, not proof of correction in the recovery preview. The requested Russian reference returned HTTP 402; no usable full recording was recovered. No source pixels or faces were changed.

Production remains READY on dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2 / 71815f99c50022482e545e22e1f6e040ee1cafe4. Read-only preflight still finds missing shared-Yande reservation/interaction prerequisites and permissive legacy usage writes; broader native schema reconciliation remains open. No blind migration push or ledger repair is authorized.
