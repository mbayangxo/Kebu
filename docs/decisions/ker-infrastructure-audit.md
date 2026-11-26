# KËR infrastructure reconciliation

Tracks [issue #25](https://github.com/mbayangxo/Kebu/issues/25). The supplied roadmap names 20 workstreams with six slices each. This reconciliation records the existing interfaces and QA schema where confirmed, plus outstanding integration. Presence in code or schema does not provide KËR acceptance credit.

| Workstream | Reuse and coordination | Remaining integration |
| --- | --- | --- |
| 1. Platform foundation | Projects, Kebu identity and team roles; #24 verified retail location and staff/device flows | Scope supermarket capabilities to projects and roles |
| 2. KEBU Studio | Studio folders, uploads, design versions and campaign projects | Install and publish a supermarket template |
| 3. Product intelligence | Catalog and variants; coordinate recipe and ingredient contracts with #24 | Source and version food attributes and verify shopper filters |
| 4. KËR storefront | Shop collections, product sections and published snapshots | Merchant collection integrity, interactive aisles and cart integration |
| 5. Seller marketplace | Seller trust, shop companies and procurement | Seller approval, scoped catalog and multi-seller offers |
| 6. Commerce and payments | Checkout, reservations, payments ledger and refunds; coordinate physical checkout with #24 | Wholesale pricing, seller allocation and sandbox settlement |
| 7. Inventory and fulfillment | Stock, purchase orders, fulfillment; #24 replenishment | Allocation and transfers across warehouse locations |
| 8. Delivery infrastructure | Delivery settings, shipping options, corridors and carrier adapters | Shared assignment, exceptions and proof of delivery |
| 9. Membership engine | Kebu identity, shop customer profiles and subscriptions | Cross-business entitlements and revocation |
| 10. Customer intelligence | Customer profiles, purchase history and wishlists | Purpose-specific preference consent and revocation |
| 11. YANDE shopping AI | Yande integration and metering | Ground shopping responses in current catalog facts and consent |
| 12. Optional loyalty and discovery | Discounts and gift cards; coordinate #24 rewards and recommendations | Merchant opt-in, rewards ledger and discovery controls |
| 13. KËR Invent | #24 submissions, creator mode and invention workflow | Customer submissions, voting and review acceptance |
| 14. IP and ownership | Studio permissions and versions; coordinate #24 creator rights and royalties | Confidential vault and three ownership arrangements |
| 15. Manufacturing infrastructure | Recipe ingredient data; coordinate #24 formulation and manufacturing | Versioned specs, co-packer access, batch traceability and release |
| 16. KËR Business | Business dashboards and team roles | Tenant-scoped supermarket operations in the merchant workspace |
| 17. Brand development | Studio brand kits, campaigns and uploads | Product photography and packaging workflows |
| 18. KËR Discovery and Weekly Chops | Collections, publishing and Studio campaigns | Rotating shelves, exhibitions and live shopping |
| 19. Profitability and operations | Shop expenses, analytics and #24 economics | Multi-seller margin controls and executive reporting |
| 20. Launch and verification | Existing CI and Playwright | Cross-role QA acceptance and no-code installation |

Issue #24 links SQL and browser evidence for retail locations and staff/devices. Later shared work needs acceptance on its source branch and integration evidence for KËR. Keep PostgreSQL constraints and transactions at the data boundary, Supabase transport in server adapters, and hosting-provider controls outside commerce logic so TAKK Base and TAKK Cloud can replace their respective integrations separately.
