# Payment-gated digital delivery

Root cause: order placement creates download links before payment, random tokens do not deduplicate purchases, and a best-effort counter permits simultaneous downloads beyond the limit. QA has no private digital-files bucket.

Decision: snapshot each purchased digital file and its limits on the order item inside checkout. When an order becomes paid, create one entitlement per order/product in the same transaction, covering single products, carts and full gift credit. Existing unsnapshotted orders and legacy tokens require explicit reconciliation; never guess their purchased files. An unpaid, cancelled, demo or refunded order cannot issue or redeem an entitlement. Catalog edits cannot replace a purchased file snapshot.

Delivery: a private durable email queue is part of each entitlement. An authenticated cron claims a bounded batch under a lease and sends the same email with a stable provider idempotency key. Failed sends retry within the provider's 24-hour deduplication window; ambiguous sends older than 23 hours require review rather than risk duplicate mail. A missing recipient remains visibly undeliverable, and a gift goes to its recorded recipient. No emails are sent during synthetic tests.

Redemption: validate payment and token, prepare a 60-second private Storage URL, then atomically recheck current payment, expiry and quota while locking the order and entitlement. Await successful quota consumption before redirecting. A Storage signing failure consumes no quota. Download responses prohibit caching/referrer leakage. Already-issued Storage URLs retain their documented lifetime after a refund.

Completion: actual PostgreSQL tests for paid/unpaid/mixed tender, cart lines, snapshots, refunds, expiry/quota, role denials, queue leases and replay. Hosted rollback assertions and browser/API checks distinguish SQL and fixture verification from a genuine signed-in Storage/email/provider journey. Full CI must pass. Apply only to Kebu-qa; do not deploy or change production.
