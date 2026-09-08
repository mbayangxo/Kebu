# Kebu ID × AfriID — registration forms & continental identity

**Status:** Accepted product architecture (2026-09-07)  
**Decision:** [`docs/decisions/2026-09-07-kebu-afriid-registration-forms.md`](../decisions/2026-09-07-kebu-afriid-registration-forms.md)  
**Related:** `kebu-id.mdc` · `kebu-account-model.mdc` · `docs/product/KEBU-AFRICA-COMMERCE-RAILS.md` · KA Score law

## The split (non-negotiable)

| System | Question it answers | Unit |
|--------|---------------------|------|
| **AfriID** (African ID / AID) | Who is this **person**? | One human · portable across borders and products |
| **Kebu ID** | What is this **business**? | One commercial entity · registration + ops + credit file |

Kebu is the **business-registration and operations layer**. AfriID is the **individual identity layer**.  
A seller storefront must bind to a **Kebu ID** whose owner is tied to a real **AfriID** — that kills anonymous scam shops without forcing every informal trader to become a SARL on day one.

**Never merge** forms, tables, or public IDs. Link by `user_id` / founder membership / explicit AfriID number on the business record.

---

## Revolutionary layer (moat)

Most African identity is **siloed per country and per bank**. A Senegalese person is invisible to a Ghanaian bank.

**Target:** One **AfriID number** recognized by:

- Kebu business (Kebu ID)  
- Joko wallet  
- Kër / Property (when assigned)  
- Consulate / partner desks (when integrated)

Identity **travels with the person across the continent** — that is the moat, more than any single app UI.

**Honest today:** AfriID exists as account-linked AID with eligibility states. Cross-product recognition beyond Kebu account + public verified card is **partial**. Consulate / multi-country bank recognition = **NOT STARTED**.

---

## Kebu — business registration (seller signup to sell)

Purpose: create/update the **Kebu ID** record that becomes the seller’s **business credit file** over time (transactions, delivery reliability, disputes) — foundation for future lending **review**, not an auto-loan.

### Required form fields (target schema)

| Field | Notes | Code today |
|-------|--------|------------|
| **Business name** | Legal or trading | `legal_name` / `trading_name` — **exists** |
| **Owner AfriID number** | Ties business to verified person — anti-scam | **PARTIAL** — founder is account user; explicit AfriID link on business **not fully required on sell path** |
| **Business type** | sole proprietor · cooperative · registered company · **informal / unregistered** | Country legal structures **exist** (e.g. SN `individual_enterprise`, `cooperative`, SARL…). **`informal_unregistered` first-class** — must be allowed; do not force formalization |
| **Sector / category** | food, textiles, manufacturing, services, agriculture, … | `category` — **exists**; extend for import-replacement tagging when Opportunity OS asks |
| **Physical location** | Address / region | `country_code` + `region` — **exists**; finer address **extend** |
| **Delivery radius / cross-border willingness** | Serves logistics + checkout intelligence | **NOT STARTED** |
| **Years operating / informal track record** | Brand-new OK; buyers get trust signal | **NOT STARTED** |
| **Payout rails** | Bank / mobile money / **Joko wallet** | Shop commerce WhatsApp/Wave/Joko prefs **partial**; formal payout KYC file **NOT STARTED** |
| **Tax ID** | Optional; if missing → **on-ramp help** to obtain (not a hard block) | Registration wizard tax steps **BLOCKED** on gov; optional capture **extend** |
| **Products / services + supply capacity** | B2B matching seed | Products on shop **exist**; structured supply capacity on Kebu ID **NOT STARTED** |

### Business credit file (over time)

Store **events**, not a purchasable badge:

- Order / fulfillment / dispute / refund rates (from Shop ledger)  
- Delivery reliability  
- Identity verification level (Kebu ID levels 1–4)  
- AfriID verification state of beneficial owners  

