# ADR: Brand DNA foundation + Creative Director campaigns

**Date:** 2026-09-08  
**Status:** Accepted

## Decision

1. **Brand DNA** extends `business_brand_kits` (migration **076**) with voice, photography, languages, customer/products notes, visual rules, approved imagery, tagline. UI: `/studio/brand`. API: `/api/studio/brand-dna`.  
2. **Creative Director campaign projects** are a new parent table `studio_campaign_projects` — brief · mood · linked `design_ids`. Generate pack via `/api/studio/campaigns/[id]/generate` reading Brand DNA. UI: `/studio/campaigns`.

Order: DNA first, then campaigns (campaigns must not reinvent brand tokens).
