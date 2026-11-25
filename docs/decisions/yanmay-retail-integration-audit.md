# YANMAY retail integration audit

Tracks [issue #24](https://github.com/mbayangxo/Kebu/issues/24). Reviewed branch baseline `777dd9e`. The branch contains order-economics and replenishment calculations with unit tests. Neither is wired into a retail workflow at this baseline.

| Slices | Reuse in KEBU | Integration and acceptance needed |
| --- | --- | --- |
| 02–03 | Kebu Business, active business memberships, team invitations | Business-scoped physical locations, store assignments, device enrollment and revocation. Verify tenant and location isolation. Grant retail capabilities explicitly. The generic manager helper also admits creative roles. |
| 04–06 | Shop projects, product variants, stock and cart orders | Link store menus to catalog products, persist immutable recipe and order snapshots, and verify tablet staff and kiosk customer journeys using distinct permissions. |
| 07–09 | Server-side checkout and existing payment adapters | Verify location tax, card-present authorization and signed event replay in the provider sandbox. Reverse ATM needs an approved provider/device contract and an authorized fallback with reconciliation. |
| 10–13 | Order records, fulfillment notifications, shop analytics and offline queue | Add station routing, pickup states, auditable payment refunds and register reconciliation. The existing refund action updates order state in the database. Verify external refund settlement separately. Verify reconnect and retry with stable order keys. |
| 14–16 | Shopper accounts, purchase history, public reviews and review requests | Reuse Kebu identity. Add a loyalty ledger and verify purchase eligibility server-side for reviews. The public review submission schema accepts reviewer contact details and carries no order proof. |
| 17–18 | Business events and public registration | Connect invitation eligibility and tasting attendance to authenticated customers. Verify that invitations are scoped and cannot be reused by another customer. |
| 19–20 | Business document storage and Kebu discovery patterns | Add scoped source records, provenance and ingredient version history. Verify access control and persistence from the running application. |

For data changes, use Kebu-qa with synthetic tenants, test accounts and server-side authorization checks. Verify allowed and denied access through the application and database. Capture provider sandbox events and preserve physical hardware acceptance for the final release gate. Keep production deployments and migrations outside this milestone.

Baseline command: `npm test -- tests/yanmay/order-economics.test.ts tests/inventory/replenishment.test.ts tests/shop/cart-order.test.ts tests/shop/place-order.test.ts`. All 18 tests passed. The checkout browser smoke only checks that the published shop renders. It requires a configured shop and supplies no retail checkout acceptance evidence.
