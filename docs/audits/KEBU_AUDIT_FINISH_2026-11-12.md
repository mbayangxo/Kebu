# KEBU audit fixes — November 12, 2026

Source base: Claude's integration `4caf70f82a399f26b005972eaad9d5751ee9756f`. Local changes in the older closeout worktree were preserved. Claude's separate Cloud verification commit `63cc76a5136c27292ed084447300799aefaa2940` is incorporated and its script corrected: cookie isolation alone does not establish CSRF safety.

## Changes

- Sheets/Slides require a body revision. Conditional updates and insert-only first saves reject stale/concurrent writers with 409; missing revisions get 428. Editors pause writes, retain local edits and offer JSON recovery plus explicit reload. Body load failures cannot masquerade as empty documents. Title changes use optional conditional revisions; unchanged titles do not overwrite a rename elsewhere.
- Cloud refuses direct internal serving paths and mismatched hosts, derives storage keys from deployment/version identity, scopes version lookup to its deployment, strips session headers from rewrites, and uses an opaque-origin sandbox CSP and no-store responses. The Cloud dashboard discloses that uploaded static sites have restricted forms, popups, browser storage and frames. A forward migration constrains version prefixes and live-version ownership.
- Notifications refresh on open, expose load/retry failures, confirm individual read updates, recover failed bulk reads, and close on Escape.
- Rooms expose member addition through public Kebu ID lookup and existing RLS, link business email invitations separately, copy access-controlled room links, and link calendar events to real calls. Copying a URL does not grant membership.
- Calls support rejoin and microphone-only entry, show local screen preview and simultaneous remote camera/project tiles, and use private signaling with participant-scoped policies. Channel removal is detached before asynchronous unsubscribe to avoid recursive leave callbacks; unmount uses the current leave handler.
- Public broadcasts clean up a created listing when media connection fails; a failed cleanup is reported honestly with recovery instructions.
- Docs bootstrap one durable Yjs history atomically before joining private, epoch-scoped channels. The seed explicitly targets the editor's `default` XML fragment. State and content save together, stale conflicting saves do not blindly retry, old-client writes invalidate the old history, and conflicts pause live mode. Formatting-only edits now persist and are included in local recovery. Original text, simultaneous initialization, two-user convergence, undo/redo, and solo fallback are exercised by browser tests.

## Verification

Receipts: `docs/audits/evidence/finish-nov12/`. Browser fixtures use local authenticated identities, real APIs and PGlite SQL/RLS. Docs/Calls use a Realtime protocol fixture; Calls use real WebRTC/media with Chromium's loopback-candidate testing flag. This is local acceptance, not hosted provider acceptance.

- Sheets and notification browser: 5 passing, including two-tab stale-save recovery and read-update failure.
- Slides browser: 4 passing, including persistence and stranger denial.
- Calls browser: 4 passing, including real media, screen sharing, and rejoin with microphone only.
- Docs browser: 4 passing, including original text retention, concurrent initialization, undo/redo, formatting-only persistence after reload, and protection of recovered unsynced drafts.
- Cloud browser policy script: passing cookie isolation and real API rejection of opaque sandbox Origin. Static page content is a fixture with the actual serving CSP; it is not a hosted uploaded deployment.
- SQL access/ownership: 24 passing across Library, Cloud, and Realtime authorization.
- Focused route/work/live checks: 96 passing; broadcast cleanup has three explicit failure/success cases.
- Full unit suite: 7,182 passing / 507 environment skips / zero failures. Typecheck and production build pass. Lint: zero errors / 368 warnings. These skips are not hosted acceptance. See `evidence/finish-nov12/summary.json`.

## Release boundaries

Four new migrations are source-only, not applied to any hosted database. Private Docs/Calls channels require those policies before hosted operation. Existing hosted Realtime policy/configuration and live two-account/provider flows still require acceptance. Calls remain an eight-person mesh. Sharing uses a separately negotiated video sender so viewers can see the person and project together; this adds media bandwidth while sharing.

`www.maylecor.com` resolves to the shared KEBU Vercel project and currently returns 402 `DEPLOYMENT_DISABLED`. Automatic approval review rejected unpausing that shared production project because it would restore all attached domains and cited the earlier deployment hold. No workaround, payment, plan change, domain reassignment, deployment, or hosted migration was performed. The user's requested May launch remains blocked on clarification of shared-project restoration approval and subsequent live verification. Source integration does not make the site publicly ready.

Automatic Git deployment is disabled for this work branch and the integration branch. This source checkpoint is not certification of every KEBU feature or the entire platform.
