# Country expansion

Kebu uses **versioned country modules** — not hard-coded Senegal in global core.

**Kebu ID:** `.cursor/rules/kebu-id.mdc`  
**Property (future):** `product/KEBU-PROPERTY-INFRASTRUCTURE.md` — Africa Lens modules  
**Opportunity OS:** `OPPORTUNITY-COUNTRY-EXPLORER.md`

---

## Principles

1. **Global core** — account, auth, RBAC, billing adapters, builder engine  
2. **Country module** — legal structures, required fields, documents, registration steps, tax/shipping defaults, localized copy  
3. **Verify once** — personal eligibility (`african_opportunity_access`) separate from **Kebu ID**  
4. **Expand one country at a time** — end-to-end slice per country, not 54 partial configs  

---

## Country module contents (template)

| Area | Examples |
|------|----------|
| Legal structures | sole prop, SARL, cooperative, nonprofit, … |
| Registration fields | registry IDs, tax IDs, addresses |
| Required documents | ID, proof of address, statutes |
| Payments | Wave, Orange Money, local cards where supported |
| Shipping / tax | defaults for commerce |
| Opportunity data | Opportunity OS country pack API |
| Property (future) | Africa Lens verification rules |

Store as versioned config + migrations — e.g. `lib/countries/sn/` or DB `country_modules` table when built.

---

## Expansion slice order

```
1. Module schema + admin/versioning
2. Senegal (SN) — reference module (Phase One)
3. Next country only when prior module TESTED end-to-end
```

---

## Forbidden

- Copy-paste `if country === 'SN'` across 200 files  
- Fake “supports 54 countries” UI without backend modules  
- Country-specific law presented as verified without sources  

---

## Related docs

- `docs/BUSINESS-REGISTRATION-SLICE-1.md`  
- `docs/OPPORTUNITY-COUNTRY-EXPLORER.md`  
- `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`
