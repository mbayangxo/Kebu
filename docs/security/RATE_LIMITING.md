# Rate-limiting architecture

Status: application guard active; production-wide Vercel Firewall rules require
dashboard configuration and an explicitly approved publish step.

## Current application layer

`lib/api-guard.ts` provides bounded, per-runtime IP buckets. These limits reduce
casual abuse and constrain memory on a warm function instance, but they are not a
distributed quota. A caller routed across multiple function instances can receive
one bucket per instance.

Keep these guards in place even after edge rules are active because the route
classes express application-specific limits and provide controlled `429` responses.

| Route class | Application limit | Window |
| --- | ---: | ---: |
| AI generation | 30 requests/IP | 60 seconds |
| Builder mutations | 120 requests/IP | 60 seconds |
| Public site reads | 180 requests/IP | 60 seconds |
| Login/admin authentication | 20 requests/IP | 60 seconds |
| Public shop order creation | 20 requests/IP | 60 seconds |

## Staged Vercel Firewall policy

Before publishing, verify route matching against Preview and exclude trusted
Vercel health/deployment traffic where needed. Suggested initial rules:

1. Challenge or deny sustained abusive traffic to `/api/admin/login`,
   `/api/sites/*/auth`, and `/api/support/session` at a conservative per-IP rate.
2. Rate-limit expensive AI routes (`/api/ai`, `/api/build`, `/api/yande/*`,
   `/api/agents/*`, `/api/studio/generate`) more tightly than ordinary API reads.
3. Rate-limit public order/help mutations (`/api/shop/*`, `/api/help/request`)
   while allowing legitimate shopping bursts.
4. Apply a broad high ceiling to `/api/*` as a final volumetric backstop.

Start in log/observe mode where the plan supports it, inspect legitimate traffic,
then publish enforcement. Do not encode `VERCEL_AUTOMATION_BYPASS_SECRET` or any
other secret in repository rules, logs, screenshots, or tests.

## Publication gate

Firewall changes affect production traffic and must not be published as part of
an ordinary code push. The connected automation surface cannot safely stage and
publish these rules. A project administrator must review the dashboard rules and
explicitly authorize the final publish. Until that happens, documentation and the
per-runtime application guard are the implemented layers; no distributed limit is
claimed.

## Future shared-store option

If application-level global quotas or per-account budgets become necessary, add a
shared atomic store through an approved provider and retain Vercel Firewall for
edge abuse. Provider choice, data retention, failure behavior, and regional
latency must be decided before introducing this dependency.
