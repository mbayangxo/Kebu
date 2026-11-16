# Kebu × JOKKO payout boundary

Accepted direction: November 16, 2026. Design contract, NOT an implemented payout service.

Kebu Business prepares and approves obligations for workers and contractors. Exchange and Shop prepare seller entitlements from settled commerce. JOKKO is a separate payment/wallet service. Existing source names use `JOKO_*`; that spelling does not establish a disbursement API. `lib/joko/payments.ts` implements partner checkout/status/messaging, not outbound employer payroll. JOKO Fulfillment commissions are logistics charges, not proof of a wallet transfer.

## User journey

An authorized company operator selects a pay period or approved invoice, reviews the recipient, exact currency, amount and fees, then approves payment. A worker chooses an allowed destination; adding Liguey is not a condition for receiving wages. Show bank/mobile-money alternatives only when actually supported. Use connected provider destination tokens; never collect wallet PINs, OTPs or raw bank credentials in Kebu forms. Existing pay-method preferences are not verified destinations and existing pay statements are not payment orders.

Before dispatch, show the source amount, destination amount, quote expiry and total fees. A separately authorized person approves high-risk or bulk payouts when required by company policy. Changing the recipient, amount, currency or quote invalidates approval. Optional pay statements link to receipts after settlement; do not make a statement's existence mean paid.

## Separate obligations, common execution rules

| Obligation | Source of entitlement | Funding and authorization |
| --- | --- | --- |
| Employee pay | Employer-approved payroll calculation or imported payroll result | Explicit employer funding and finance authorization. Employment/tax requirements need a country-specific operating arrangement; this document does not implement payroll law. |
| Contractor invoice | Approved invoice/milestone | Funding company and invoice permissions; no automatic payment merely because a task is marked done. |
| Shop seller | Captured/settled sales less applicable refunds, fees and fulfillment commission | Merchant settlement ledger, including reserves and chargeback treatment. |
| Exchange creator | Settled eligible sales and the applicable split | Creator settlement ledger, refund adjustments and reserves. App requests cannot create their own entitlement. |

Do not pool balances across unrelated companies, personal wallets or Kebu platform revenue. Amounts carry an explicit ISO currency and minor-unit exponent. CAURIS display or wallet denomination requires an explicit contractual mapping; never assume equivalence to XOF. Any FX uses an immutable, accepted quote with source/destination amounts, rate source, fees, expiry and rounding rules. A mutable environment rate is not historical accounting.

## Required records and transaction boundary

Reuse existing identity/membership and commerce sources. The payout slice needs an obligation identifier/type, funding business, payee, approved immutable destination snapshot/token, source and settlement amounts/currencies, fee/FX quote, actor/approval evidence and revision, reservation journal, globally stable idempotency key, dispatch attempt, provider reference, signed provider event receipts and reconciliation history. These are required concepts, not a claim that new tables or JOKKO endpoints exist.

One database transaction checks current finance permission, locks the relevant funded account/obligation, checks settled availability, creates balanced ledger entries/reservation and an outbox item, and commits the approved snapshot. A unique business + obligation + payout-intent key prevents duplicate requests. Direct authenticated inserts cannot bypass this boundary. Provider HTTP occurs outside the SQL transaction; a leased worker reads the committed outbox and uses the SAME idempotency key on retries. Never hold a SQL transaction open across network calls.

Allowed lifecycle:

- `draft` → `approved` → `reserved` → `submitted` → `processing` → `paid`.
- A pre-submission rejection/cancellation releases the reservation atomically.
- A timeout, malformed response or provider 5xx means `unknown/reconciling`, with funds still reserved. It does not mean failed or available again.
- Only a verified terminal failure releases funds. Refund/reversal is a separate linked ledger event; it does not rewrite paid history.
- Signed callbacks and authenticated status polling deduplicate provider events, bind reference, beneficiary, amount and currency, and reject regressions. Display paid only after authoritative settlement evidence is recorded locally.

A worker crash after the provider accepts but before local persistence must recover by querying/retrying the same intent, not issuing another payment. Provider money movement plus a failed database update cannot be reported as safely completed. Manual transfers require independently checked receipts, exact currency/destination/amount and an audited authorized record; they never bypass the entitlement/reservation checks.

## Provider acceptance before enabling

Obtain the actual JOKKO payout contract and deployment/version, authentication and signing rules, supported destinations/countries/currencies, limits/fees, available settlement funds, error semantics, idempotency scope/retention, lookup/reconciliation endpoints and callback replay rules. Confirm the operating provider arrangement for each intended market. No arbitrary `/payouts` URL may be invented from the checkout API.

Wave's official documented payout contract (checked November 16) uses `POST /v1/payout` and `receive_amount`, `mobile`, optional `name` and `client_reference`. The removed guessed code used a different path and body. Orange Money Web Payment documentation is not evidence of an outbound transfer contract. Implement each approved rail from its own verified documentation and access, not an assumed common payload.

The current source intentionally holds automated Wave/Orange disbursement off. There is no environment-variable bypass. Restore an automated capability only in the complete, reviewed payout implementation; adding keys alone must remain insufficient. Checkout collection is a separate unchanged boundary.

## Acceptance that can close the hold

Use native PostgreSQL independent sessions and an approved provider test environment. Require zero skips in the required money suites:

1. Two simultaneous claims against one available balance cannot over-reserve; direct REST insert and wrong-company finance access fail.
2. USD/XOF, zero/negative/fractional values, unsupported denominations, rounding, fees and expired quotes behave exactly as approved; missing FX stops the request.
3. Repeated clicks, concurrent worker leases and replayed callbacks produce one external transfer and one balanced ledger effect.
4. Provider accepts then connection drops; local status write fails; worker restarts; the same transfer reconciles without releasing funds or paying twice.
5. Explicit rejection, insufficient funds, pending, terminal failure, reversal and refund-after-payout preserve balances and truthful status.
6. Bank/mobile-money destination changes, role removal and compromised recipient updates invalidate stale approvals; private pay data stays inaccessible to ordinary managers/other workers.
7. Browser approval → provider → receipt → worker portal refresh agrees with ledger and external evidence. The maker cannot approve an edited snapshot under the old approval.

A controlled live pilot requires an explicit approved amount/recipient/cost after test acceptance. This audit authorizes no transfer or spending. Proposed first slice: one company, one currency, one contracted rail, small reviewed batch; prove reconciliation before bulk payroll or cross-border FX. Payroll, contractor and creator reporting remain separate even if they share execution infrastructure.

Official reference: https://docs.wave.com/payout (checked November 16, 2026).
