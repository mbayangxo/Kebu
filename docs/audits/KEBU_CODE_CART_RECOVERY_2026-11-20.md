# Kebu Code commerce prerequisite — checkout recovery and stock

Date: November 20, 2026. Source base: `246027ed3741e1feceaf5d710fc2aa0afc996b26` on `work/kebu-completion-audit-oct13`.

## Milestone and behavior

This completes the local checkout-recovery/variant-stock prerequisite in existing Shop. It does not finish the generic-store app SDK or make Kebu Code a full app-building agent. Generated app checkout, payment/refund integration, points and royalties remain separate work.

| Failure or gap | Source repair |
| --- | --- |
| Reload forgets an uncertain checkout, allowing another order | Persist only the random receipt capability before sending. Block new checkout until recovery resolves it. No form/customer details are saved by this recovery mechanism. |
| Recovery reads “not found” before a delayed checkout saves | Recovery and checkout share the same transaction advisory lock. Recovery records a durable closed-attempt fence if no receipt exists; delayed checkout then fails before any order/stock/credit writes. |
| Missing payment response mistaken for paid or charged again | Return only a minimal saved-order receipt. Never restart payment, reveal a payment URL/customer data, or claim payment succeeded. Offline/backend failures retain uncertainty. |
| Variant stock cannot safely participate in cart checkout | Reserve aggregate product stock and tracked variant stock in the existing order transaction, with sorted locks and durable deduction snapshots. Any failure rolls everything back. |
| Cancellation changes tracking settings or repeats stock returns | Restore only captured quantities once under the existing order lock. Preserve older receipts’ legacy cancellation path with snapshot version 0. Version 1 carts without reservations mean untracked stock and never fall back to inferred restoration. |
| Multi-line cart total over 20 rejected by header constraint | Allow a total of 480 units; individual lines retain the 20-unit cap. Reject duplicate lines whose merged quantity exceeds that cap instead of silently truncating. |
| Client price display imports server payment cryptography | Extract the pure price-label parser; maintain the original server export for compatibility. Both public order components import only the pure module. |

The new recovery endpoint requires same-origin JSON, validates a bounded 256-byte body, uses the published store's project, applies the existing order rate limit, and returns no-store responses. Its random ID is a receipt capability: it must not appear in analytics or shareable URLs. New tables have RLS with no anonymous/authenticated access; RPC execution is service-only. Existing edge/distributed abuse enforcement remains a deployment concern, as for other Shop routes.

## Verification performed

- **37 focused tests pass across nine files**, with zero skipped cases in the explicit acceptance run.
- **Six Chromium cases:** saved receipt across reload and explicit cart clearing; safe empty-attempt closure on desktop; backend failure retaining uncertainty; offline recovery blocked; actual checkout request persists its ID before a lost response and survives reload; blocked storage prevents any checkout request.
- The browser harness mounts the real cart component and data-mode provider, calls the real recovery route, and executes the real recovery SQL against a fresh native PostgreSQL cluster. Only the minimal deployment/database adapter and unrelated endpoints are fixtures. This is not a full Next/Supabase/provider acceptance claim.
- **Five native PostgreSQL concurrency cases:** exact duplicate checkout, recovery waiting for checkout, recovery fencing a delayed checkout, competing orders for the last stock, and duplicate cancellation. Independent sessions use observed `pg_blocking_pids` barriers, not elapsed time as race evidence.
- Embedded SQL additionally verifies rollback after a late item constraint failure, stock/discount/gift-card preservation, variant failure rollback, changed tracking settings, legacy receipts, totals above 20 and ordinary-role denial. These execute the checked-in migrations on a minimal schema fixture, not the entire hosted schema.
- Focused TypeScript and lint pass (existing effect warnings remain in the public order components).
- **Repository gate stages pass:** migration hygiene/foundation manifest, whole-repository TypeScript, ESLint (0 errors, 373 warnings), full tests (495 files passed; 7,205 tests passed and 540 skipped), and the optimized production build including type/page generation. Skipped environment-dependent suites are not acceptance evidence; the dedicated 37-case milestone run has no skips.
- Runtime repair only: the stale shared dependencies caused missing-module errors and the default 2 GB heap exhausted memory. A fresh install from the unchanged lockfile and a 4 GB heap fixed those. The initial CI build then rejected the external node_modules symlink; placing that exact dependency installation inside the workspace allowed the standalone production build to pass. No source package/lockfile changes or suppressed checks were used.
- Mobile recovery screenshot inspected; panel fits the viewport, receipt and payment uncertainty are readable, and completion requires an explicit action. The harness reuses cart CSS but does not certify the full storefront's visual design.

## Repeat the focused acceptance

Supply a local PostgreSQL binary directory, an extracted Chromium executable, and an installed PGlite package directory. The native helper creates and removes a fresh loopback-only cluster; an optional supplied database URL must also be loopback. Do not use production credentials.

```sh
FONTCONFIG_PATH=/tmp/fonts \
KEBU_CART_POSTGRES_BIN=/path/to/postgres/bin \
KEBU_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium \
KEBU_LOCAL_PGLITE_ROOT=/path/to/node_modules/@electric-sql/pglite \
node_modules/.bin/vitest run \
  tests/shop/cart-atomic.local.test.ts tests/shop/cart-order.test.ts \
  tests/shop/cart-recovery-route.test.ts tests/shop/cart-recovery-storage.test.ts \
  tests/shop/cart-recovery-concurrency.native.local.test.ts \
  tests/shop/cart-recovery-browser.local.test.ts \
  tests/shop/fulfillment-checkout.test.ts tests/shop/gift-cards.test.ts \
  tests/shop/gift-order.test.ts
```

## Release and next milestone

The forward migration `20261120202038_shop_cart_recovery.sql` depends on the prior cart transaction and existing Shop/variant prerequisites. It has not been applied to hosted QA or production. Keep Code-generated apps from calling privileged checkout until their separate scopes/SDK contract is built and verified.

Cancellation remains stock bookkeeping: it neither transfers money nor reverses discount/gift-credit/payment ledgers. The next commerce milestone must implement provider-verified payment/refund transitions and audited credit offsets before adding loyalty or creator earnings. Payment-link recovery and ordinary-account full-app/provider acceptance remain open. No YANMAY app, hosted migration, deployment, provider activation, purchase or real transfer occurred here.
