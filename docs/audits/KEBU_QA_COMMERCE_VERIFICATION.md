# Kebu QA commerce verification

QA only, November 5, 2026 (New York). Supabase recorded the seven reviewed commerce migrations as one batch, version `20261106025153`, named `kebu_qa_commerce_fulfillment_approved_batch`. The source files remain individually versioned. Reconcile QA's batch ledger against those seven files before a future CLI push; do not blindly replay them or mark unrelated migrations as applied.

The first smoke test found that hosted checkout routines referenced missing reservation columns. The approved additive repair was recorded as `20261106025421`. The hosted rerun used synthetic fixtures in a rolled-back subtransaction, and exercised atomic checkout replay, real database reservation, simulated payment confirmation and replay, fulfillment progression, grant checks, seller balance (9,500 XOF), refund and refund replay (final payable balance zero). No orders, projects, auth users, reservations or ledger events remained.

This verifies database behavior. It does not verify hosted browser flows, provider webhooks or real settlement. Production was not modified.
