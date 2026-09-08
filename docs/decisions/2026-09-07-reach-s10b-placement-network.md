# ADR: Reach S10b — first real placement inventory (no invented impressions)

**Date:** 2026-09-07  
**Status:** Accepted  
**Product:** [`docs/product/KEBU-REACH.md`](../product/KEBU-REACH.md)

## Context

S10a only tracks links the merchant shares. That is not a placement network. Building “paid ads” without **inventory** (where ads actually appear) forces fake impression numbers.

## Decision

1. **First inventory = Kebu-owned Reach Board** at `/reach/board` — a public surface that serves competing paid creatives.  
2. **Bidding = first-price CPC** in Cauris credits (`bid_cpc_cauris`). Rank by bid among eligible campaigns.  
3. **Impressions = viewport-proven only** (client IntersectionObserver → server event). Never estimate, multiply, or hard-code.  
4. **Billing = on board click** (CPC deducted from owner Reach wallet + campaign `spent_cauris`). Impressions are counted honestly but **not charged** in S10b.  
5. **Wallet top-up** creates a real ledger row of **platform Reach credits**. Card/Wave/Joko charging for ad spend = later slice — UI must say so.  
6. **Forbidden forever:** invented impressions, fake CPM/ROI, “estimated reach” as fact.

## How a full placement network grows (later slices)

| Layer | Job | Later inventory |
|-------|-----|-----------------|
| Demand | Campaigns + bids + budgets | Already starting |
| Supply | Slots that render ads | Shop opt-in · Search · RECT · Opportunity |
| Auction | Who wins each request | GSP / quality score |
| Delivery | Render creative | Multi-format |
| Measurement | viewable impress · click · conversion | Pixel + shop order attribution |
| Billing | Charge real money | Joko Cauris settlement |

## Consequences

- S10b is **TESTED** only when: set bid → appear on board → scroll into view → impression +1 → click → wallet spent. Refresh shows same counts (DB).  
- Link tracking (`/r/…`) stays free and separate from board CPC.  
- Do not claim continent-scale ad network until more inventory slices land.
