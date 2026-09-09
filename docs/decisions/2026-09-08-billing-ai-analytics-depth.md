# ADR: Billing limits · AI metering · analytics depth

## Decision

After Free publish + custom domains work in prod:

1. **Tighten plan limits** — `maxWebsites` on create-website; store gate on Joko enable; existing domain/product/store gates remain.
2. **AI metering** — `account_ai_usage_events` (**081**); monthly count vs `aiGenerationsPerMonth`; wired on website AI create, AI improve preview, Studio generate. Usage API: `GET /api/account/usage`.
3. **Analytics depth** — summarize top pages, referrers, countries; site detail supports 30-day range.

## Apply

`APPLY_080_THROUGH_081.sql` (or **080** then **081**).
