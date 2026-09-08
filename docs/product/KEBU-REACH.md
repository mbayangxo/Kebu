# Kebu Reach — product specification

**Status:** **S10a** tracked links ✅ · **S10b** paid Reach Board + CPC bidding ✅ · Full multi-inventory network later.

## Framing

**Kebu Reach** connects **money to attention** — not a banner-only AdSense clone.

Long-term: search placement · product discovery · creator campaigns · tiny-budget experiments · RECT attribution (views → clicks → sales).

## How to build a real placement network

A placement network needs **six layers**. Skipping inventory and inventing impressions is fraud.

```
1. DEMAND     — advertisers, creatives, bids, budgets
2. SUPPLY     — inventory slots that actually render ads
3. AUCTION    — who wins each opportunity (CPC/CPM + rank)
4. DELIVERY   — serve creative into the slot
5. MEASURE    — viewable impression · click · conversion (real events only)
6. BILLING    — charge against budget / wallet / Joko
```

| Slice | Inventory | Status |
|-------|-----------|--------|
| **S10a** | None (merchant shares `/r/…`) | ✅ Link open/click |
| **S10b** | Kebu-owned **Reach Board** `/reach/board` | ✅ CPC auction · viewport impressions · wallet |
| Later | Shop opt-in · Search · RECT · Opportunity | ❌ |

**Invented impressions = lying.** Never pad empty boards, never multiply views, never show “estimated reach” as fact.

## S10a — tracked promote links

| Capability | Status |
|------------|--------|
| Create campaign from Studio | ✅ |
| Public `/r/{slug}` | ✅ |
| Real open / click / share | ✅ |
| Owner list at `/reach` | ✅ |
| Migration **072** | ✅ |

## S10b — paid board + bidding (live)

| Capability | Status |
|------------|--------|
| Reach wallet (platform Cauris credits + ledger) | ✅ |
| CPC bid · budget cap · spent | ✅ |
| First-price auction → board rank | ✅ |
| Impression only if ≥50% visible (IntersectionObserver) | ✅ |
| `board_click` charges CPC from wallet | ✅ |
| Migration **074** | ✅ Apply in Supabase |
| Card/Wave/Joko charge for ad spend | ❌ Later (credits are honest platform ledger) |
| Fake CPM / invented ROI | **Forbidden** |

## Pipeline (S10b)

```
Studio creative → Reach campaign → top up wallet → set CPC + enable board
        → auction on /reach/board → viewable impression event
        → board_click → wallet − CPC → destination
```

## Rules

- Never show estimated or hard-coded reach metrics.
- Empty board is valid — do not invent creatives.
- Link tracking stays free; board CPC is separate.
- Apply `072` then `074` in Supabase.
- Decision: `docs/decisions/2026-09-07-reach-s10b-placement-network.md`
