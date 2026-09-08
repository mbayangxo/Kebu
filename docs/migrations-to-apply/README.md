# Migrations to apply

## If you see `relation "public.projects" does not exist` or `public.businesses`

That is **not** a bug in shop / 056 / 057. Those scripts need the Phase One foundation first.

**Correct order in Supabase → SQL Editor:**

1. **Foundation (required once):** [`supabase/migrations/APPLY_ALL_PHASE_ONE.sql`](../../supabase/migrations/APPLY_ALL_PHASE_ONE.sql)  
   Creates `projects`, `businesses`, `business_members`, `set_updated_at()`, etc.  
   Smaller alternative if you only need ID + projects: `004_create_projects.sql` then [`APPLY_MIGRATIONS_005_007.sql`](../../supabase/migrations/APPLY_MIGRATIONS_005_007.sql).
2. **Pending extras (billing / AID / Free):** [`APPLY_ALL_PENDING_ONCE.sql`](./APPLY_ALL_PENDING_ONCE.sql)
3. **Shop:** [`APPLY_SHOP_ORDERS.sql`](../../APPLY_SHOP_ORDERS.sql)
4. **Agency:** `056` then `057` (and `052` / `053` if you need events / invoices)

**Check what you already have** (run in SQL Editor):

```sql
select
  to_regclass('public.projects') as projects,
  to_regclass('public.businesses') as businesses,
  to_regclass('public.business_members') as business_members,
  to_regprocedure('public.set_updated_at()') as set_updated_at;
```

Any `null` = missing foundation. Do **not** run shop / 056 / 057 until all four are non-null.

---

**New bundle (059 → 065, last ~3 days):** paste the full
[`APPLY_NEW_059_THROUGH_065.sql`](./APPLY_NEW_059_THROUGH_065.sql)
(also at repo root: `/APPLY_NEW_059_THROUGH_065.sql`) in Supabase SQL Editor → Run once.

Includes: **059** gift orders · **060** opportunity metadata · **061** workspace context · **062** entitlements · **063** opportunity cards · **064** variants/collections/brand kit/forms/Studio · **065** site chrome (W13).

**After 065 (066 → 069):** paste
[`APPLY_066_THROUGH_069.sql`](./APPLY_066_THROUGH_069.sql)
(also at repo root: `/APPLY_066_THROUGH_069.sql`) once.

| # | What |
|---|------|
| **066** | Blog posts · refunds · gift cards · reviews · subscriptions |
| **067** | Shop owner alerts · order channels (share/qr/…) · push subscriptions |
| **068** | Payment ledger (Joko/Cauris + Wave/Paystack/… events) |
| **069** | Shipping quote fields on orders (SN→GH corridor) |
| **070** | Studio AI generation history (`studio_generation_runs`) |
| **071** | Studio design collaborators (share · editor/viewer — not live cursors) |
| **072** | Reach campaigns + tracked promote events (S10a — not paid ads) |
| **073** | Studio uploads library (`studio_uploads` — S16) |
| **075** | Studio video projects (`studio_video_projects` — Phase 1 multi-track) |

**075 alone:** [`075_studio_video_projects.sql`](./075_studio_video_projects.sql) after auth users.

**Requires:** Phase One foundation + `APPLY_SHOP_ORDERS.sql` (through 055). Safe to re-run.

---

→ [`APPLY_ALL_PENDING_ONCE.sql`](./APPLY_ALL_PENDING_ONCE.sql)  
(also at repo root: `/APPLY_ALL_PENDING_ONCE.sql`)

1. Open Supabase → **SQL Editor**
2. Paste the **entire** file
3. Click **Run** once

Includes: **010 + 027 + 034 + 035 + 036 + 037 + 038** (billing table, African ID, uploads, monthly billing, tiers/$0 Free, AID types, Free publish RLS).

