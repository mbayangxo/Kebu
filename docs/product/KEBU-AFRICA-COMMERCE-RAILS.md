# Kebu Africa Commerce Rails

**Status:** Product law (architecture accepted 2026-09-07)  
**Decision:** [`docs/decisions/2026-09-07-alk-joko-commerce-rails.md`](../decisions/2026-09-07-alk-joko-commerce-rails.md)  
**Related:** Builder next-gen · AfriID · Kebu ID · Shop adapters · Pricing

## One-line thesis

Kebu Shop is not “a website with payment plugins.” It is a **pan-African storefront OS** whose **default money rail** is **AfriID + Kebu ID trust → Joko wallet → ALK settlement**, with Wave / Orange / M-Pesa / Paystack / Flutterwave as **coverage options** — and **every successful or attempted payment** feeding a **single transaction ledger** for analytics and later Joko readiness scoring.

---

## ALK vs Cauris vs Joko vs Alke (plain language)

| Name | Job | Analogy |
|------|-----|---------|
| **AfriID** | Who is the **person**? | Passport |
| **Kebu ID** | What is this **business**? | Business registration |
| **Joko** | The **wallet / pay app** on Kebu | Checkout button |
| **Cauris** | **Joko’s currency** — you pay in Cauris | Like paying in “euro” inside one wallet |
| **ALK** | Future **settlement / clearing** between countries | Clearing house behind the wallet |
| **Alke** (loose talk) | AfriID + Kebu ID | Trust stack — not money |

### Cauris = Joko money (product law)

When a buyer chooses Joko, the UI says **Pay X Cauris** — not “pay XOF via Joko.”

Local currencies are **equivalents**:

- 1 Cauris = **N** CFA (XOF)  
- 1 Cauris = **M** Naira (NGN)  
- (more corridors as rates are published)

Shop catalogs may still list prices in XOF/NGN for familiarity; at Joko checkout those amounts convert to **Cauris**. Rates are labeled **provisional** until a live rate feed / ALK clearing is wired (`CAURIS_XOF_PER`, `CAURIS_NGN_PER`).

**ALK** remains the future pan-African clearing layer; it is **not** a second currency buyers select. Cauris is what they hold and spend in Joko.

Personal eligibility ≠ Kebu ID. Verified AfriID does **not** auto-create a business. A Kebu ID does **not** prove personal eligibility.

**Registration forms (person vs business):** [`docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md`](./KEBU-AFRIID-KEBU-ID-REGISTRATION.md) — informal sellers welcome; owner AfriID binds every shop to a real person.

---

## Five differentiators (target — honest status)

### 1. Native Joko / ALK rail (not bolted-on payments)

**Product:** Checkout settles first into **Joko in Cauris**; ALK may clear corridors later. Merchant does not “integrate a local gateway” as the primary job.

**Today (Phase One):**
- Joko checkout + webhook path **exists** (env-gated).
- Wave / Paystack / PayPal / … adapters **exist**.
- Checkout UI: **Joko first + Recommended** when enabled — copy says **Pay X Cauris** (+ XOF/NGN equivalents).
- **Payment ledger events** (`shop_payment_ledger_events`, migration **068**) on intent · checkout_started · paid — all rails.

**Forbidden:** Claiming ALK clearing is live. Hiding that Cauris↔XOF/NGN rates are provisional. Claiming “no fees” without a published fee schedule.

### 2. Offline-first / USSD-capable storefronts

**Product:** Order-taking over **SMS / USSD** (and low-data web); queue locally; **sync when connectivity returns**; never claim “saved on Kebu” until the server acknowledges.

**Today:**
- Data Saver · offline **place_order** queue · honest sync — **IMPLEMENTED** for browser/PWA paths.
- **USSD / SMS storefront** — **NOT STARTED**.

### 3. Cross-border logistics as first-class

**Product:** Storefront understands **buyer country ≠ seller country** → real **shipping cost/time**, **customs/duty rules** for the pair, and **courier/freight partners** (“Ship to Accra” is a product action, not a phone call).

**Today:**
- Fulfillment tracking + carriers list on orders — **partial** (merchant-entered).
- **SN→GH (+ SN→SN) shipping quote at checkout** — **IMPLEMENTED** (corridor table v1, trust label `estimate`, customs hint; apply **069**). Not live carrier booking.
- **Seller trust (rails #3)** — **IMPLEMENTED**: Joko enable + product soft-cap require linked Kebu ID + AfriID (honest states); `informal_unregistered` SN type; Shop banner. Not a fake verified-seller badge.
- Partner network API / more corridors — **NOT STARTED**.

### 4. Identity-verified sellers (AfriID + Kebu ID)

**Product:** Trust and fraud block African e-commerce more than UI polish. Sellers operate under **Kebu ID**; verification depth ties to **AfriID** / business verification levels — honest badges only.

**Today:**
- AfriID + Kebu ID systems **exist** as identity layers.
- Shop “verified seller” gate on publish/checkout — **NOT fully enforced** as a commerce requirement.

### 5. One account, every currency, one platform

**Product:** A Linguère seller and a Lagos seller share **one Kebu account** and **pay/settle in Cauris via Joko** — not “pick NGN or XOF storefront product.”

**Today:**
- One Kebu Account · multi-business Kebu IDs — **in progress**.
- Catalog often still labeled in XOF; **Joko checkout displays Cauris** with local equivalents.

---

## Checkout intelligence (target behavior)

At checkout the storefront should know:

1. **Same-country vs cross-border** (buyer vs seller country from AfriID / address / phone / geo — labeled confidence).  
2. **Shipping cost and time** for that pair (partner rates or estimate with trust label).  
3. **Customs / duty rules** applicable (sourced; never invent law).  
4. **Pay options ordered:** Joko (default when available) → local mobile money relevant to buyer → cards/PSPs → WhatsApp/COD.  
5. **Ledger event** written regardless of rail (amount, currency, corridor, provider, fee if any, parties’ Kebu IDs).

---

## Data → analytics → Joko (later)

```
Order / payment attempt
  → normalized commerce event (rail, corridor, status)
  → Shop analytics (live)
  → (later) Joko credit / readiness inputs — never fake score UI early
```

KA Score / Joko lending remain **separate** regulated concerns. Do not auto-approve credit from shop events.

---

## Build order (when assigned — one slice at a time)

1. Checkout UX: **Joko default + honest adapter options** (no ALK claim).  
2. Normalized **payment ledger events** on all rails (feeds analytics).  
3. Seller trust: require **Kebu ID** (+ AfriID depth when product asks) for higher commerce limits — honest states. **IMPLEMENTED** (Joko enable + product soft-cap; Shop banner; informal SN type).  
4. Cross-border **shipping quote** for one corridor (e.g. SN→GH) with partner or labeled estimate. **IMPLEMENTED** (estimate).  
5. Customs hint pack for that corridor (sourced).  
6. Offline **SMS/USSD** order intake → same `shop_orders` path.  
7. ALK settlement when currency layer + legal rails exist.

**Dependency rule:** Do not stack logistics or ALK on broken order/webhook/Joko paths.

---

## Framing for Cursor (never violate)

> Do **not** instruct: “add Paystack like Shopify payments.”  
> Do instruct: “Checkout is **AfriID/Kebu ID aware**, **Joko-native**, adapters for coverage; collect ledger data either way; cross-border shipping/customs are product features when sliced — never empty screens.”

---

## Implementation status pointers

See `docs/IMPLEMENTATION_STATUS.md` rows for Shop payments, Joko, AfriID, fulfillment. Anything marked **NOT STARTED** here must not appear as live merchant UI.
