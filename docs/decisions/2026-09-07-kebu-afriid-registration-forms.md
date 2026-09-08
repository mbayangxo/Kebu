# ADR: Kebu business registration vs AfriID individual signup

**Date:** 2026-09-07  
**Status:** Accepted  
**Product law:** [`docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md`](../product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md)

## Context

Product clarified: Kebu becomes the **business-registration layer**; AfriID handles **individual identity**. Seller signup must capture informal commerce honestly and tie every shop to a verified person. AfriID must reach unbanked/undocumented people and eventually travel across Kebu · Joko · Property · partner desks.

## Decision

1. **Two forms, two systems** — never one combined “identity + company” blob.  
2. **Kebu seller registration** fields: business name · owner AfriID · type (incl. informal) · sector · location · delivery/cross-border · years operating · payout rails · optional tax ID (help obtain, don’t hard-block) · products/supply capacity.  
3. **AfriID signup** fields: gov ID or biometric path · name/DOB · birth + residence countries · optional ethnic/ancestral · phone/email · occupation/skills · financial status · next of kin · optional land declaration.  
4. **Business credit file** lives on Kebu ID over time (ops data) — more valuable long-term than a listing; lending uses it later with consent/regulation — never fake scores.  
5. **Moat framing:** AfriID is the portable continental person number; Kebu ID is the portable business number.

## Consequences

- Next sell-path slices must **link owner AfriID**, not invent a third “Alke” entity.  
- Country legal modules must allow **informal/unregistered**.  
- Sensitive AfriID fields require consent; ethnic/land never feed KA Score.  
- Do not ship biometric/USSD/land-registry UI until those slices are assigned.

## Alternatives considered

| Option | Why rejected |
|--------|----------------|
| Force company registration before sell | Excludes most real African sellers |
| Anonymous shops with only email | Scam magnet |
| Single “Kebu ID” for person and business | Violates constitution / account model |
| Ethnic data as trust score input | Forbidden by KA Score fairness law |