**Shop orders (required for cart / abandoned / stock / shopper accounts):** paste the full
[`APPLY_SHOP_ORDERS.sql`](../../APPLY_SHOP_ORDERS.sql) (repo root) in Supabase SQL Editor → Run.
Through **054**: catalog, orders, email lists, JOKO, discounts, UPC, cart + abandoned, stock, shopper accounts, wishlist, messaging, payment providers, **fulfillment tracking + per-store customer profiles (054)**. Safe to re-run.

**Aesthetics marketplace (new):** paste [`040_aesthetics_marketplace.sql`](./040_aesthetics_marketplace.sql) after 014 (developer marketplace tables) and 033 (project themes). Creates `aesthetic_library` + extends theme sources.

Individual numbered files below are leftovers — ignore them if you used the one-file script.

**Business events (052):** paste [`052_business_events.sql`](./052_business_events.sql) after businesses exist. Enables RSVP + ticketed events, registrations, owner portal on `/business/[id]`.

**Invoices / contracts / launch (053):** paste [`053_business_invoices_contracts.sql`](./053_business_invoices_contracts.sql). Owner: `/business/[id]` · public `/i/{id}` invoices · `/c/{id}` contracts.

**Fulfillment + customer profiles (054) + team invites / demo orders (055):** paste
[`054_shop_fulfillment_customers.sql`](./054_shop_fulfillment_customers.sql) and
[`055_team_invites_demo_orders.sql`](./055_team_invites_demo_orders.sql)
(also appended to APPLY_SHOP_ORDERS.sql). Re-run the full APPLY file if the earlier
`chdkleck` / `promessageject_products` typo blocked you — that is fixed.

**Artists + press kits (056):** paste
[`056_business_artists_press_kits.sql`](./056_business_artists_press_kits.sql)
after businesses + **055**. Owner: `/business/[id]` Artists · Press · public `/k/{publicId}`.

**Preferred (agency one paste):** [`APPLY_AGENCY_056_058.sql`](../../APPLY_AGENCY_056_058.sql)
— 056 + 057 + 058 together. Needs `businesses` + `business_members` only (not `projects`).

**Artist campaigns (057):** paste
[`057_business_artist_campaigns.sql`](./057_business_artist_campaigns.sql)
after **056**. Owner: `/business/[id]` Artist campaigns (linked to artist + optional press kit).

**Reels / MVs (058):** paste
[`058_business_artist_media.sql`](./058_business_artist_media.sql)
after **057**. Owner: `/business/[id]` Reels · Music videos · public `/a/{publicId}`.

**Shop gift / buy-for-someone (059):** paste
[`059_shop_gift_orders.sql`](./059_shop_gift_orders.sql)
after `shop_orders` exists (needs `projects`). Also appended to `APPLY_SHOP_ORDERS.sql`.
Checkout: “Buy for someone else” · public `/g/{gift_id}` · merchant Orders shows recipient.

**Shop owner ops (067) — required for order alerts + richer channels:** paste
[`067_shop_owner_ops.sql`](./067_shop_owner_ops.sql)
after Shop orders exist. Adds `shop_owner_notifications`, `shop_push_subscriptions`, expands order `channel`
(share / qr / social / wave / joko), and shop funnel analytics event types. Until applied: Shop → Alerts
still loads (empty) and orders fall back to legacy channels.

**Shop payment ledger (068) — all rails → one event stream:** paste
[`068_shop_payment_ledger.sql`](./068_shop_payment_ledger.sql)
after shop orders. Records intent / checkout_started / paid for Joko + Wave + Paystack + … (feeds analytics;
future Joko scoring). Currency column defaults to XOF; **Joko pay events use CAURIS** (Joko’s currency — catalog XOF converted at provisional rates).

**If `APPLY_ALL_PENDING_ONCE` fails with policy already exists on deployments:** fixed — re-pull and re-run; it now `DROP POLICY IF EXISTS` for both live and suspended policy names.
