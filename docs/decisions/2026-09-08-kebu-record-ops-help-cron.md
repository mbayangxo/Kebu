# ADR: Kebu Record ops — accounts · help · cron health

## Decision

Extend `/admin/record` (Kebu Record) as the internal ops portal:

1. **New accounts** — day / week / 30d / all-time from `user_profiles.created_at`
2. **Help requests** — table `help_requests`; public form on `/contact`; staff marks Helped in Record
3. **Cron health** — `platform_cron_runs` written by billing-monthly · site-health · shop-subscriptions; failing sites from `site_health_checks`
4. **SMS** — Shop fulfill default is **WhatsApp** (SMS optional) because SMS delivery in Africa is often unreliable

## Apply

`APPLY_083_HELP_AND_CRON.sql`
