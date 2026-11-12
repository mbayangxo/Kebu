# Builder responsive image persistence — October 20

Scope: preserve image width, height, crop and position through the existing Builder, canonical operations, SQL, responsive preview, history and publish. This is not full May or Builder completion.

## Reconciliation

The isolated branch contains both original Studio checkpoints and all authoritative Claude work through signed commit `6d070c80d3dc34d34676bb7451558ac5ac1f230e`, merged at `37c0557f0d584694e19fceca3e0317893154f9f6`. Its exact tree `74464a22b5d0a3bc9a0160313806ba9848bd1994` was reconstructed and verified locally. Original stale workspaces and the original history bundle remain untouched. The checkout has independent Git metadata; original author, signature and commit bytes were preserved. CLI GitHub fetch remains unavailable; connected GitHub reads verified the authoritative head and exact tree. No successful CLI continuity check is claimed.

## Root causes and repairs

- The canonical section schema discarded width/height/crop. Register optional bounded maps without defaults, including validation in tablet/mobile bags, so historical published payloads are unchanged when read.
- The embedded responsive preview had no collage selection or patch callbacks. Forward validated same-origin, exact-frame events to the existing parent editor callbacks; restrict section commands to the current page, synchronize element selection back into the frame, and retain the canonical save/error/permissions pipeline.
- The SQL collage registry still allowed only six historical override keys. The actual migrated SQL test reproduced `KCD_INVALID: layerWidthScale cannot be set per device`. A CLI-generated additive migration aligns this one type's allowlist with the existing editor registry while preserving historical keys. No authored data, ownership policy or RPC contract changes.
- The shared SQL fixture assumed every response was committed, hiding SQL rejection behind a TypeError. It now surfaces refusal before reading versions.
- Three unrelated new migrations used version `20261020000000`. Preserve Mail's file/version and give the two documented-unapplied AI migrations unique versions `20261020001000` and `20261020002000`; update exact test/harness/docs references. Their SQL bodies are unchanged.
- Browser tests use the actual Size accordion and the real responsive iframe. Fullscreen phone drawers close through Done before header history/publish actions; no forced clicks, test-only product APIs or relaxed assertions.

## Executed verification

- Full combined `NODE_OPTIONS=--max-old-space-size=6144 npm run ci`: exit 0; TypeScript passes, lint 0 errors/346 warnings, 6,255 tests pass/286 explicit skips, finalized build generates 226 pages. Standard CI does not run environment-gated SQL/browser cases.
- Focused schema and frame-event validation: 26 passing cases, including malformed command kinds that must not execute coercion.
- Renamed Yande/Liguey actual SQL cases: 11 pass.
- Responsive registry and image operation SQL regression: 1 pass, including tablet/mobile writes and registry parity.
- Actual `/create/{id}` backed by migrated isolated PostgreSQL: 3 cases pass on desktop/tablet/phone with zero skips/failures. Inspector width/height/crop → SQL → Undo/Redo → reload; keyboard move originates in the canvas/iframe, persists and travels through history; publish creates one real local deployment row. No legacy writes or page exceptions. Cleanup confirms stopped server/tests, removed sandbox and restored config. Screenshots inspected.
- Migration hygiene: 88 unique canonical versions.
- Broader actual Builder/3J browser/performance regression: **44 pass, zero skips/failures**, including all nine unchanged 100/500/2000-node desktop/tablet/phone performance probes. Cleanup passes. Fresh remote checks remain pending.

## Open acceptance

Visible crop/hit bounds and corner-resize geometry remain unfinished. Height currently preserves the existing source-stretch meaning rather than becoming a new frame model. Screenshot inspection also exposes broken legacy remote social icons, duplicate normalized navigation entries and media with baked backgrounds; these are recorded defects, not accepted May art direction. Full 14-page cinematic/reference fidelity, rich Studio inline formatting, provider-backed journeys, hosted owner/Auth/RLS/storage, the remaining 3J/99 groups and production release remain open. Local loopback transports are explicitly development fixtures, not hosted account certification. No production migration, DNS, production promotion or external email occurred.
