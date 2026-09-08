# ADR: Native AfriID / Joko / ALK commerce rails (not bolted-on payments)

**Date:** 2026-09-07  
**Status:** Accepted  
**Product law:** [`docs/product/KEBU-AFRICA-COMMERCE-RAILS.md`](../product/KEBU-AFRICA-COMMERCE-RAILS.md)

## Context

Third-party builder/commerce platforms treat payment as “pick a gateway.” That is the #1 African merchant complaint and produces NGN-or-ZAR silos, weak trust, and logistics as an afterthought. Kebu already has **AfriID**, **Kebu ID**, **Joko** (product pay; K21 renamed), and **Wave / Paystack / … adapters** — but the storefront must not *feel* like a PSP picker.

Naming clarification from product: when we say **Alke** in this commerce context, we mean the **trust stack** = **AfriID** (person eligibility / verification) + **Kebu Business ID** (business identity) — not a separate third identity product.

## Decision

1. **Default settlement path** = AfriID-aware context + **Joko wallet paying in Cauris** (Joko’s currency). Local XOF/NGN are equivalents. ALK may clear pan-African settlement later — not a second currency at checkout.  
2. **Wave · Orange Money · M-Pesa · Paystack · Flutterwave · WhatsApp/COD** remain **first-class options** at checkout via adapters — never fake “native” when using them.  
3. **Transaction data collected either way** (normalized ledger events) → shop analytics now → **Joko credit-scoring later** (never invent scores early).  
4. Storefront checkout must eventually understand **cross-border**: buyer/seller country pair → shipping cost/time · customs/duty hints · courier/freight actions — not merchant guesswork.  
5. **Offline / SMS / USSD order-taking** is a target capability for rural sellers (sync when online) — related to rural connectivity thinking; **not** Phase One fake USSD UI.  
6. **Seller trust**: identity-verified sellers via AfriID + Kebu ID — fraud/trust > UI polish for African e-commerce adoption.

## Consequences

- Checkout UX priority: **Pay X Cauris** with Joko (when available) as default/recommended; show XOF/NGN equivalents; other methods honest options.  
- Do **not** frame Kebu Shop as “Shopify + local PSP plugins.”  
- Do **not** build empty ALK / USSD / customs / courier network screens until those slices are assigned.  
- **Cauris is Joko’s currency** — say “pay in Cauris,” not “ALK currency at checkout.”  
- Adapter architecture stays; **Joko is not “just another adapter” in product framing** — it is the **native rail**, adapters are the escape hatches and coverage layer.

## Alternatives considered

| Option | Why rejected |
|--------|----------------|
| PSP-first (Paystack/Flutterwave as the product) | Same complaint as every Western clone |
| Joko-only, remove Wave/etc. | Blocks real Senegal/Nigeria buyers today |
| Fake “verified seller” badge without AfriID/Kebu ID | Violates no-fake-functionality |
| Multi-currency as “pick NGN or ZAR store” | Pan-African ALK thesis requires one platform, many currencies |
