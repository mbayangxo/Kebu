# Kebu Pricing — affordability for African youth

**Agent rule:** `.cursor/rules/kebu-pricing.mdc`  
**Code source of truth:** `lib/billing/plans.ts` · UI: `/pricing`  
**Account context:** Personal Kebu stays **FREE** — these tiers apply to **Builder + Shop + hosting** on business sites. See `docs/product/KEBU-ACCOUNT-MODEL.md`.

---

## Mission constraint

If Kebu solves **affordability for African youth**, do **not** anchor on **$20–$30/month** subscription pricing like Shopify Basic (~$29/mo annual, ~$39/mo monthly) or Wix e-commerce (~$29/mo).

**Market:** “Everything you need to build your business” — not “we’re cheaper than Shopify.”  
**$5 is only compelling if Kebu actually delivers a lot.**

---

## Website Builder + Store tiers (canonical)

| Plan | Price | Who it's for |
|------|-------|----------------|
| **Kebu Free** | **$0** | Students, beginners, trying Kebu |
| **Kebu Starter** | **$2/mo** | Personal sites, creators, students |
| **Kebu Shop** | **$5/mo** | Small businesses actually selling — **hero plan** |
| **Kebu Business** | **$10/mo** | Growing businesses |
| **Kebu Pro** | **$20/mo** | Serious businesses / teams |

**Kebu Student:** **$1/mo** (verified students) — or potentially **free first year** when verification ships. Strategically: 10-year ecosystem customer, not $1 ARPU optimization.

Yearly billing: modest discount (see `yearlyUsd` in `plans.ts`).

---

## Why $5 is the sweet spot

Competitors charge ~**$29+/month** for comparable website + store entry.

Kebu Shop at **$5/month** = website + store + hosting + analytics + AI tools — enormous difference **if limits are honest and the product works end-to-end**.

**Do not** pretend unlimited at $5. Costs grow with:

- AI generations  
- Storage · bandwidth · image/video processing  
- Email · databases  
- Payment infrastructure  
- Customer support  
- Cloud compute  

Each tier needs **sensible usage limits** (`KebuPlanLimits` in `plans.ts`). Enforce server-side as slices mature — UI must not claim unlimited.

---

## Tier capabilities (target)

### FREE — $0 · Build before you pay

- Limited AI website generation  
- Kebu subdomain  
- Basic templates · visual editor  
- Basic hosting · basic analytics  
- **1 website** · limited storage  
- Kebu branding  

The person can **actually build something** before paying.

### STARTER — $2/month · Student/creator plan

Everything in Free, plus:

- Custom domain connection  
- No Kebu branding  
- More AI generations · better templates · more storage  
- Basic forms  
- **1 website**

### SHOP — $5/month · **Push hardest**

Everything in Starter, plus:

- Online store · products · inventory · orders  
- Customer management · coupons  
- Sales analytics · abandoned-cart · conversion analytics (as slices ship)  
- Payment integrations  
- AI business assistant  
- **1–2 staff accounts**

### BUSINESS — $10/month · Genuinely powerful

- Multiple websites · larger store · more products  
- Multiple staff  
- Advanced analytics · marketing tools · advanced AI  
- Business email integration (when Mail slice ships)  
- Domain management · better storage · priority support  

### PRO — $20/month · Making money

- Teams · multiple stores  
- Advanced analytics · automation · API access  
- Advanced commerce · advanced Cloud integration  
- Highest limits  

**Not $30.** Pro caps the subscription ladder for youth-affordable positioning.

---

## Capability grows — not punishment for success

**Do not copy Shopify’s “pay more because you succeeded” feel.**

Starter → Shop → Business → Pro = **more capability**, not a tax on revenue.

For transactions, be **transparent**:

> Kebu Shop: **$5/month** + payment processing + **small Kebu transaction fee**

Higher plans may offer **lower transaction fees** over time.

---

## Multi-revenue model (healthier than squeezing subscriptions)

Full architecture: **`docs/product/KEBU-ECONOMIC-DISCOVERY.md`**.

Kebu monetizes **discovery + transactions + leads + intelligence** — not ads alone. Subscription is **one** stream.

| System | Mechanism |
|--------|-----------|
| **Search** | Discovery hub; premium intelligence tiers (future) |
| **Reach** | Ads, placement, campaigns — **tiny budgets** for SMEs |
| **Marketplace** | Transaction fees on sales |
| **Leads** | Pay-per-lead / quote requests |
| **Business Profiles** | Listings, verification, visibility |
| **B2B / Trade** | Supplier fees, trade services |
| **RECT** | Creator platform fees |
| **Cloud · Builder · Mail/Domains** | Usage + subscriptions |
| **Intelligence** | Deeper sourced research (paid) |
| **Capital** | Future, regulated — separate |

A $5/month merchant may also generate revenue via transactions, domains, email, AI overage, Reach, Leads, and Cloud — not subscription-only squeeze.

---

## Kebu Shop at maturity (what $5 should mean)

When slices are live, Shop should honestly include as much of this as is **actually built**:

- AI Website Builder  
- Hosting  
- Store  
- Domain connection  
- Analytics  
- Business email integration  
- Kebu Search presence (when Search ships)  
- Kebu Reach (when assigned)  
- AI business assistant  
- Kebu Opportunity OS connection (eligible users)  
- Kebu Cloud connection  
- **Kebu ID**

Then Kebu sells **infrastructure for starting a business** — not “a website.”

Label **NOT IMPLEMENTED** items honestly on `/pricing` until end-to-end.

---

## Personal Kebu vs project tiers

| Layer | Pricing |
|-------|---------|
| **Personal Kebu** | FREE — email, Search, Studio basic, profile (targets) |
| **Kebu Studio premium** | $2–5/mo (target) |
| **Builder / Shop tiers above** | Per **site/project** today; business workspace billing split in progress |

---

## Implementation status (honest)

| Item | Status |
|------|--------|
| Tier catalog + `/pricing` | **Live** — `lib/billing/plans.ts` |
| JOKO subscribe by tier | **IN PROGRESS** |
| Limit enforcement (AI, storage, staff, products) | **IN PROGRESS** — not fully gated |
| Student verification → $1 | **NOT STARTED** |
| Transaction fee on sales | **NOT STARTED** — document only |
| Shop maturity bundle (Reach, Mail, Search presence) | **NOT STARTED** — per slice |

---

## Related

- Account model: `docs/product/KEBU-ACCOUNT-MODEL.md`  
- Builder: `docs/product/KEBU-BUILDER-NEXT-GEN.md`  
- Economic discovery: `docs/product/KEBU-ECONOMIC-DISCOVERY.md`
- Status: `docs/IMPLEMENTATION_STATUS.md`