Feeds **Shop analytics** now → **Kebu Score / Joko readiness** only when those slices are assigned. Never invent a score from empty data.

### Informal-first rule

Most African commerce is informal. **Capture status honestly.**  
“Informal / unregistered” is a **valid** business type. Kebu **helps** traders formalize (tax ID, registration modules) over time — it does **not** gate selling on paperwork day one (limits may differ by verification level — server-enforced, labeled honestly).

---

## AfriID — individual signup

Purpose: one portable person identity. Reaches **unbanked / undocumented** where bank and telecom forms fail.

### Target form fields

| Field | Notes | Privacy / law | Code today |
|-------|--------|---------------|------------|
| **Government ID** or **biometric enrollment** | Fingerprint/face for those without papers | Highest sensitivity; consent · retention · never browser-only “verified” | Gov ID / biometric capture **NOT STARTED** (eligibility states exist) |
| **Full name, DOB** | Core identity | PII | Profile **partial** |
| **Country of birth + current residence** | Critical for **diaspora** | — | `country_code` on AID **partial**; birth vs residence split **NOT STARTED** |
| **Ethnic / ancestral group or region of origin** | **Optional**; diaspora-return / Advancement Org matching | **Never** a KA Score / credit input (`kebu-ka-score.mdc`) | **NOT STARTED** |
| **Phone (SIM-linked via telecom partner)** + email if any | Contact | Telecom API when partner slice assigned | Phone on profile **partial**; SIM-link API **NOT STARTED** |
| **Occupation / skills** | Labor / skills registry dual-use | — | **NOT STARTED** on AfriID |
| **Financial status** | banked · mobile-money-only · fully unbanked | Targets Joko onboarding — not public | **NOT STARTED** |
| **Next of kin** | Diaspora-return · future inheritance | Sensitive | **NOT STARTED** |
| **Land / property declaration** | Optional seed for future land registry | **Not** a Property Passport; Property infra separate · **NOT STARTED** until assigned | **NOT STARTED** |

### Eligibility states (already law)

`unverified | pending | verified | rejected | expired | suspended | manual_review`  
Types: `indigenous | visitor`  
Browser flags never grant access. Entitlements (e.g. Opportunity OS) checked server-side.

---

## How they connect at “start selling”

```
Kebu Account (login)
  ├── AfriID  → who is the person (portable)
  └── Create / open Kebu ID → what is the business
        ├── owner AfriID required (link)
        ├── informal OK
        └── Shop / site / payouts attach to Kebu ID
```

1. Person has Kebu Account.  
2. AfriID created / deepened (honest status).  
3. Create Kebu ID with business form above (owner AfriID linked).  
4. Attach storefront project → sell.  
5. Ops data accumulates on Kebu ID credit file.

---

## Build order (when assigned — one slice at a time)

1. **Seller bind:** require owner AfriID number (or verified AID on account) when enabling Shop sell / raising limits — honest empty/unverified states.  
2. **Informal type:** add `informal_unregistered` (or equivalent) to country modules that lack it; copy that does not shame informal.  
3. **Commerce fields on Kebu ID:** delivery radius, cross-border willingness, years operating, supply capacity.  
4. **AfriID profile deepen:** birth/residence, occupation/skills, financial status (no biometrics yet).  
5. **Optional sensitive fields** (ethnic, next of kin, land) with explicit consent UX.  
6. **Biometric / gov-ID verification** + telecom SIM-link — partner-dependent.  
7. **Tax ID on-ramp** when country module supports it.

**Forbidden:** Fake “continental government recognition.” Fake land titles. Using ethnic data in credit scores. Requiring SARL before first sale.

---

## Framing for Cursor

> Do **not** merge AfriID into the business form.  
> Do **not** force formalization.  
> Do bind every selling Kebu ID to a real person’s AfriID.  
> Do treat the Kebu ID record as the long-term **business credit file**, not only a marketplace listing.
