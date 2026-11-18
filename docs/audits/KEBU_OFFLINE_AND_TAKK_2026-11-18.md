# Offline and release audit — November 18, 2026

The app service worker previously stored successful account, Builder, dashboard and business HTML by URL, without a signed-in account boundary. The replacement purges the old cache on activation, fetches these pages from the network without HTTP cache reuse, and shows a neutral reconnect message offline. Static bundles still cache. Draft queues, IndexedDB and the separate published-site worker are unchanged. The offline banner now cancels its reconnect timer if connectivity drops again.

| Area | Evidence and next acceptance |
| --- | --- |
| Builder | Local queue exists. Verify editing while disconnected, reload/recovery, logout and same-device account switch, two-device conflict, and reconnect retries without duplicate changes. |
| Studio | Local design/video drafts and asset outbox exist. Verify reload, storage exhaustion, asset retry, and account isolation on a shared phone. |
| Docs, Sheets, Slides | Full offline editing is unverified. Verify recoverable local drafts and conflict handling before promising it. |
| Shop and payments | Verify pending order intent versus confirmed sale, duplicate prevention and stock/price revalidation. Payment and payout confirmation must come from the server/provider. |
| Business, Liguey, Live Rooms | Verify no sensitive staff/applicant pages remain readable offline, and explain when interviews, calls and gifts require connectivity. |
| Published sites | Audit separate site worker, freshness and tenant boundaries. Test slow mobile load as well as offline fallback. |

Prioritize a real-browser shared-device check, then airplane-mode draft/reconnect/duplicate/conflict checks on mobile. Record local-only, pending and server-confirmed states separately. This audit does not certify full offline support.

Starter remains $2 per upgraded website per month. No billing rules or quotas changed.

Vercel still reported the shared Kebu project disabled after an unpause attempt; the exact account reset timestamp was unavailable. The existing domain aliases were left in place. The development checkpoint does not deploy to production.

TAKK is separate from Kebu Cloud. Prior handoffs report substantial automated and browser testing, but the accessible `mbayangxo/TAKK` repository is empty, so those results cannot be independently rerun from that repo. Recover and back up the actual source checkpoint first. Then use isolated staging to accept a real authorized Builder export, HTTPS activation, database/runtime telemetry, update/rollback, worker recovery, backup/restore and hosting-security review. No live Railway preview was verified.
