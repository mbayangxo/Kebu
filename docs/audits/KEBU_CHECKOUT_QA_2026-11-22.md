# Kebu Code checkout: QA reconciliation

Scope: Kebu-qa only, project `skqnxyaeimvbyrmdfzvk`. No production, DNS, live provider or real-money work.

The hosted read-back found projects, published deployments, products and variants, orders and lines, discounts, gift cards and the payment ledger. It already has the 1–480 order-quantity constraint and the fulfillment function. It lacks the Code workspace, cart-attempt and stock reservation tables and the atomic stock and cancel helpers.

QA batch `kebu_code_checkout_qa_foundation`: restore the existing stock helpers, apply the Code workspace and store attachment, and install the atomic cart and recovery migrations. Keep the existing equivalent quantity constraint in place. Explicitly grant the service role read access to the four workspace columns the signed-checkout review uses. A precondition checks the expected quantity invariant and the existence of the fulfillment function. This QA reconciliation is one migration ledger entry; do not manufacture individual canonical entries.

After schema receipt: confirm grants, RLS and function signatures. Keep hosted acceptance open until a protected preview tied to QA and sandbox credentials are available. Then use two authenticated accounts and one mobile shopper to verify owner approval/revocation, replay-safe purchase, and refund reconciliation. Local test fixtures do not establish provider acceptance.

Applied successfully on November 22, 2026, ledger version `20261122094113`. Submitted SQL SHA-256: `801a0f40182d2965a7e22c2133391d7e3a6ab67875f08f42f3ca28690e3fecff`. The exact SQL passed a local fixture rehearsal before submission. Hosted read-back verified four tables with row-level security, service-role workspace review and checkout RPC access, no anonymous workspace read, and no authenticated shopper access to the internal cart RPC. No production target was modified.
