# Wave settlement verification — October 21, 2026

Runtime **45f29df913022b067bd12ca43f2c57bc09b56276** is integrated and reread on the authoritative recovery branch, preserving Claude's Mail/fonts and phases 3C–3I. Wave checkout now records an immutable source/charge quote before returning its link, verifies the provider's returned session, uses exact decimal FX and accepts only fresh official timestamped signatures with completed/succeeded payment proof. Atomic service-only settlement binds reference/session/amount/currency, prevents transaction/event reuse, grants ownership and increments counters once, and preserves actual Shop stock completion and durable delivery retry. The prior callback regression had **23 failures / 7 passes**; the repaired exact-source gate has **64 HTTP/adapter + 13 actual SQL + 6 native race passes**, zero skips. The two native cases run three mandatory times with actual independent PostgreSQL sessions and observed blocking, followed by normal database cleanup.

All six exact-source gates passed: full CI **6,526 passes / 314 explicit skips**, TypeScript, zero lint errors / 347 existing warnings and finalized build; Builder **77/77**, zero skips or flaky cases, with unchanged nine performance probes; platform **20 SQL suites / 21 browser cases**; original native **30/30**; public preview **533 passes / 35 explicit skips**. READY preview: https://kebu-hyajzr1qh-mbayangxos-projects.vercel.app. Final verification ran in GitHub Actions because the local execution service stopped responding; no full local Wave gate is claimed. See `audits/KEBU_WAVE_SETTLEMENT_2026-10-21.md` and its machine-readable evidence.

**Still open:** actual merchant credentials/payments, other providers' settlement proof, private paid-source/file delivery, reconciliation/refunds, authenticated hosted 26-case acceptance and production rollout. SQL fixtures apply real canonical marketplace/stock functions but use minimal typed Shop tables; this is not full Shop fresh-schema or managed hosted Auth/RLS acceptance. The new 97th canonical migration remains production-unapplied. Existing QA access is explicitly denied; production preflight remains 22/37 failed prerequisites. No production schema, DNS, paid infrastructure or promotion changed. Full Kebu, May, Studio, 3J and the 99-group requirements remain incomplete.


## Failure and root repair

The previous route verified a bare raw-body HMAC, accepted broad success/completed event names and could fall through a provider-omitted completion dispatcher. Actual-handler adversarial tests reproduced 23 failures and seven passes. The first local callback repair passed 30 cases. Local command execution then became unavailable; complete source was preserved using GitHub Git Data APIs, with all 21 changed blob SHAs compared against the repository diff before integration. The runtime is two commits ahead of cf3dcc13 with no divergence or author rewrite.

Wave's current official [webhook](https://docs.wave.com/webhook) contract signs timestamp concatenated with the exact raw body. The implementation requires Wave-Signature t/v1, constant-time comparison, five-minute freshness, rotation support, exact event/state and complete session/transaction identities. Missing secrets, invalid proofs, unavailable storage and delivery failures return explicit recoverable errors. Mismatches never fall back to an unverified dispatcher.

The [checkout](https://docs.wave.com/checkout) response must agree with requested amount, currency and reference and contain an actual session ID and secure launch URL. Positive safe integer XOF is direct; USD requires explicit WAVE_XOF_PER_USD. A reproduced one-cent conversion at rate 49.999999999999999999 formerly rounded upward to one XOF after binary floating-point loss. Decimal-rational BigInt arithmetic now rounds once and refuses the zero charge. Ordinary configured conversion remains covered. No invented rate, minimum-charge clamp, truncated reference or fake provider ID is substituted.

## Persistence and permissions

The CLI-created `20261021214459_verified_wave_settlement.sql` introduces immutable service-only Wave quotes and settlement identities with RLS and restricted grants. Browser roles cannot read/write these tables or execute the privileged RPCs. The initiation RPC locks and validates the existing receipt and original source units before recording the exact provider charge/session. The completion RPC locks the receipt then quote, validates current provider/reference/source/session/amount/currency, and records durable transaction/event identity in the same transaction as ownership/counters or existing Shop stock/payment completion. A counter/stock error rolls the transaction back. Same-payment replay returns the original receipt without duplicate value. Distinct receipts cannot reuse one provider transaction.

The existing complete_shop_payment signature and stock behavior are preserved; its formerly hard-coded Paystack ledger rail now records the actual provider. Existing durable delivery runs after verified settlement and remains retryable. Already-owned independent second payments, inactive/changed attempts, missing legacy quotes and expired reservations fail closed and need a wider reconciliation/refund workflow. This slice does not certify that workflow.

## Exact-source evidence

| Gate | Result | Run / job |
| --- | --- | --- |
| CI | 6,526 pass; 314 explicit skip; 406 files pass / 46 skip; zero lint errors / 347 existing warnings; TypeScript and build pass | [39685624938](https://github.com/mbayangxo/Kebu/actions/runs/39685624938) / 119518823233 |
| Wave | 64 HTTP/adapter, 13 SQL, two native cases × three required iterations = six native pass; zero skip; PG 17.6; cleanup true | [39685624887](https://github.com/mbayangxo/Kebu/actions/runs/39685624887) / 119518821316 |
| Builder | 77 browser cases; zero skip/unexpected/flaky; unchanged nine performance probes; cleanup true | [39685624868](https://github.com/mbayangxo/Kebu/actions/runs/39685624868) / 119518821252 |
| Platform | 20 SQL suites; Mail seven + Liguey 13 + locale one browser cases | [39685624847](https://github.com/mbayangxo/Kebu/actions/runs/39685624847) / 119518821455 |
| Original native | Ten unique cases × three required iterations = 30 pass; zero skip; cleanup true | [39685624906](https://github.com/mbayangxo/Kebu/actions/runs/39685624906) / 119518821739 |
| Hosted public preview | 533 pass; 35 explicit skips; no authenticated hosted acceptance | [39685785865](https://github.com/mbayangxo/Kebu/actions/runs/39685785865) / 119519352767 |

Native Wave workers have distinct backend PIDs and actual observed lock barriers. Same-receipt completion yields one new receipt and one replay; the cross-receipt same-transaction race yields one success and one refusal with one grant/counter increment. Cleanup drains generated connections and uses ordinary DROP, never forced production teardown.

The SQL gate applies real canonical marketplace migrations and existing stock/checkout function bodies. Minimal typed Shop fixture tables are explicitly used: this does not certify the entire Shop migration chain. One end-to-end test binds a configured checkout quote, changes FX before the signed callback, and verifies the original charged amount still grants ownership once. Provider network replies are explicit fixtures; no live merchant request or actual charge occurred.

## Deployment and remaining acceptance

Exact source preview `dpl_G9kbpMSTaE2vD53mrKasd4rY1XTn` is READY at https://kebu-hyajzr1qh-mbayangxos-projects.vercel.app. Source binding and public smoke do not establish a Kebu authenticated session. Managed QA access remains explicitly denied, the strict 26-case hosted acceptance remains unexecuted and production still has 22 failed prerequisites in 37 read-only schema/grant checks. Production remains `71815f99c50022482e545e22e1f6e040ee1cafe4` / `dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2`. No production migration, DNS, credential decryption, actual payment, paid infrastructure or promotion occurred.

Other provider proofs, private paid-source/file delivery, actual merchant credentials, live Mail domain/delivery, broader Search/Studio/May/Builder/3J/99-group acceptance and migration-history reconciliation remain open. Do not infer global completion from this checkpoint. Machine-readable results: [verification.json](evidence/wave-settlement-oct21/verification.json).
