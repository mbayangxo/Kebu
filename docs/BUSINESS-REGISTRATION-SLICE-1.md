# Business Registration — Vertical Slice 1

## Journey

Authenticated user → `/business/register` wizard → draft business + Kebu ID → `/business/[id]` dashboard (refresh-safe).

## Apply migrations (order)

1. `005_kebu_id_draft_business.sql`
2. `006_kebu_id_lock_draft_status.sql`
3. `007_business_registration.sql`

## What is included

- Country module architecture (`lib/kebu-id/countries/`) — Senegal first
- Registration wizard fields + founder owner
- Status history (append-only)
- Registration progress timeline (DB-backed)
- Server-side Business Readiness score (not financing)
- Mock government connector (`isLive: false`) — **not** a real filing

## Out of scope

Store, payments, website builder, AI, community, live government submission, funding, full KA Score beyond readiness.
