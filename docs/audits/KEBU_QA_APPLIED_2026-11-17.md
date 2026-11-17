# Kebu-qa foundation repair — applied November 17, 2026

The provider returned `success: true` and the hosted migration ledger records `qa_company_foundations` as `20261117183845` on project `skqnxyaeimvbyrmdfzvk` (Kebu-qa). This supersedes prior receipts documenting expired confirmation attempts. The cause of the earlier confirmation failures is unconfirmed.

## Exact input

- Source commit: `7a350d99c239ed1d213cd9f77d4d87622ba847cc`.
- Source file: `supabase/migrations/20261116060247_qa_company_foundations.sql`.
- SHA256: `99ee2f63c9c487a0498a495a802913a51c464b642e12720ef15ef3eea1302800`.
- The provider assigned a different hosted ledger timestamp from the source filename. This is one reviewed foundation bundle, not evidence that each historical input was separately applied.

## Hosted verification

- All 47 manifest tables exist; all have RLS enabled, no anonymous SELECT, no authenticated TRUNCATE.
- All three Cloud version/deployment constraints exist and are validated.
- `room_calls_one_active_per_room` and four realtime call/document policies exist.
- Baseline digests for profiles, assets, deployments and storage objects are unchanged; these baselines were empty. The existing `set_updated_at` helper is unchanged.
- Checked company/invite RPCs deny anonymous execution. `liguey_review_employer` also denies ordinary authenticated execution. Company portal actions deliberately remain authenticated RPCs with internal authorization; catalog privileges alone do not prove all runtime authorization paths.

## Advisor follow-through

Post-DDL security advisors report 11 INFO RLS-without-policy findings, three mutable-search-path function warnings, one public-schema `pg_net` extension warning, and 16 authenticated SECURITY DEFINER exposure warnings. This is not a clean-security certification. Deny-by-default service/internal tables can intentionally lack user policies; authenticated SECURITY DEFINER RPCs require internal authorization review, not blanket revocation. The shipping-function and extension warnings remain audit follow-up. Details and remediation URLs are retained in the JSON evidence.

## Still open

Real authenticated browser/full-stack acceptance; hosted concurrent-session acceptance (local native PostgreSQL race checks previously passed, not relabeled hosted); provider and payout contract/settlement evidence; May biography and animation approval; production hosting after the restriction resets. Do not blindly replay legacy migrations or rename the source file merely to match the provider timestamp. Reconcile the ledger mapping deliberately before future blanket migration pushes.

No production database, production deployment, real transfer, or May publishing was changed by this repair.
