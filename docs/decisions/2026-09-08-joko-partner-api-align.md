# ADR: Align Kebu shop pay to Joko Partner API (`amount_xof` + phone)

**Date:** 2026-09-08  
**Status:** Accepted  
**Joko side:** Partner API shipped (`mbayangxo/JOKO` @ `19ac203`); ops = Supabase `db:setup` + Vercel env.

## Context

Joko Partner checkout accepts **`amount_xof`** and **`customer.phone`**. Kebu shop was still posting **USD cents** only and often omitted phone, forcing Joko FX conversion and weaker buyer routing (Wave/OM/Mbolo).

## Decision

1. Shop Joko checkout sends **`amount_xof`** + **`customer.phone`** (email optional).  
2. Hosting / legacy paths may still use **`amount` + `currency: "USD"`**.  
3. Fulfill buyer texts prefer **`POST /v1/messages/send`** (`mbolo_auto`) when Joko is configured; Africa’s Talking / WhatsApp deep-link remain fallbacks.  
4. Env mapping (same secrets both sides):

| Kebu | Joko |
|------|------|
| `JOKO_API_BASE_URL` | `https://<joko-host>/api` |
| `JOKO_API_SECRET` | `JOKO_API_KEY` |
| `JOKO_WEBHOOK_SECRET` | `JOKO_WEBHOOK_SECRET` |

Webhook: HMAC-SHA256 → `x-joko-signature: sha256=<hex>` on `/api/webhooks/joko`.

## Ops gate (not done in this ADR)

Live pay is **BLOCKED** until Joko production has Partner schema + matching secrets and one sandbox checkout → webhook marks `shop_orders.payment_status = paid`.

## Consequences

- Prefer XOF labels on products for Joko shop pay (already required for live checkout).  
- Do not claim “shop pay on Joko live” until webhook E2E succeeds.
