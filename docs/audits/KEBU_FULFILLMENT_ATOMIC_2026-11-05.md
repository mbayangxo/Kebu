# Fulfillment checkout consistency — November 5, 2026

**Source repair candidate, not hosted or whole-product completion.** Preserve all retained requirements and the existing full-scope register.

## Reproduced failure and repair

Previously `createCartOrder` saved a shop order and then called a best-effort fulfillment insert. Missing-table errors and exceptions were swallowed; the operations queue could also return a healthy empty result for a missing table. The fulfillment record could disappear while the original order remained. This was not durable recovery.

The Joko fulfillment path now calls a service-role-only, security-invoker SQL function. Its order insert and fulfillment insert run in the same transaction. Any failure rolls back both, before checkout returns an order for payment initiation. Self-fulfilled checkout keeps its existing path. There is no fallback from an unavailable RPC to the old unsafe insert. The SQL validates project, active shipping option, shipping fee and the existing goods-only commission formula against a locked current option; concurrent option changes require refreshing checkout.

The function takes only an allowlist of server-generated checkout fields and quotes identifiers. Omitted fields use actual table defaults. Anonymous users and authenticated sellers cannot call it or write fulfillment rows. Customer payment state cannot be supplied through this function. Same-order-id replay compares the stored order and fulfillment snapshot and never resets a human's status/note or reprices historical commission. This is **not** request-wide cart idempotency: a new submission with a new id remains a new order.

Reads no longer interpret missing schema as an empty queue. The admin page now has distinct loading, error/retry and verified-empty states. Server checkout failures emit an error category without logging customer data or credentials.

## Observed checks

- Actual migration SQL in disposable PGlite 0.5.10: eight cases pass, zero skips. Covers both-row commit, rollback for missing fulfillment table and post-order write failure, retry preserving human progress/original rate, price changes, cross-project rejection, gift fields/defaults, unsupported fields, caller permissions and refusal to invent a legacy record.
- Combined focused gate: 24 tests passed, zero failed/skipped, including existing fulfillment RLS and cart tests. Evidence: `evidence/closeout-nov05/fulfillment-focused.json`.
- Full local `npm run ci`: passed TypeScript, lint (zero errors; 359 warnings at that run, before the final changed-file lint cleanup), 6,907 tests passed / 473 explicit environment skips, and production build. Final changed-file lint has zero errors/warnings; TypeScript recheck passed. New native PostgreSQL chained journey is pending remote execution; never infer success from a test being added. The native journey now uses this actual SQL checkout before duplicate payment confirmation, balance, delivery, unauthorized writes and refund checks. Its fixture still substitutes `commit_shop_checkout`; it does not verify real stock/gift-card reservation or provider settlement.
- Prior reviewed checkpoint `96a68c69` passed required CI, Studio, generation and platform workflows before this runtime repair. Those results do not certify this new runtime.

## Release and recovery prerequisites

1. Restore access to the designated QA project, `skqnxyaeimvbyrmdfzvk`. Apply/review the forward migration there under the existing hosted-write approval process before releasing this application version. The function and matching application change ship together; without the function, pickup/delivery checkout deliberately stops. No hosted migration has been applied by this work.
2. On existing QA data, verify checkout, actual Auth/RLS sessions, ordinary admin queue, refresh, failure messages, payment integration and seller accounting. Fixture SQL is not managed Supabase Auth/PostgREST or browser acceptance. Full existing provider/stock/gift-card requirements remain open.
3. Inspect legacy orders separately. A missing row contains no trustworthy historical commission snapshot. A current shipping option may have changed or been deleted. Do not backfill using today's rate or label such a gap automatically reconciled. Match original checkout/provider records and operator evidence; an authorized operator can insert a confirmed missing row without overwriting any existing fulfillment record. Live reconciliation has not occurred.
4. Restore the authorized Vercel preview path. Do not promote production, buy capacity or activate providers as a side effect of this source change. Keep the previous source checkpoint for rollback; do not drop historical fulfillment records or revert the additive SQL function to simulate a release rollback.

Queue visual/browser acceptance and hosted recovery remain awaiting evidence. This work neither dispatches a driver nor verifies physical pickup/delivery. The commercial default for commission after a return remains awaiting the founder's decision.
