# Kebu ID Slice 1 — Draft business

## What shipped

Authenticated user creates a **draft business** with:

- legal/proposed name, optional trading name, country, category, description
- secure internal UUID
- public Kebu ID (`KEBU-CC-01-XXXXXX`)
- founder membership
- audit log `business.draft_created`
- Idempotency-Key (no duplicate businesses)

UI: `/business`, `/business/new`, `/business/[id]`

## Apply migrations

Run in Supabase SQL editor (in order):

1. `supabase/migrations/005_kebu_id_draft_business.sql`
2. `supabase/migrations/006_kebu_id_lock_draft_status.sql` (locks verification/lifecycle; draft delete for cleanup)

## Security

- 401 without auth
- 404 for other users' business UUID
- `GET /api/public/kebu-id/[kebuId]` returns 404 for draft (no private leak)

## Not in this slice

Government registration, verification upgrades, stores, payments, team invites.
