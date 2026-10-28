-- Opportunity OS: unverified-example trade-intelligence content, wired in
-- verbatim from lib/data/*.ts per explicit product-owner decision. Every
-- row here is confidence='exploratory', trust_label='unverified_example' --
-- a value distinct from the real country_profiles-derived 'curated' seeds
-- in the prior migration, and rendered with a visually distinct warning
-- badge in the UI (see app/components/opportunity/trust-label-badge.tsx).
-- None of this content is independently sourced or fact-checked; treat
-- every number, company name and claim as illustrative only.

-- Generated: unverified-example seed from lib/data/*.ts. Every row below is
-- explicitly trust_label='unverified_example', confidence='exploratory'.
-- None of this content is independently sourced; it is wired in verbatim
-- per explicit product-owner decision, labeled so the UI never presents it
-- at the same trust level as the real country_profiles-derived seeds above.

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-senegal-packaged-rice-mostly-thai-and-vietnamese-jasmine-rice', 'SN', 'Packaged rice — mostly Thai and Vietnamese jasmine rice',
  '$350–$450 million/year. The Casamance region in southern Senegal grows premium jasmine rice that experts say rivals Thai jasmine quality. Yet 80% of rice eaten in Dakar is imported from Asia. Local rice is sold in bulk with no packaging at below-market prices while Thai rice sits on Auchan shelves for 3× the price.',
  'Casamance has 80,000+ hectares of irrigated rice fields. The soil and climate are ideal. The gap is milling, packaging, and branding.',
  'Casamance has 80,000+ hectares of irrigated rice fields. The soil and climate are ideal. The gap is milling, packaging, and branding.', 'Package Casamance jasmine rice in 1kg and 5kg retail bags. Sell in Dakar supermarkets (Auchan, Prix, Casino) at the same price as Thai rice. Export to the French Senegalese diaspora on Amazon France and in Château Rouge market Paris — where packaged ''authentic Casamance rice'' would command a premium.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: The Casamance region in southern Senegal grows premium jasmine rice that experts say rivals Thai jasmine quality. Yet 80% of rice eaten in Dakar is imported from Asia. Local rice is sold in bulk with no packaging at below-market prices while Thai rice sits on Auchan shelves for 3× the price.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-senegal-cooking-oil-palm-oil-and-soybean-oil-from-europe-and-asia', 'SN', 'Cooking oil — palm oil and soybean oil from Europe and Asia',
  '$200–$280 million/year. Senegal is the Peanut Basin — one of the world''s historically important groundnut-producing regions. Senegalese peanut oil (huile d''arachide) is richer and more flavourful than industrial palm oil. Yet industrial palm oil is imported from Malaysia and sold in Auchan while Senegalese groundnut farmers sell raw nuts at commodity price.',
  '600,000+ tons of groundnuts produced annually in the Peanut Basin (Kaolack, Kaffrine, Diourbel). Local cold-press oil production has been proven by small artisan producers.',
  '600,000+ tons of groundnuts produced annually in the Peanut Basin (Kaolack, Kaffrine, Diourbel). Local cold-press oil production has been proven by small artisan producers.', 'Cold-pressed artisan groundnut oil, bottled with proper labeling, sold as ''Sénégal Premium Peanut Oil'' in Dakar restaurants, hotels, and supermarkets. Export to West African diaspora in France as a premium cooking oil.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Senegal is the Peanut Basin — one of the world''s historically important groundnut-producing regions. Senegalese peanut oil (huile d''arachide) is richer and more flavourful than industrial palm oil. Yet industrial palm oil is imported from Malaysia and sold in Auchan while Senegalese groundnut farmers sell raw nuts at commodity price.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-senegal-dairy-products-imported-milk-powder-yogurt-butter-from-europe', 'SN', 'Dairy products — imported milk powder, yogurt, butter from Europe',
  '$150–$200 million/year. The Fulani (Peul) herders of Linguère and the Ferlo region in northern Senegal manage hundreds of thousands of cattle. During the rainy season (July–October), cows produce so much milk that herders literally cannot collect it fast enough — calves drink what they can, and the rest is lost. Meanwhile, Dakar supermarkets sell European butter, Dutch milk powder, and French UHT milk.',
  'The Fulani do not throw the milk away carelessly — the problem is they have no infrastructure to preserve it. Without refrigeration, fresh milk spoils in 4–6 hours in Linguère''s heat. If you don''t milk the cow regularly, it''s painful for the animal and affects future milk production. The milk is there. The problem is collection and cold chain.',
  'The Fulani do not throw the milk away carelessly — the problem is they have no infrastructure to preserve it. Without refrigeration, fresh milk spoils in 4–6 hours in Linguère''s heat. If you don''t milk the cow regularly, it''s painful for the animal and affects future milk production. The milk is there. The problem is collection and cold chain.', 'Mobile pasteurization unit ($5,000–$15,000) traveling the Ferlo circuit. Collect milk from 50 Fulani herders. Pasteurize on-site. Sell fresh pasteurized milk to Dakar within 24 hours. This is exactly what Laiterie du Berger built — they raised $10M doing this. The model is proven and replicable.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: The Fulani (Peul) herders of Linguère and the Ferlo region in northern Senegal manage hundreds of thousands of cattle. During the rainy season (July–October), cows produce so much milk that herders literally cannot collect it fast enough — calves drink what they can, and the rest is lost. Meanwhile, Dakar supermarkets sell European butter, Dutch milk powder, and French UHT milk.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-senegal-canned-and-smoked-fish-sardines-from-morocco-tuna-from-spain-and-thail', 'SN', 'Canned and smoked fish — sardines from Morocco, tuna from Spain and Thailand',
  '$80–$120 million/year. Senegal has one of the richest fishing zones in the world — the Atlantic coast from Dakar to Saint-Louis. Thiès and Kayar are among West Africa''s most productive fishing ports. And yet European (French, Spanish) and Asian fleets pay licensing fees to fish Senegalese waters, process the catch on their ships or in their factories, and sell canned products back to Senegalese consumers.',
  'Kayar alone lands 50,000+ tons of fish per year. Most is sold fresh or as dried linguère. No industrial canning operation exists in Senegal.',
  'Kayar alone lands 50,000+ tons of fish per year. Most is sold fresh or as dried linguère. No industrial canning operation exists in Senegal.', 'Artisanal canned thiof (grouper) and sardines from Kayar and Saint-Louis. The process: heat-treat in jars or cans, seal, label. Sell to Dakar restaurants, hotels, and supermarkets as ''Pêché au Sénégal.'' Export canned Senegalese sardines to the French diaspora market and specialty food stores in Paris.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Senegal has one of the richest fishing zones in the world — the Atlantic coast from Dakar to Saint-Louis. Thiès and Kayar are among West Africa''s most productive fishing ports. And yet European (French, Spanish) and Asian fleets pay licensing fees to fish Senegalese waters, process the catch on their ships or in their factories, and sell canned products back to Senegalese consumers.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-senegal-packaged-biscuits-and-confectionery-mostly-from-france-and-morocco', 'SN', 'Packaged biscuits and confectionery — mostly from France and Morocco',
  '$60–$90 million/year. Senegal imports biscuits and packaged sweets from LU (France), Bimo (Morocco), and Asian manufacturers. Yet Senegal has millet, groundnuts, hibiscus, and baobab — the natural ingredients for uniquely Senegalese snacks that no French company can authentically make.',
  'Millet is grown across Senegal and is more nutritious than refined wheat flour. Groundnuts are everywhere. Bissap is dried in bulk. Bouye (baobab) is harvested from trees that have no owners.',
  'Millet is grown across Senegal and is more nutritious than refined wheat flour. Groundnuts are everywhere. Bissap is dried in bulk. Bouye (baobab) is harvested from trees that have no owners.', 'Branded Senegalese snack range: millet biscuits, groundnut energy bars, bouye power balls. For local supermarkets and school canteens. Export to the French diaspora who misses the taste of home.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Senegal imports biscuits and packaged sweets from LU (France), Bimo (Morocco), and Asian manufacturers. Yet Senegal has millet, groundnuts, hibiscus, and baobab — the natural ingredients for uniquely Senegalese snacks that no French company can authentically make.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-nigeria-wheat-and-wheat-flour-for-bread-noodles-and-pastries', 'NG', 'Wheat and wheat flour — for bread, noodles, and pastries',
  '$2.0–$2.5 billion/year. Nigeria spends more on wheat flour imports than any other African country, despite having cassava — a root crop that can substitute wheat flour in bread (cassava-wheat blend, 40% cassava, requires government-backed certification) and that Nigeria produces 60 million tons of per year.',
  'Nigeria is the world''s largest cassava producer. Cassava flour is a direct wheat substitute for baked goods. The Nigerian government has a 40% cassava flour inclusion mandate for bread — but enforcement is weak because local cassava flour processing capacity is limited.',
  'Nigeria is the world''s largest cassava producer. Cassava flour is a direct wheat substitute for baked goods. The Nigerian government has a 40% cassava flour inclusion mandate for bread — but enforcement is weak because local cassava flour processing capacity is limited.', 'Cassava flour processing and supply to bakeries. A mill processing 10 tons/day can supply 200+ bakeries. The Federal Ministry of Agriculture supports this. BOI (Bank of Industry) has agro-processing loan products specifically for cassava value addition.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Nigeria spends more on wheat flour imports than any other African country, despite having cassava — a root crop that can substitute wheat flour in bread (cassava-wheat blend, 40% cassava, requires government-backed certification) and that Nigeria produces 60 million tons of per year.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-nigeria-fish-frozen-fish-from-russia-norway-iceland', 'NG', 'Fish — frozen fish from Russia, Norway, Iceland',
  '$1.0–$1.5 billion/year. Nigeria has the Atlantic coast to the south, Lake Chad to the north, and the Niger and Benue rivers running through the country — some of Africa''s richest freshwater and coastal fisheries. Yet imported frozen fish (mackerel, herring) dominates the market because domestic fish processing cannot meet urban demand.',
  'Nigeria''s artisanal fish catch is 700,000+ tons/year. The problem is post-harvest loss — 30–50% of fish spoils before reaching markets without adequate cold chain. A third of what Nigeria imports is fish that Nigeria''s own waters produce but Nigeria''s infrastructure cannot preserve.',
  'Nigeria''s artisanal fish catch is 700,000+ tons/year. The problem is post-harvest loss — 30–50% of fish spoils before reaching markets without adequate cold chain. A third of what Nigeria imports is fish that Nigeria''s own waters produce but Nigeria''s infrastructure cannot preserve.', 'Cold storage and ice supply at fishing ports. Small fish processing and packaging (smoked fish, dried fish, canned fish). The fish is there — the infrastructure gap is the business.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Nigeria has the Atlantic coast to the south, Lake Chad to the north, and the Niger and Benue rivers running through the country — some of Africa''s richest freshwater and coastal fisheries. Yet imported frozen fish (mackerel, herring) dominates the market because domestic fish processing cannot meet urban demand.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-nigeria-palm-oil-semi-refined-and-refined-from-malaysia-and-indonesia', 'NG', 'Palm oil — semi-refined and refined, from Malaysia and Indonesia',
  '$300–$500 million/year. Nigeria was the world''s largest palm oil producer until the 1970s. Malaysian palm oil companies got their seedlings from Nigeria, built modern plantations, and now sell processed palm oil back to Nigeria at premium prices.',
  'Nigeria still produces 1.5 million tons of palm oil per year but most is processed by small artisan mills with poor quality control. The Cross River and Edo state palm belts are vast. The problem is consistent quality and industrial processing capacity.',
  'Nigeria still produces 1.5 million tons of palm oil per year but most is processed by small artisan mills with poor quality control. The Cross River and Edo state palm belts are vast. The problem is consistent quality and industrial processing capacity.', 'Small-scale modern palm oil mill with quality certification. Supply Shoprite, Spar, and Hubmart supermarkets with branded Nigerian palm oil. The premium product market (organic, artisan, red palm oil for health market) is growing in the US and UK.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Nigeria was the world''s largest palm oil producer until the 1970s. Malaysian palm oil companies got their seedlings from Nigeria, built modern plantations, and now sell processed palm oil back to Nigeria at premium prices.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-nigeria-tomato-paste-from-china-and-italy', 'NG', 'Tomato paste — from China and Italy',
  '$300–$400 million/year. Nigeria is Africa''s largest fresh tomato producer — 2.5 million tons per year. But 50% of all tomatoes rot before reaching the market due to lack of processing infrastructure. Meanwhile, Nigeria imports tomato paste from China (made partly from Nigerian tomato concentrate re-exported to China) at $300M+ per year.',
  'Fresh tomatoes — in abundance. Kano and Kaduna grow most of Nigeria''s tomatoes. The problem: no tomato processing factories near the farms.',
  'Fresh tomatoes — in abundance. Kano and Kaduna grow most of Nigeria''s tomatoes. The problem: no tomato processing factories near the farms.', 'Small tomato processing facility near Kano farming zones. Tomato paste, sundried tomatoes, tomato powder. The Dangote Group tried this at scale and faced problems — but small-scale processing near farms is proven to work. Government has provided incentives through the Tomato Industrial Zone in Kano.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Nigeria is Africa''s largest fresh tomato producer — 2.5 million tons per year. But 50% of all tomatoes rot before reaching the market due to lack of processing infrastructure. Meanwhile, Nigeria imports tomato paste from China (made partly from Nigerian tomato concentrate re-exported to China) at $300M+ per year.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-ghana-finished-chocolate-and-confectionery-swiss-belgian-uk-brands', 'GH', 'Finished chocolate and confectionery — Swiss, Belgian, UK brands',
  '$40–$60 million/year. Ghana produces 20% of the world''s cocoa. Swiss and Belgian companies send finished chocolate to Ghanaian supermarkets (Shoprite, MaxMart, Game) at $4–$20 per bar while Ghanaian farmers earn $2–$3 per kg for the raw beans used to make those bars. Lindt Excellence 100g retails for $4.50 in Ghana — made from Ghanaian cocoa.',
  'The cocoa. COCOBOD certification. Growing artisan chocolate scene in Accra (Fairafric, Niche Cocoa, Chocolate Ghana).',
  'The cocoa. COCOBOD certification. Growing artisan chocolate scene in Accra (Fairafric, Niche Cocoa, Chocolate Ghana).', 'Origin chocolate bars. ''Made in Ghana from Ghanaian cocoa'' is a powerful differentiator for the European and US market. EU deforestation regulation (2023) now requires traceable supply chains — creating direct buyer relationships for Ghanaian chocolate brands. Fairafric already sells Ghanaian-made chocolate in German supermarkets.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Ghana produces 20% of the world''s cocoa. Swiss and Belgian companies send finished chocolate to Ghanaian supermarkets (Shoprite, MaxMart, Game) at $4–$20 per bar while Ghanaian farmers earn $2–$3 per kg for the raw beans used to make those bars. Lindt Excellence 100g retails for $4.50 in Ghana — made from Ghanaian cocoa.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-ghana-shea-butter-cosmetics-imported-from-france-usa-uk', 'GH', 'Shea butter cosmetics — imported from France, USA, UK',
  '$20–$40 million/year. Northern Ghana (Tamale, Bolgatanga) is in the global shea belt — one of the world''s most productive shea regions. Most shea is exported raw to Europe and returned as The Body Shop or SheaMoisture products at 80× the raw price.',
  'Raw shea kernels, traditional shea processing knowledge, Northern Ghana women''s cooperatives that have been extracting shea for generations.',
  'Raw shea kernels, traditional shea processing knowledge, Northern Ghana women''s cooperatives that have been extracting shea for generations.', 'Refined shea butter products: body butter, lip balm, hair treatment, baby care. Sell locally to Shoprite and Koala Supermarket. Export to UK and US on Amazon and Etsy.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Northern Ghana (Tamale, Bolgatanga) is in the global shea belt — one of the world''s most productive shea regions. Most shea is exported raw to Europe and returned as The Body Shop or SheaMoisture products at 80× the raw price.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-ghana-rice-from-usa-thailand-vietnam-india', 'GH', 'Rice — from USA, Thailand, Vietnam, India',
  '$500–$600 million/year. Ghana has the Volta River basin and irrigation infrastructure. Upper East region produces local rice. Yet 70% of rice consumed is imported. USAID and the Ghanaian government have been subsidizing US rice imports since the 1990s.',
  'Local rice varieties grown in northern Ghana and the Volta region.',
  'Local rice varieties grown in northern Ghana and the Volta region.', 'Branded packaged local Ghana rice — ''Volta Gold'' or ''Northern Harvest'' — sold in Accra supermarkets at a slight premium to imported rice with a ''Buy Ghana, Grow Ghana'' story.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Ghana has the Volta River basin and irrigation infrastructure. Upper East region produces local rice. Yet 70% of rice consumed is imported. USAID and the Ghanaian government have been subsidizing US rice imports since the 1990s.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-kenya-instant-coffee-nescaf-jacobs-made-in-switzerland-and-germany', 'KE', 'Instant coffee (Nescafé, Jacobs) — made in Switzerland and Germany',
  '$30–$50 million/year. Kenyan Nyeri and Kirinyaga AA arabica is among the world''s 5 most prized coffees. Blue Bottle, Starbucks, and Peet''s pay $20–$40 for 250g of roasted Kenyan beans. Yet Kenyan supermarkets (Naivas, Quickmart, Carrefour) sell Nescafé instant — made in Europe from commodity Robusta — instead of local roasted Kenyan specialty coffee.',
  'Kenya has the finest arabica in the world. Nairobi has a growing specialty coffee café scene. The Kenya Coffee Directorate regulates export but also supports domestic branding.',
  'Kenya has the finest arabica in the world. Nairobi has a growing specialty coffee café scene. The Kenya Coffee Directorate regulates export but also supports domestic branding.', 'Direct-to-consumer roasted Kenyan specialty coffee: subscriptions for the diaspora, Amazon gourmet food listings, Naiva supermarket''s premium shelves. Kerchanshe (Ethiopia) has shown that African-origin branded coffee sells globally. Kenya can do the same.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Kenyan Nyeri and Kirinyaga AA arabica is among the world''s 5 most prized coffees. Blue Bottle, Starbucks, and Peet''s pay $20–$40 for 250g of roasted Kenyan beans. Yet Kenyan supermarkets (Naivas, Quickmart, Carrefour) sell Nescafé instant — made in Europe from commodity Robusta — instead of local roasted Kenyan specialty coffee.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-kenya-avocado-oil-from-mexico-and-chile', 'KE', 'Avocado oil — from Mexico and Chile',
  '$10–$20 million/year. Kenya is one of the world''s top 5 avocado producers — Murang''a and Meru counties produce Hass avocados year-round. The avocado is exported raw to Europe for $0.50–$1.50 per fruit. Cold-pressed avocado oil made from that same fruit retails for $12–$25 per 100ml in Holland & Barrett (UK). Mexico and Chile have built $1B+ avocado oil industries using this arbitrage.',
  'Murang''a county has the highest concentration of Hass avocado trees in the world per capita. There is no industrial avocado oil pressing facility in Kenya.',
  'Murang''a county has the highest concentration of Hass avocado trees in the world per capita. There is no industrial avocado oil pressing facility in Kenya.', 'Cold-pressed avocado oil plant near Murang''a. Food-grade for cooking, cosmetic-grade for hair and skin. Sell to Holland & Barrett UK, Amazon UK, and European organic food distributors.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Kenya is one of the world''s top 5 avocado producers — Murang''a and Meru counties produce Hass avocados year-round. The avocado is exported raw to Europe for $0.50–$1.50 per fruit. Cold-pressed avocado oil made from that same fruit retails for $12–$25 per 100ml in Holland & Barrett (UK). Mexico and Chile have built $1B+ avocado oil industries using this arbitrage.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-kenya-cooking-oil-palm-oil-from-malaysia-sunflower-oil-from-ukraine', 'KE', 'Cooking oil — palm oil from Malaysia, sunflower oil from Ukraine',
  '$200–$300 million/year. Kenya has avocado oil, coconut oil, sunflower oil from Rift Valley farming — and still imports most cooking oil.',
  'Sunflower is grown in Kitale and Trans Nzoia. Coconut in Kwale and Kilifi coastal counties. Avocado everywhere in central Kenya.',
  'Sunflower is grown in Kitale and Trans Nzoia. Coconut in Kwale and Kilifi coastal counties. Avocado everywhere in central Kenya.', 'Local cold-pressed sunflower and coconut oil — branded for supermarket shelves. Naivas, Quickmart, and Carrefour Kenya.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Kenya has avocado oil, coconut oil, sunflower oil from Rift Valley farming — and still imports most cooking oil.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note, local_production_status,
  raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-morocco-cosmetics-and-beauty-products-mostly-french-and-spanish-brands', 'MA', 'Cosmetics and beauty products — mostly French and Spanish brands',
  '$600–$800 million/year. Morocco has near-monopoly on argan oil. It has the roses of Kelaat M''Gouna (Rose Valley) — some of the world''s finest rose water and rose essential oil. It has ghassoul clay (unique mineral clay used in hammams and high-end beauty spas). It has saffron from Taliouine — one of the world''s top saffron varieties. Every ingredient for a world-class beauty brand comes from Moroccan soil. Yet Moroccan women buy L''Oréal and Yves Rocher from France.',
  'Everything. Argan trees that grow nowhere else in the world. Rose Valley with 3,000 tons of roses harvested each year. Ghassoul clay mined only in the Atlas Mountains. Taliouine saffron.',
  'Everything. Argan trees that grow nowhere else in the world. Rose Valley with 3,000 tons of roses harvested each year. Ghassoul clay mined only in the Atlas Mountains. Taliouine saffron.', 'A Moroccan-made premium beauty brand using argan, rose, ghassoul, and saffron — sold as ''made in Morocco from Morocco.'' Sephora and ASOS Marketplace are accessible for Moroccan brands. Amazon EU is wide open. Marjane and Label''Vie supermarkets are the local market.',
  '{}', '{}', '{}',
  'mixed', 'Unverified example claim, not fact-checked: Morocco has near-monopoly on argan oil. It has the roses of Kelaat M''Gouna (Rose Valley) — some of the world''s finest rose water and rose essential oil. It has ghassoul clay (unique mineral clay used in hammams and high-end beauty spas). It has saffron from Taliouine — one of the world''s top saffron varieties. Every ingredient for a world-class beauty brand comes from Moroccan soil. Yet Moroccan women buy L''Oréal and Yves Rocher from France.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/import-export-gaps.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-deep-senegal', 'Senegal: unverified local-resource gaps', 'SN',
  'Every home, shop, and business that installs solar reduces load on the grid and saves money. The solar market is the largest infrastructure opportunity in Senegal right now.', array['Lac Rose — The Pink Lake: Raw salt at Lac Rose: 75–150 FCFA/kg ($0.12–$0.25). Branded premium pink salt in European supermarkets: €40–€80/kg. A 200% markup at minimum, often 300–500%. The pink color and the story — which are entirely Lac Rose''s — are being sold by European brands who never went to Senegal.','Atlantic Fisheries — 718km of Africa''s Richest Coastline: Raw catch at beach landing: 100–300 FCFA/kg ($0.17–$0.52). Processed and packaged fish in European supermarkets: €5–€15/kg. The processing — gutting, freezing, packaging, branding — happens in Spain, France, and the Netherlands. Senegal is left with the environmental impact of overfishing and none of the processing value.','Bissap (Hibiscus) — Senegal''s Global Flower: Dried bissap at Dakar market: 1,000–2,000 FCFA/kg ($1.75–$3.50). Premium branded hibiscus tea (10 bags): $8–$15 in US Whole Foods. The global herbal tea market is $4B+. Senegal grows the star ingredient. No major Senegalese brand exists in export markets.'],
  'Unverified example content imported verbatim; every figure and claim needs independent fact-checking before any product or investment decision.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-deep-ghana', 'Ghana: unverified local-resource gaps', 'GH',
  'Solar rooftop systems, UPS backup systems, generator servicing, LED lighting upgrades for businesses, energy auditing.', array['Cocoa — Ghana Grows It, Switzerland Profits: Raw cocoa at farm gate: $0.30–$0.50/kg. Processed cocoa butter: $6–$8/kg. Artisan Ghana 70% chocolate (retail bar): $6–$15. Ghana could earn 10–20x its current revenue by processing cocoa into chocolate domestically.','Gold — The Ashanti Heritage, Now Owned by Mining Companies: Ghana exports gold worth $6B+ annually. Ghana''s gold jewelry artisan industry — the goldsmiths of Kumasi and Accra, trained in techniques going back 400+ years to the Ashanti empire — produces beautiful, technically accomplished work that is not connecting to global markets.','Shea Butter — Ghanaian Women Collect It, L''Oréal Sells It: Raw shea at collection point: $0.30–$0.60/kg. Refined cosmetic-grade shea butter: $8–$15/kg. Branded retail shea cream: $15–$50 per 200ml. AAK processes shea in Ghana and exports — but the brand, the product, and the retail margin all belong to European companies.'],
  'Unverified example content imported verbatim; every figure and claim needs independent fact-checking before any product or investment decision.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-deep-nigeria', 'Nigeria: unverified local-resource gaps', 'NG',
  'Solar rooftop systems, solar mini-grids for underserved communities, battery storage systems, energy audit services. The generator fuel bill alone tells you the market size.', array['Oil & Gas — Nigeria Has It. Foreign Companies Own the Refining.: Crude oil: $70–$90/barrel. Refined petrol: $0.70–$1.00/litre at import price ($4–$5/barrel equivalent). Nigeria sends away crude and buys back fuel at 5–8x the crude cost. When Dangote Refinery reaches full capacity, it will eliminate Nigeria''s fuel import bill — and create a massive local supply chain opportunity.','Tomatoes — Imported as Paste After Nigeria Grew the Tomatoes: Fresh tomatoes at Kano wholesale: ₦200–₦500/kg. Tomato paste (from imported concentrate) at Lagos retail: ₦2,000+ per kg equivalent. A tomato processing plant can capture 8–10x the raw tomato price in finished goods revenue.','Leather — Kano''s 1,000-Year-Old Tannery, Still Exporting Raw: Raw hides: ₦2,000–₦5,000/piece. Finished leather handbag: ₦80,000–₦500,000 in Nigerian luxury market. At international quality and branding standards, Aba leather goods would sell in London, Paris, and New York.'],
  'Unverified example content imported verbatim; every figure and claim needs independent fact-checking before any product or investment decision.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-deep-kenya', 'Kenya: unverified local-resource gaps', 'KE',
  'Motorcycle logistics (like MAX.ng in Nigeria), aggregation platforms, cold storage near farms, rural e-commerce.', array['Coffee — Kenya AA Is the World''s Most Expensive. Farmers Earn Almost Nothing.: Coffee cherry at farm gate: $0.30–$0.80/kg. Processed green bean: $4–$8/kg. Specialty roasted Kenya AA retail (250g): $20–$45. A Kenyan roaster who captures even 20% of the retail value of Kenyan coffee earns 5–10x the current export earnings.','Avocados — Kenya Grows, Europe Profits: Kenyan avocado at farm gate: KSh 5–15/piece ($0.035–$0.10). In UK Tesco: £0.50–£1.00 each ($0.60–$1.20). The difference is transport, packing, ripening management, and retail relationship — all of which could be partially captured by Kenyan exporters.'],
  'Unverified example content imported verbatim; every figure and claim needs independent fact-checking before any product or investment decision.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-deep-ethiopia', 'Ethiopia: unverified local-resource gaps', 'ET',
  'Solar installations for SMEs during transition. Generator servicing. Energy efficiency upgrades for factories.', array['Coffee — Ethiopia Invented It, Starbucks Profits: Green bean at Addis Ababa export: $3–$8/kg. Roasted specialty coffee retail: $15–$40/kg. Starbucks ''Ethiopia'' blend (250g): $18–$25. The Yirgacheffe farmer earned $1–$2 worth of that $25 bag.','Leather & Shoes — Ethiopia''s Most Successful Manufacturing Sector: Ethiopian leather factory worker earns $60–$100/month making shoes that retail for $120–$300 in Europe. The markup between manufacturing cost and retail price is 5–10x, all captured by the European brand.'],
  'Unverified example content imported verbatim; every figure and claim needs independent fact-checking before any product or investment decision.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_trade_gaps (
  slug, origin_country_code, destination_country_code, product_category, gap_description,
  logistics_notes, regulatory_notes, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-trade-senegal-ghana', 'SN', 'GH',
  'Lac Rose — The Pink Lake',
  'Unverified example: Senegal''s "Lac Rose — The Pink Lake" (Raw salt at Lac Rose: 75–150 FCFA/kg ($0.12–$0.25). Branded premium pink salt in European supermarkets: €40–€80/kg. A 200% markup at minimum, often 300–500%. The pink color and the story — which are entirely Lac Rose''s — are being sold by European brands who never went to Senegal.) framed against Ghana''s demand side -- not a sourced trade-flow finding.',
  null, null, 'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_trade_gaps (
  slug, origin_country_code, destination_country_code, product_category, gap_description,
  logistics_notes, regulatory_notes, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-trade-ghana-nigeria', 'GH', 'NG',
  'Cocoa — Ghana Grows It, Switzerland Profits',
  'Unverified example: Ghana''s "Cocoa — Ghana Grows It, Switzerland Profits" (Raw cocoa at farm gate: $0.30–$0.50/kg. Processed cocoa butter: $6–$8/kg. Artisan Ghana 70% chocolate (retail bar): $6–$15. Ghana could earn 10–20x its current revenue by processing cocoa into chocolate domestically.) framed against Nigeria''s demand side -- not a sourced trade-flow finding.',
  null, null, 'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_trade_gaps (
  slug, origin_country_code, destination_country_code, product_category, gap_description,
  logistics_notes, regulatory_notes, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-trade-nigeria-kenya', 'NG', 'KE',
  'Oil & Gas — Nigeria Has It. Foreign Companies Own the Refining.',
  'Unverified example: Nigeria''s "Oil & Gas — Nigeria Has It. Foreign Companies Own the Refining." (Crude oil: $70–$90/barrel. Refined petrol: $0.70–$1.00/litre at import price ($4–$5/barrel equivalent). Nigeria sends away crude and buys back fuel at 5–8x the crude cost. When Dangote Refinery reaches full capacity, it will eliminate Nigeria''s fuel import bill — and create a massive local supply chain opportunity.) framed against Kenya''s demand side -- not a sourced trade-flow finding.',
  null, null, 'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_trade_gaps (
  slug, origin_country_code, destination_country_code, product_category, gap_description,
  logistics_notes, regulatory_notes, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-trade-kenya-ethiopia', 'KE', 'ET',
  'Coffee — Kenya AA Is the World''s Most Expensive. Farmers Earn Almost Nothing.',
  'Unverified example: Kenya''s "Coffee — Kenya AA Is the World''s Most Expensive. Farmers Earn Almost Nothing." (Coffee cherry at farm gate: $0.30–$0.80/kg. Processed green bean: $4–$8/kg. Specialty roasted Kenya AA retail (250g): $20–$45. A Kenyan roaster who captures even 20% of the retail value of Kenyan coffee earns 5–10x the current export earnings.) framed against Ethiopia''s demand side -- not a sourced trade-flow finding.',
  null, null, 'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/country-deep-profiles.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-sector-construction-building-materials', 'Construction & Building Materials: unverified sector gap', 'NG',
  'You don''t need cement to build Africa. Africa built itself for 5,000 years without Portland cement — which was only invented in 1824. Compressed earth, rammed earth, laterite stone, and bamboo are stronger, cooler, and more sustainable than concrete in tropical climates. The switch to concrete created a $14B/year import dependency that funds European and Chinese companies. CEB breaks that dependency completely.', array['Nigeria','Ghana','Kenya','Ethiopia','Senegal','Rwanda','Tanzania','Uganda','Morocco','Côte d''Ivoire'],
  'Unverified example content imported verbatim from an unsourced sector dossier; company revenue figures, market sizes and claims here are illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/sector-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-sector-food-processing-fmcg', 'Food Processing & FMCG: unverified sector gap', 'NG',
  'Unilever has sold Africans Knorr seasoning cubes since 1941 — made from yeast extract, salt, and palm oil. Dawadawa does exactly the same thing naturally and is nutritionally superior. The difference is a brand name, a cube shape, and 80 years of marketing. You can make the African version. You already have the raw material. You already have the recipe. You need the packaging and the story.', array['Nigeria','Ghana','Kenya','South Africa','Ethiopia','Senegal','Côte d''Ivoire','Tanzania'],
  'Unverified example content imported verbatim from an unsourced sector dossier; company revenue figures, market sizes and claims here are illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/sector-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-sector-textiles-fashion-leather', 'Textiles, Fashion & Leather: unverified sector gap', 'NG',
  'A Dutch company has been making ''African'' fabric in the Netherlands and selling it to Africans since 1846. Vlisco fabric is not made in Africa. The most iconic African print is European-manufactured. You can make the real thing in Africa, with African weavers, for less than Vlisco''s production cost — and sell it as authentic at premium price. The authenticity IS the product.', array['Nigeria','Ghana','South Africa','Kenya','Ethiopia','Morocco','Senegal','Côte d''Ivoire'],
  'Unverified example content imported verbatim from an unsourced sector dossier; company revenue figures, market sizes and claims here are illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/sector-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-sector-agribusiness-farm-input', 'Agribusiness & Farm Input: unverified sector gap', 'NG',
  'Africa feeds the world and cannot feed itself. This is not a coincidence — it is a system. European and American companies control seed supply, input pricing, commodity buying prices, and export logistics. African farmers are the most productive link in a chain where they receive the least value. The entry point for an African entrepreneur is aggregation, processing, and direct export — cutting out the Singapore and Dutch middlemen who take the margin.', array['Nigeria','Kenya','Ghana','Ethiopia','Tanzania','Uganda','Rwanda','Senegal','Zambia','Mozambique'],
  'Unverified example content imported verbatim from an unsourced sector dossier; company revenue figures, market sizes and claims here are illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/sector-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-sector-beauty-personal-care', 'Beauty & Personal Care: unverified sector gap', 'MA',
  'Unilever acquired SheaMoisture (a Black-owned natural beauty brand) in 2017 for $850 million. The brand was built on West African ingredients — shea, black soap, coconut. A Black woman (Richelieu Dennis, founder''s son) took African ingredients, branded them for the African diaspora in the US, and built a $850M company. That same play is available to entrepreneurs in Lagos, Accra, and Dakar — sourcing the same ingredients even more cheaply.', array['Morocco','Ghana','Nigeria','Senegal','Kenya','South Africa','Burkina Faso','Ethiopia'],
  'Unverified example content imported verbatim from an unsourced sector dossier; company revenue figures, market sizes and claims here are illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/sector-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-sector-finance-payments-microfinance', 'Finance, Payments & Microfinance: unverified sector gap', 'KE',
  'Wave built a $1.7 billion company by charging 0% fees in a market where everyone else charged 5–8%. The market was there. The customers were there. The technology was there. The only thing missing was someone willing to undercut the colonial-era fee structure. In every African financial service — insurance, remittance, lending, savings — a version of this opportunity exists. The question is: where are the foreign extractors charging the highest fees?', array['Kenya','Nigeria','Ghana','Rwanda','South Africa','Tanzania','Uganda','Senegal'],
  'Unverified example content imported verbatim from an unsourced sector dossier; company revenue figures, market sizes and claims here are illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/sector-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-brand-1-cocoa-beans', 'Brand value comparison: Cocoa beans', 'GH',
  '{"raw_material":"Cocoa beans","african_countries":["Ghana","Côte d''Ivoire","Nigeria","Cameroon"],"africa_earns":"$2.50–$3.00/kg raw cocoa beans at farm gate","global_brands":[{"brand":"Lindt","product":"Excellence 70% Dark 100g","retail_price":"$4.50","per_kg":"$45/kg"},{"brand":"Godiva","product":"Assorted gift box 19pc","retail_price":"$40.00","per_kg":"$200/kg"},{"brand":"Tony''s Chocolonely","product":"Dark Chocolate 180g","retail_price":"$5.99","per_kg":"$33/kg"},{"brand":"Ferrero Rocher","product":"Gift Box 24pc","retail_price":"$18.00","per_kg":"$112/kg"}],"multiplier":"13–80× what Africa earns","your_product":"Origin artisan chocolate bar (72% Ghana / CIV cocoa, origin-branded)","your_price_range":"$8–$25 per 100g bar","market_size":"$130 billion global chocolate industry"}', array['Ghana','Côte d''Ivoire','Nigeria','Cameroon'],
  'Unverified example content naming real companies and specific price/margin claims, imported verbatim per explicit product-owner decision. None of this has been independently fact-checked -- treat every company name, price and margin figure here as illustrative only, not verified fact, and do not republish externally without review.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-brand-2-argan-oil', 'Brand value comparison: Argan oil', 'MA',
  '{"raw_material":"Argan oil","african_countries":["Morocco"],"africa_earns":"$8–$12/kg raw argan oil (bulk export to Europe)","global_brands":[{"brand":"Josie Maran","product":"Pure Argan Oil 1.7 fl oz","retail_price":"$48.00","per_kg":"$950/kg"},{"brand":"Moroccanoil","product":"Treatment 3.4 fl oz","retail_price":"$46.00","per_kg":"$450/kg"},{"brand":"The Ordinary","product":"Organic Argan Oil 30ml","retail_price":"$13.90","per_kg":"$463/kg"},{"brand":"L''Oréal","product":"EverPure Argan Shampoo","retail_price":"$9.00","per_kg":"$40/kg"}],"multiplier":"40–100× what Morocco earns per kg","your_product":"Certified organic cold-pressed argan oil, branded with origin story","your_price_range":"$25–$60 per 50ml bottle","market_size":"$600 million argan oil beauty market (growing 8%/year)"}', array['Morocco'],
  'Unverified example content naming real companies and specific price/margin claims, imported verbatim per explicit product-owner decision. None of this has been independently fact-checked -- treat every company name, price and margin figure here as illustrative only, not verified fact, and do not republish externally without review.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-brand-3-shea-butter', 'Brand value comparison: Shea butter', 'GH',
  '{"raw_material":"Shea butter","african_countries":["Ghana","Burkina Faso","Mali","Nigeria","Uganda"],"africa_earns":"$0.30–$0.80/kg raw shea kernels","global_brands":[{"brand":"The Body Shop","product":"Shea Body Butter 380ml","retail_price":"$28.00","per_kg":"$74/kg"},{"brand":"L''Occitane","product":"Shea Hand Cream 150ml","retail_price":"$30.00","per_kg":"$200/kg"},{"brand":"Burt''s Bees","product":"Shea Body Lotion 170g","retail_price":"$14.00","per_kg":"$82/kg"},{"brand":"SheaMoisture","product":"Shea Butter & Oats Mask","retail_price":"$13.00","per_kg":"$65/kg"}],"multiplier":"90–250× what Africa earns per kg","your_product":"Refined shea butter + body lotion / hair butter range","your_price_range":"$15–$40 per 250g jar","market_size":"$2.5 billion shea beauty market (fastest-growing natural ingredient)"}', array['Ghana','Burkina Faso','Mali','Nigeria','Uganda'],
  'Unverified example content naming real companies and specific price/margin claims, imported verbatim per explicit product-owner decision. None of this has been independently fact-checked -- treat every company name, price and margin figure here as illustrative only, not verified fact, and do not republish externally without review.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-brand-4-hibiscus-bissap-zobo', 'Brand value comparison: Hibiscus / Bissap / Zobo', 'SN',
  '{"raw_material":"Hibiscus / Bissap / Zobo","african_countries":["Senegal","Nigeria","Mali","Egypt","Sudan"],"africa_earns":"$1.50–$3.00/kg dried hibiscus flowers","global_brands":[{"brand":"Stash Tea","product":"Hibiscus Herbal Tea 36ct","retail_price":"$8.00","per_kg":"$222/kg"},{"brand":"Tazo","product":"Passion Tea 20ct","retail_price":"$6.50","per_kg":"$162/kg"},{"brand":"Harney & Sons","product":"Hibiscus Herbal 20ct","retail_price":"$11.00","per_kg":"$274/kg"},{"brand":"VAHDAM","product":"Hibiscus Tea 200g","retail_price":"$18.00","per_kg":"$90/kg"}],"multiplier":"30–90× what African farmers earn","your_product":"Packaged hibiscus tea bags, bissap syrup concentrate, hibiscus beauty mask","your_price_range":"$8–$20 per 100g pack","market_size":"$4.3 billion herbal tea market in the US alone"}', array['Senegal','Nigeria','Mali','Egypt','Sudan'],
  'Unverified example content naming real companies and specific price/margin claims, imported verbatim per explicit product-owner decision. None of this has been independently fact-checked -- treat every company name, price and margin figure here as illustrative only, not verified fact, and do not republish externally without review.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-brand-5-moringa', 'Brand value comparison: Moringa', 'NG',
  '{"raw_material":"Moringa","african_countries":["Nigeria","Ghana","Senegal","Kenya","Ethiopia"],"africa_earns":"$0.50–$1.50/kg raw moringa leaves","global_brands":[{"brand":"Amazing Grass","product":"Moringa Powder 240g","retail_price":"$30.00","per_kg":"$125/kg"},{"brand":"Kuli Kuli","product":"Pure Moringa Powder 4oz","retail_price":"$20.00","per_kg":"$176/kg"},{"brand":"Organic India","product":"Moringa Powder 100g","retail_price":"$14.00","per_kg":"$140/kg"},{"brand":"Garden of Life","product":"Raw Moringa 120 caps","retail_price":"$25.00","per_kg":"$125/kg"}],"multiplier":"47–176× more than raw leaves","your_product":"Dried moringa powder, capsules, moringa tea bags, moringa baby food fortifier","your_price_range":"$15–$35 per 250g","market_size":"$9 billion superfoods market (moringa is top 5 fastest-growing)"}', array['Nigeria','Ghana','Senegal','Kenya','Ethiopia'],
  'Unverified example content naming real companies and specific price/margin claims, imported verbatim per explicit product-owner decision. None of this has been independently fact-checked -- treat every company name, price and margin figure here as illustrative only, not verified fact, and do not republish externally without review.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-brand-6-kenyan-ethiopian-coffee', 'Brand value comparison: Kenyan / Ethiopian coffee', 'KE',
  '{"raw_material":"Kenyan / Ethiopian coffee","african_countries":["Kenya","Ethiopia","Rwanda","Uganda"],"africa_earns":"$3–$5/kg green (unroasted) beans","global_brands":[{"brand":"Starbucks","product":"Reserve Kenya 250g","retail_price":"$18.00","per_kg":"$72/kg"},{"brand":"Blue Bottle","product":"Kenya Single Origin 8oz","retail_price":"$22.00","per_kg":"$97/kg"},{"brand":"Peet''s","product":"Kenya AA 12oz","retail_price":"$19.95","per_kg":"$59/kg"},{"brand":"Counter Culture","product":"Ethiopia Kochere 12oz","retail_price":"$20.00","per_kg":"$59/kg"}],"multiplier":"12–20× what farmers earn","your_product":"Direct-to-consumer roasted specialty coffee with farm story and subscription model","your_price_range":"$20–$45 per 250g bag","market_size":"$495 billion global coffee market"}', array['Kenya','Ethiopia','Rwanda','Uganda'],
  'Unverified example content naming real companies and specific price/margin claims, imported verbatim per explicit product-owner decision. None of this has been independently fact-checked -- treat every company name, price and margin figure here as illustrative only, not verified fact, and do not republish externally without review.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-brand-7-cashew-nuts', 'Brand value comparison: Cashew nuts', 'CI',
  '{"raw_material":"Cashew nuts","african_countries":["Côte d''Ivoire","Ghana","Nigeria","Mozambique","Tanzania"],"africa_earns":"$0.90–$1.50/kg raw cashew nuts (exported to Vietnam for processing)","global_brands":[{"brand":"Planters","product":"Salted Cashews 8oz","retail_price":"$8.00","per_kg":"$18/kg"},{"brand":"John B. Sanfilippo","product":"Whole Cashews 24oz","retail_price":"$14.00","per_kg":"$13/kg"},{"brand":"Artisana Organics","product":"Raw Cashew Butter 16oz","retail_price":"$16.00","per_kg":"$35/kg"},{"brand":"Nuttzo","product":"Cashew Butter 12oz","retail_price":"$13.00","per_kg":"$38/kg"}],"multiplier":"10–25× more than raw","your_product":"Roasted flavored cashews (honey, chili, natural) + cashew butter + cashew milk","your_price_range":"$6–$15 per 200g pack","market_size":"$6.7 billion global cashew market"}', array['Côte d''Ivoire','Ghana','Nigeria','Mozambique','Tanzania'],
  'Unverified example content naming real companies and specific price/margin claims, imported verbatim per explicit product-owner decision. None of this has been independently fact-checked -- treat every company name, price and margin figure here as illustrative only, not verified fact, and do not republish externally without review.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-waste-1-fish-waste-heads-bones-scales-skin-offal', 'Waste-to-value: Fish waste (heads, bones, scales, skin, offal)', 'SN',
  '{"waste_stream":"Fish waste (heads, bones, scales, skin, offal)","source":"Artisanal fishing, fish landing sites, fish smoking and processing markets","african_context":"West and East Africa together land 6M+ tons of fish per year. 30–40% is waste — heads, scales, bones, guts — left at the beach or sold as low-grade cheap fertilizer. Virtually none is value-added.","waste_volume":"2–2.5 million tons/year","products":[{"name":"Fish meal (animal feed)","market":"Poultry farms, fish farms, livestock feed — massive local demand","price":"$400–$600/ton","equipment":"Fish dryer + hammer mill","equipment_cost":"$2,000–$8,000","alibaba_search":"fish meal processing machine small scale"},{"name":"Fish collagen powder (beauty supplement)","market":"US/EU beauty supplement — fastest growing ingredient category 2024–2026","price":"$40–$80 per 200g retail","equipment":"Hydrolysis reactor + spray dryer","equipment_cost":"$8,000–$25,000","alibaba_search":"fish collagen extraction hydrolysis machine"},{"name":"Fish oil (omega-3 supplement)","market":"Global health supplement — $2B+ market dominated by Norway and Peru","price":"$15–$30 per 60 softgels","equipment":"Oil press + encapsulation machine","equipment_cost":"$5,000–$15,000","alibaba_search":"fish oil cold press extraction machine"}],"real_example":"In Senegal, ENDA Graf turns Kayar fish waste into fish meal for local aquaculture. In Kenya, women''s groups in Kisumu process Nile perch offal into fish powder for school feeding programs.","countries":["Senegal","Ghana","Nigeria","Kenya","Tanzania","Mozambique","Ivory Coast"]}', array['Senegal','Ghana','Nigeria','Kenya','Tanzania','Mozambique','Ivory Coast'],
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-waste-2-dairy-waste-excess-milk-whey-buttermilk', 'Waste-to-value: Dairy waste — excess milk, whey, buttermilk', 'NG',
  '{"waste_stream":"Dairy waste — excess milk, whey, buttermilk","source":"Fulani / Mbororo pastoral herders, small dairy farms, cooperative dairies","african_context":"Fulani herders manage 25M+ cattle across West Africa and the Sahel. During peak lactation seasons, cows produce more milk than can be sold fresh without cold chain. Hundreds of millions of litres are wasted or sold too cheaply every year.","waste_volume":"Hundreds of millions of litres per season across West and East Africa","products":[{"name":"Wagashi / Wara fresh cheese (traditional but brandable)","market":"Urban Benin, Nigeria, Burkina Faso — already eaten, needs packaging and branding","price":"$2–$5 locally; $8–$15 export specialty African cheese","equipment":"Pasteurizer + cheese press + packaging","equipment_cost":"$800–$4,000","alibaba_search":"small scale cheese making equipment pasteurizer"},{"name":"Fura da Nono style yogurt / fermented dairy","market":"Branded yogurt in Lagos, Accra, Dakar, Abidjan — urban middle class pays for convenience and branding","price":"$0.50–$2 locally; $4–$8 in diaspora markets","equipment":"Pasteurizer + yogurt incubator + filling machine","equipment_cost":"$1,000–$5,000","alibaba_search":"small yogurt production machine 50L"},{"name":"Whey protein powder","market":"Sports nutrition — fastest-growing health category in Nigeria, Ghana, Kenya, South Africa","price":"$30–$60 per 1kg bag","equipment":"Evaporator + spray dryer (large investment)","equipment_cost":"$15,000–$50,000","alibaba_search":"whey protein powder spray dryer small"}],"real_example":"Laiterie du Berger (Senegal) collects milk from 1,500+ Fulani herders and makes Dolima yogurt — now stocked in Auchan, Casino, and exported. They''ve raised $10M+ and created 200+ jobs. The model is replicable across Wes', array['Nigeria','Senegal','Burkina Faso','Mali','Niger','Ghana','Kenya','Ethiopia'],
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-waste-3-cocoa-pod-husks-and-shells', 'Waste-to-value: Cocoa pod husks and shells', 'GH',
  '{"waste_stream":"Cocoa pod husks and shells","source":"Cocoa bean harvesting — every ton of beans produces 10 tons of husk","african_context":"Ghana and Côte d''Ivoire alone produce 900,000+ tons of cocoa husks per season. Almost all is left to rot in the field or burned — despite containing potassium, pectin, and energy value. It is the largest single agricultural waste stream in West Africa.","waste_volume":"Millions of tons per cocoa season","products":[{"name":"Cocoa pod ash — organic potassium fertilizer","market":"Local farmers (soap making + fertilizer), organic fertilizer export","price":"$150–$300/ton","equipment":"Kiln + grinder + bagging machine","equipment_cost":"$800–$3,000","alibaba_search":"biomass kiln small scale agricultural"},{"name":"Cascara-style cocoa pulp tea","market":"US/UK specialty tea and wellness — Koa (Netherlands) sells this to European food companies","price":"$12–$25 per 100g pack","equipment":"Pulp separator + dryer + packaging","equipment_cost":"$1,500–$6,000","alibaba_search":"fruit pulp dryer dehydrator machine"},{"name":"Biogas from fermented husks","market":"On-site energy generation — reduces diesel generator cost by $200–$500/month per facility","price":"Cost saving (not sold — used internally)","equipment":"Anaerobic biogas digester","equipment_cost":"$2,000–$8,000","alibaba_search":"biogas digester small scale agricultural"}],"real_example":"Koa (Netherlands/Ghana startup) extracts cocoa pulp juice from the husk and sells it to European food companies as a novel ingredient. They''ve raised €7M. Barry Callebaut now uses cocoa pod husks to generate energy at their Ghana factory.","countries":["Ghana","Côte d''Ivoire","Nigeria","Cameroon"]}', array['Ghana','Côte d''Ivoire','Nigeria','Cameroon'],
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-waste-4-coffee-cherry-pulp-the-fruit-that-surrounds-the-bean', 'Waste-to-value: Coffee cherry pulp (the fruit that surrounds the bean)', 'ET',
  '{"waste_stream":"Coffee cherry pulp (the fruit that surrounds the bean)","source":"Coffee wet processing mills — the pulp is stripped off during washing","african_context":"For every kg of roasted coffee, 2–3kg of coffee pulp (the fruit) is discarded or dumped into rivers. Ethiopia, Kenya, Uganda, and Rwanda produce millions of tons of coffee pulp per year — causing water pollution and missed income.","waste_volume":"3–5 million tons/year across African coffee-producing nations","products":[{"name":"Cascara tea (dried coffee cherry drink)","market":"US/UK specialty beverage — Starbucks now sells cascara latte. 200g packs retail at $15–$30","price":"$15–$30 per 200g","equipment":"Pulp dryer + packaging","equipment_cost":"$1,000–$5,000","alibaba_search":"coffee pulp cherry dryer machine"},{"name":"Coffee cherry flour (high-fibre, caffeinated)","market":"US health food — sold in Whole Foods at $14/250g. Unique product, zero competition from Africa yet","price":"$10–$20 per 250g","equipment":"Dryer + mill + sifter","equipment_cost":"$2,000–$8,000","alibaba_search":"grain flour mill small capacity commercial"},{"name":"Oyster mushroom farm on coffee grounds","market":"Local restaurants, hotels, supermarkets — zero substrate cost, high-value output","price":"$4–$10/kg fresh; $20–$40/kg dried for export","equipment":"Mushroom growing bags + humidity tent + inoculation tools","equipment_cost":"$300–$2,000","alibaba_search":"oyster mushroom spawn mycelium bag"}],"real_example":"Coffee flour made from coffee pulp is sold in Whole Foods at $14/250g. It was pioneered by CF Global Holdings (Guatemala) — African coffee mills can copy this exactly. In Kenya, Githiru Women''s Group grows mushrooms on coffee grounds from local estates.","countries":["Ethiopia","Kenya","Rwanda","Uganda","', array['Ethiopia','Kenya','Rwanda','Uganda','Tanzania'],
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-waste-5-banana-peel-and-rejected-banana-plantain', 'Waste-to-value: Banana peel and rejected banana / plantain', 'UG',
  '{"waste_stream":"Banana peel and rejected banana / plantain","source":"Banana and plantain farms — 30–40% of production rejected for cosmetic reasons or lost post-harvest","african_context":"Cameroon, Côte d''Ivoire, Uganda, Nigeria, and Rwanda grow millions of tons of bananas and plantains. Up to 40% is lost post-harvest — overripe, bruised, too small for export. The peel is thrown away entirely.","waste_volume":"1–2 million tons/year of usable waste","products":[{"name":"Banana peel leather (vegan leather alternative)","market":"European sustainable fashion — Hugo Boss and H&M already use plant leather (Piñatex from pineapple). Banana version is next.","price":"$30–$80/sqm material to brands; $80–$400 finished bags","equipment":"Processing chemicals + hot press + dryer","equipment_cost":"$5,000–$20,000","alibaba_search":"vegan leather production equipment plant based"},{"name":"Banana flour (gluten-free baking)","market":"US/UK gluten-free and paleo baking — unripe banana flour is high fibre and prebiotic. $8–$15 per 500g at Whole Foods.","price":"$8–$15 per 500g","equipment":"Slicer + dryer + mill + sifter","equipment_cost":"$1,500–$6,000","alibaba_search":"banana flour processing machine dehydrator"},{"name":"Freeze-dried banana snack","market":"Fastest-growing snack category in the US — freeze-dried fruit sells at 10× fresh price with 2-year shelf life","price":"$6–$12 per 50g pack","equipment":"Freeze-dryer (key investment)","equipment_cost":"$3,000–$10,000","alibaba_search":"small commercial freeze dryer food"}],"real_example":"Kelea (Uganda) makes bags from banana fibre. Piñatex (Philippines) pioneered pineapple leaf leather and now supplies Hugo Boss, H&M, and Nike. The exact same concept applies to banana peel in Uganda, Cameroon, and Nigeria — the material is ', array['Uganda','Cameroon','Nigeria','Côte d''Ivoire','Ghana','Rwanda'],
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/brand-intelligence.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-1-italian-leather', 'Supply-chain pattern: The ''Made in Italy'' Leather Lie', 'ET',
  '{"id":"italian-leather","name":"The ''Made in Italy'' Leather Lie","tagline":"Africa grows the cow. China processes the hide. Italy stamps it. You pay $800.","the_full_story":"Here is how your ''Italian leather'' bag actually gets made. Step one: a cow is raised in Ethiopia, Kenya, or Nigeria. The hide is sold for $5–$15 at slaughter. Step two: the raw hide is exported — often to China, but also to Bangladesh, India, or Eastern Europe. Chinese tanneries in Wenzhou process it: they clean it, tan it, dye it, and cut it into leather panels. This costs China $20–$40 in labour and chemicals. Step three: the semi-finished leather panels are shipped to Italy — often to Prato, Tuscany, where there are hundreds of small workshops owned by Chinese immigrants. They do the final stitching, add the buckles and lining, and the bag gets a ''Made in Italy'' stamp. Under EU law, if the ''last substantial transformation'' happened in Italy, the product can legally be labelled Made in Italy — even if 90% of the value was added in China. Step four: the bag goes to a Milan showroom, a Galeries Lafayette counter, or a Selfridges shelf. Price: $300–$2,000. The Ethiopian rancher who raised the cow earned $15 from the hide. The Italian brand earned $1,500 from the bag.","countries_involved":["Italy","China","Bangladesh","India"],"african_countries_exploited":["Ethiopia","Kenya","Nigeria","Tanzania","Sudan","Mali"],"what_africa_provides":"Raw cattle hides — Ethiopia alone produces 10M+ hides/year, second-largest in Africa","what_they_do_with_it":"China tans and processes → Italy does final assembly → Italian brand sells globally","the_lie":"''Made in Italy'' on the label. The cow, the hide prep, and often 80–90% of the actual manufacturing happened elsewhere.","africa_earns_per_unit":"$5–$15 per raw hide"', array['Ethiopia','Kenya','Nigeria','Tanzania','Sudan','Mali'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-2-chinese-textiles', 'Supply-chain pattern: The Chinese Ankara Takeover', 'GH',
  '{"id":"chinese-textiles","name":"The Chinese Ankara Takeover","tagline":"A Dutch company sells ''African fabric.'' China copies it for $2/yard. Africans buy both.","the_full_story":"Vlisco is a Dutch company founded in 1846. They make ''Wax Hollandais'' — the fabric Africans call ''Dutch wax'' or ''Ankara.'' They''ve been selling this fabric to Africans for 180 years and building their entire brand identity around African culture while operating from Helmond, Netherlands. That alone is worth pausing on. Now add China. Chinese textile mills noticed that ''Ankara'' fabric sells at premium prices across Africa. They reverse-engineered the designs — ''African prints'' — and began producing at $1.50–$3/yard. The same fabric Vlisco sells at $25–$40/yard. Chinese ''Ankara'' has flooded markets from Lagos to Dakar to Abidjan. African textile mills — including Ghana Textiles Printing (GTP), Akosombo Textiles, ABC Wax in Nigeria — have lost business or closed entirely because they cannot compete with Chinese factory prices. The result: African women wear Chinese-made fabric at ''African'' markets, buy it from Chinese traders who often own the market stalls, in buildings built with Chinese loans, in infrastructure projects that come with Chinese labour. The value chain from raw cotton to finished dress: Africa provides the cotton, China spins it, weaves it, prints it, ships it back, and collects the money.","countries_involved":["China","Netherlands"],"african_countries_exploited":["Ghana","Nigeria","Senegal","Côte d''Ivoire","Tanzania","Kenya"],"what_africa_provides":"Raw cotton, the design heritage, the market","what_they_do_with_it":"Chinese factories produce fabric using African traditional design motifs, ship back to Africa","the_lie":"The fabric sold as ''African'' in African markets is mostly ', array['Ghana','Nigeria','Senegal','Côte d''Ivoire','Tanzania','Kenya'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-3-indian-pharma', 'Supply-chain pattern: India''s Pharmaceutical Lock on Africa', 'SN',
  '{"id":"indian-pharma","name":"India''s Pharmaceutical Lock on Africa","tagline":"Africa provides the illness. India provides the cure. At their price.","the_full_story":"Africa imports more than 90% of its pharmaceutical needs. For most countries it''s even higher — Ethiopia, Tanzania, and Nigeria each import 95%+ of all medicines consumed. The dominant supplier is India, which controls 40–50% of Africa''s pharmaceutical import market. India became the world''s pharmacy after investing heavily in generic drug manufacturing in the 1970s and 1980s — producing medicines cheaply that developed countries patent at high prices. This is genuinely beneficial in some ways: Indian generics have made HIV treatment possible for millions of Africans who couldn''t afford Western-branded versions. But the dynamic remains: Africa has no pharmaceutical manufacturing capacity to speak of, making the entire continent dependent on a single supplier nation for medicines that treat diseases many of which are uniquely African — malaria, sleeping sickness, schistosomiasis. During COVID-19, when India restricted vaccine and medicine exports, African countries had no alternative. There is no African pharmaceutical giant. The ingredients for many of these medicines — plant compounds, chemical precursors — come from Africa''s own natural pharmacy. Neem. Artemisia annua (the source of artemisinin, the most effective antimalarial). Aloe vera. Moringa. Hundreds of others. Africa exports the plant, India processes it into a tablet, Africa buys the tablet.","countries_involved":["India","China","USA","Europe"],"african_countries_exploited":["All 54 African countries"],"what_africa_provides":"Plant compounds, chemical precursors, and the disease burden that creates the market","what_they_do_with_it":"India ma', array['All 54 African countries'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-4-french-cfa', 'Supply-chain pattern: The CFA Franc: France''s Monetary Grip', 'SN',
  '{"id":"french-cfa","name":"The CFA Franc: France''s Monetary Grip","tagline":"14 African countries. One currency. Controlled by Paris.","the_full_story":"The CFA franc is used by 14 African countries: 8 in West Africa (Benin, Burkina Faso, Guinea-Bissau, Côte d''Ivoire, Mali, Niger, Senegal, Togo) and 6 in Central Africa (Cameroon, Central African Republic, Chad, Republic of Congo, Equatorial Guinea, Gabon). Combined population: 180 million people. The CFA franc was created by France in 1945 for its African colonies. Independence happened (mostly in 1960), but the currency stayed. The key mechanisms: member countries must deposit 50% of their foreign reserves with the French Treasury in Paris (lowered to 0% under a 2020 reform, but the structural dependency remains). France guarantees the currency''s value (peg to the Euro). In exchange, France has substantial influence over monetary policy for these countries. Critics — including economist Ndongo Samba Sylla and former Burkinabè president Thomas Sankara before his assassination — argue the CFA keeps Francophone African economies dependent on France, limits monetary sovereignty, and structurally disadvantages African exporters. The counterargument: the fixed exchange rate provides stability and reduces inflation in countries that would otherwise struggle with currency volatility. The debate is real. What is unambiguous: 60+ years after independence, 14 African countries do not fully control their own money.","countries_involved":["France","European Union"],"african_countries_exploited":["Senegal","Côte d''Ivoire","Mali","Burkina Faso","Cameroon","Togo","Benin","Niger","Gabon","Chad","Guinea-Bissau","Central African Republic","Republic of Congo","Equatorial Guinea"],"what_africa_provides":"Foreign reserves, monetary sovereig', array['Senegal','Côte d''Ivoire','Mali','Burkina Faso','Cameroon','Togo','Benin','Niger','Gabon','Chad','Guinea-Bissau','Central African Republic','Republic of Congo','Equatorial Guinea'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-5-dutch-wax-vlisco', 'Supply-chain pattern: Vlisco: The Dutch Company Selling ''African Heritage''', 'GH',
  '{"id":"dutch-wax-vlisco","name":"Vlisco: The Dutch Company Selling ''African Heritage''","tagline":"180 years of profit from African culture. Headquarters: Helmond, Netherlands.","the_full_story":"Vlisco was founded in 1846 in Helmond, Netherlands. It makes wax-resist printed cotton fabric — the fabric Africans call ''Dutch wax,'' ''Ankara,'' ''African wax,'' or ''real wax.'' The company was originally trying to sell batik-print fabric in Indonesia (then the Dutch East Indies). The Indonesians didn''t buy it. On the way home, they stopped in West Africa. Africans loved it. 180 years later, Vlisco sells fabric to Côte d''Ivoire, Ghana, Nigeria, Senegal, and 16 other African countries as a premium product associated with African celebration, identity, and tradition. A Vlisco fabric for a Ghanaian funeral or a Senegalese wedding costs $25–$50/yard. The fabric is entirely manufactured in the Netherlands. Vlisco owns several subsidiary brands including GTP (Ghana Textile Printing) and Uniwax (Côte d''Ivoire) — both of which produce fabric in Africa. But the Vlisco parent brand, the premium segment, is made in Europe and sold to Africa as heritage. In 2010, Vlisco was sold to a private equity firm. In 2021, it was sold again to a Mauritius-based holding company. The company''s official brand narrative calls itself a ''West African fashion brand.'' It is a Dutch textile company.","countries_involved":["Netherlands","UK (private equity history)"],"african_countries_exploited":["Ghana","Côte d''Ivoire","Nigeria","Senegal","Benin","Togo","DR Congo","Cameroon"],"what_africa_provides":"The culture, the designs (many patterns have African names and stories), the market, the identity","what_they_do_with_it":"Dutch company manufactures the fabric in Netherlands, sells to Africa as cultural heritage","', array['Ghana','Côte d''Ivoire','Nigeria','Senegal','Benin','Togo','DR Congo','Cameroon'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-6-cocoa-chocolate', 'Supply-chain pattern: Cocoa: The Richest Poor Crop on Earth', 'GH',
  '{"id":"cocoa-chocolate","name":"Cocoa: The Richest Poor Crop on Earth","tagline":"Africa grows 75% of the world''s cocoa. Africa owns less than 1% of the chocolate market.","the_full_story":"Ghana and Côte d''Ivoire together produce 65% of the world''s cocoa. Add Nigeria, Cameroon, Tanzania, and Uganda, and Africa produces roughly 75% of global supply. The global chocolate industry is worth $130 billion per year. African cocoa farmers collectively earn approximately $6 billion per year — less than 5% of the final market value. The Ghanaian farmer who grew the beans for a $4.50 Lindt bar earns roughly $0.08 from that bar. In 2020, Ghana and Côte d''Ivoire coordinated to impose a ''Living Income Differential'' — a $400/tonne premium above the benchmark price that buyers must pay. Chocolate companies — including Nestlé, Mars, Mondelēz, Hershey, Ferrero, and Barry Callebaut — lobbied hard against it, with some threatening to source from elsewhere. The premium has been partially implemented but imperfectly. None of the major chocolate brands are African. Chocolat Bonnat (France), Valrhona (France), Callebaut (Belgium) are the premium couverture chocolate companies that buy Africa''s beans and sell the refined product at 20–80× the raw price. The processing gap is structural: cocoa pods must be fermented and dried at origin (this is African value addition that does happen). Grinding into cocoa butter and powder can happen at origin — and does, increasingly. Tempering into chocolate requires temperature-controlled facilities and is capital-intensive. Ghana''s Cocoa Processing Company and Nigeria''s Crown Flour Miller are already processing locally, but the volumes are small relative to the raw export.","countries_involved":["Switzerland","Belgium","France","USA","Germany","Netherlands"', array['Ghana','Côte d''Ivoire','Nigeria','Cameroon','Tanzania','Uganda'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-7-african-fish-chinese-fleets', 'Supply-chain pattern: Chinese Fleets in African Waters', 'SN',
  '{"id":"african-fish-chinese-fleets","name":"Chinese Fleets in African Waters","tagline":"They pay $500K for a license. They take $50M of fish. They process it in China. They sell it back.","the_full_story":"China operates the world''s largest distant-water fishing fleet — roughly 3,000 vessels operating globally, with a significant concentration in West Africa (Senegal, Mauritania, Guinea, Sierra Leone, Guinea-Bissau) and East Africa (Somalia, Mozambique, Tanzania). The mechanism: fishing licenses. African governments grant access to their Exclusive Economic Zones (200 nautical miles offshore) for fees. A fishing license for a Chinese vessel to fish in Senegalese waters might cost $150,000–$500,000 per year. A single large Chinese trawler in those waters can take $5–$10 million worth of fish per year. Some vessels vastly under-report their catch. The fish is processed either on the vessel or in China, then sold to European and Asian markets. Meanwhile, Senegalese artisanal fishermen — who fish in the same waters in pirogues — find fish stocks depleted. Their catches have fallen 30–50% in some areas over the past two decades, according to environmental and fisheries researchers. Fishermen from Saint-Louis and Kayar — once among the most productive fishing communities in West Africa — are now among the most likely to attempt the perilous Atlantic crossing to Europe on pirogues, because the fish are gone.","countries_involved":["China","EU (European vessels also fish African waters)"],"african_countries_exploited":["Senegal","Mauritania","Guinea","Sierra Leone","Guinea-Bissau","Somalia","Mozambique","Tanzania"],"what_africa_provides":"Fishing rights to sovereign waters, the fish stock itself","what_they_do_with_it":"Foreign fleets extract fish at industrial scale, process o', array['Senegal','Mauritania','Guinea','Sierra Leone','Guinea-Bissau','Somalia','Mozambique','Tanzania'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-exploitation-8-belgian-congo-coltan', 'Supply-chain pattern: The Coltan Triangle: Congo''s Digital Gold', 'SN',
  '{"id":"belgian-congo-coltan","name":"The Coltan Triangle: Congo''s Digital Gold","tagline":"Your phone contains Congolese coltan. The miner earns $2/day. Apple earned $94 billion in 2023.","the_full_story":"Coltan (columbite-tantalite) is a metallic ore that, when refined, produces tantalum — a heat-resistant metal used in capacitors in virtually every smartphone, laptop, and electronic device on earth. The Democratic Republic of Congo holds approximately 60–80% of the world''s known coltan reserves. The DRC also holds vast reserves of cobalt (used in lithium-ion batteries for electric vehicles and phones), lithium, gold, diamonds, and cassiterite (tin). Congo is, on paper, one of the richest countries on earth by mineral wealth. The average Congolese person lives on $590/year — one of the lowest per capita incomes globally. The mineral extraction path: DRC artisanal miners (many of whom are children, according to multiple investigations) dig coltan from the ground. It is bought by intermediaries, often with links to armed groups. It is exported to Rwanda, Uganda, or directly to processing countries. In the DRC''s eastern provinces, armed groups — including those with links to foreign governments — control mining sites and profit from the trade. The refined tantalum goes to capacitor manufacturers, mostly in China and Japan. Those capacitors go into iPhones, Samsungs, Teslas. The companies that buy tantalum include major tech and automotive manufacturers that are required by the Dodd-Frank Act (US) and EU Conflict Minerals Regulation to conduct due diligence on their mineral supply chains.","countries_involved":["China","Rwanda","Uganda","USA","Japan","Germany","South Korea"],"african_countries_exploited":["Congo (DRC)","Rwanda (re-export)","Uganda (re-export)"],"what_afri', array['Congo (DRC)','Rwanda (re-export)','Uganda (re-export)'],
  'Unverified example content making specific claims about named countries'' real industries, imported verbatim per explicit product-owner decision. This framing (including any ''scam''/''lie'' characterization in the title) is NOT a fact-checked or legally reviewed finding about any real company, country or industry -- treat it as an illustrative hypothesis only, requiring full independent verification and legal review before any public-facing use.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/global-exploitation.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-1-packaged-rice-mostly-from-asia-despite-casamance-producing-high-qualit', 'Market gap: Packaged rice — mostly from Asia despite Casamance producing high-quality local rice', 'SN',
  '{"country":"Senegal","imported":"Packaged rice — mostly from Asia despite Casamance producing high-quality local rice","local_advantage":"Casamance region produces premium jasmine rice. Most sold at low prices in bulk with no branding.","product_ideas":["Packaged Casamance jasmine rice","Rice flour for baking","Rice bread (pain de riz)","Puffed rice snacks"],"local_buyers":["Auchan Dakar (8 stores)","Prix stations","Casino Sénégal","Marché Sandaga wholesalers","Local superettes and boutiques"],"export_channels":["Amazon FBA France (African food section)","Amazon FBA US","UK African food shops (Peckham, Brixton)","Diaspora WhatsApp groups"],"starting_capital":"$300–$800","government_program":"DER/FJ Women''s Entrepreneurship Fund — up to 1.5M CFA at 5% interest"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-2-commercial-juices-tropicana-minute-maid-imported-from-europe', 'Market gap: Commercial juices (Tropicana, Minute Maid) — imported from Europe', 'SN',
  '{"country":"Senegal","imported":"Commercial juices (Tropicana, Minute Maid) — imported from Europe","local_advantage":"Senegal produces bissap (hibiscus), ditax, tamarind, bouye (baobab) — all used in traditional drinks with no industrial packaging.","product_ideas":["Bottled bissap drink","Baobab juice (superfood export)","Hibiscus tea bags for export","Concentrated bissap syrup"],"local_buyers":["Auchan","Prix","Hospital and school canteens","Dakar restaurants and hotels"],"export_channels":["Amazon US (hibiscus tea is growing fast)","Whole Foods supplier program","UK health food stores","French supermarkets (large Senegalese diaspora)"],"starting_capital":"$200–$600","government_program":"FONSIS Youth Investment Program"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-3-industrial-peanut-oil-from-european-manufacturers-despite-senegal-bein', 'Market gap: Industrial peanut oil from European manufacturers — despite Senegal being a world-leading groundnut producer', 'SN',
  '{"country":"Senegal","imported":"Industrial peanut oil from European manufacturers — despite Senegal being a world-leading groundnut producer","local_advantage":"Casamance and Peanut Basin produce 1M+ tons of groundnuts. Most exported raw. Artisan groundnut oil is richer and more flavourful.","product_ideas":["Artisan cold-pressed groundnut oil","Groundnut butter (peanut butter)","Roasted groundnut snacks","Groundnut-based baby food"],"local_buyers":["All major Dakar supermarkets","Restaurant supply","School canteens through PNBSF program"],"export_channels":["Amazon FBA (peanut butter market is huge)","Etsy food section","African food distributors in France"],"starting_capital":"$500–$2,000","government_program":"ADPME agri-processing support"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-4-finished-chocolate-swiss-and-belgian-brands-dominate-ghanaian-supermar', 'Market gap: Finished chocolate — Swiss and Belgian brands dominate Ghanaian supermarkets despite Ghana being the world''s 2nd largest cocoa producer', 'GH',
  '{"country":"Ghana","imported":"Finished chocolate — Swiss and Belgian brands dominate Ghanaian supermarkets despite Ghana being the world''s 2nd largest cocoa producer","local_advantage":"Ghana controls 20% of world cocoa supply. Processing adds 5–10× value. EU Regulation 2023/1115 now requires deforestation-free sourcing — creating direct buyer relationships.","product_ideas":["Artisan Ghanaian chocolate bars (72% origin)","Cocoa butter (beauty market)","Cocoa powder (baking supply)","Cocoa nibs (health food)"],"local_buyers":["Shoprite Ghana","Game Ghana","MaxMart","Koala Supermarket Accra","Hotels and restaurants"],"export_channels":["UK specialty chocolate retailers","Whole Foods supplier program","Amazon Handmade","US farmers market distributors","Tony''s Chocolonely supply chain (they source directly)"],"starting_capital":"$1,000–$5,000","government_program":"Ghana Cocoa Board (COCOBOD) value-addition scheme, NEIP grant"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-5-imported-shea-based-cosmetics-from-europe-despite-ghana-being-one-of-t', 'Market gap: Imported shea-based cosmetics from Europe — despite Ghana being one of the world''s largest shea producers', 'GH',
  '{"country":"Ghana","imported":"Imported shea-based cosmetics from Europe — despite Ghana being one of the world''s largest shea producers","local_advantage":"Northern Ghana shea belt. Most shea exported as raw kernels at $0.30/kg. Refined shea butter retails for $15–$40/250g in US/UK markets.","product_ideas":["Refined unrefined shea butter","Shea body lotion","Shea hair butter","Shea lip balm","Shea + cocoa butter blend"],"local_buyers":["Shoprite Ghana","Accra Mall boutiques","Wellness stores"],"export_channels":["Amazon US (top category for natural beauty)","Etsy","Target supplier program","UK Holland & Barrett","Afrikrea marketplace"],"starting_capital":"$300–$1,500","government_program":"NEIP Ghana — up to GH₵ 100,000, Women''s Shea Cooperative support"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-6-processed-plantain-products-chips-mostly-from-latin-america-and-uk', 'Market gap: Processed plantain products — chips mostly from Latin America and UK', 'GH',
  '{"country":"Ghana","imported":"Processed plantain products — chips mostly from Latin America and UK","local_advantage":"Ghana grows abundant plantain year-round. Urban middle class wants packaged snacks. Large Ghanaian diaspora in UK/US buys plantain chips.","product_ideas":["Packaged plantain chips","Plantain flour (gluten-free market)","Freeze-dried plantain","Plantain fufu powder"],"local_buyers":["Shoprite","KFC Ghana (supply)","School feeding program","Supermarkets in Kumasi and Accra"],"export_channels":["UK African food retailers (Brixton Market, Peckham)","Amazon FBA UK","Walmart US through FBA","Whole Foods"],"starting_capital":"$200–$1,000"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-7-gluten-free-flours-cassava-flour-plantain-flour-from-uk-and-us-despite', 'Market gap: Gluten-free flours (cassava flour, plantain flour) from UK and US — despite Nigeria being the world''s largest cassava producer with 50M+ tons/year', 'NG',
  '{"country":"Nigeria","imported":"Gluten-free flours (cassava flour, plantain flour) from UK and US — despite Nigeria being the world''s largest cassava producer with 50M+ tons/year","local_advantage":"Nigeria produces more cassava than any country on Earth. In the UK and US, gluten-free cassava flour sells for $8–$15/kg. Unprocessed garri sells for $0.30/kg locally.","product_ideas":["Premium packaged cassava flour (gluten-free certified)","Branded garri in retail packaging","Cassava pasta","Cassava fufu powder export"],"local_buyers":["Shoprite Nigeria","Spar Nigeria","Hubmart Supermarkets","Market Square Lagos","Prince Ebeano Supermarket Abuja"],"export_channels":["Amazon FBA UK/US (gluten-free category is massive)","Whole Foods supplier","UK African food distributors (Deptford, Peckham)","US diaspora food shops"],"starting_capital":"$500–$3,000","government_program":"Federal Ministry of Agriculture Cassava Transformation Agenda, BOI Agric SME Loan"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-8-moringa-supplements-sold-in-nigerian-pharmacies-imported-from-india-an', 'Market gap: Moringa supplements — sold in Nigerian pharmacies imported from India and Pakistan despite moringa growing wild across Northern Nigeria', 'NG',
  '{"country":"Nigeria","imported":"Moringa supplements — sold in Nigerian pharmacies imported from India and Pakistan despite moringa growing wild across Northern Nigeria","local_advantage":"Moringa grows abundantly in Kano, Borno, and the North-Central states. On Amazon US, moringa powder sells for $15–$30/250g. India exports it processed and takes the margin.","product_ideas":["Moringa powder (health supplement)","Moringa tea bags","Moringa oil (beauty)","Moringa capsules","Moringa dried leaves"],"local_buyers":["Nigerian pharmacies and health stores","Jumia Nigeria","Konga","Health food cafes in Lagos/Abuja"],"export_channels":["Amazon FBA US/UK (moringa is a top-10 supplement search)","iHerb supplier","UK health food shops","EU organic food distributors"],"starting_capital":"$300–$1,500","government_program":"Bank of Industry Agric SME, CBN Anchor Borrowers Program"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-9-leather-bags-and-shoes-from-italy-and-china-despite-kano-having-one-of', 'Market gap: Leather bags and shoes from Italy and China — despite Kano having one of the oldest leather industries in West Africa with 700-year-old traditions', 'NG',
  '{"country":"Nigeria","imported":"Leather bags and shoes from Italy and China — despite Kano having one of the oldest leather industries in West Africa with 700-year-old traditions","local_advantage":"Kano Leather is globally recognized. Most sold unbranded at commodity price. With branding and social media, Kano leather bags can sell for $80–$300 in the US.","product_ideas":["Branded Kano leather handbags","Leather sandals (selling Nikes in Kano market, make them locally)","Corporate leather accessories (portfolios, belts)","Custom-order leather goods"],"local_buyers":["Upscale Lagos boutiques","Abuja Airport duty-free","Hotel gift shops"],"export_channels":["Etsy (African leather is a growing search)","Instagram/TikTok direct","Faire wholesale marketplace for boutiques","Amazon Handmade"],"starting_capital":"$200–$1,000","government_program":"CBN Creative Industry Financing Initiative (CIFI), BOI"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-10-specialty-coffee-in-retail-packaging-kenya-aa-coffee-is-famous-globall', 'Market gap: Specialty coffee in retail packaging — Kenya AA coffee is famous globally but Kenyans buy imported instant Nescafé at home', 'KE',
  '{"country":"Kenya","imported":"Specialty coffee in retail packaging — Kenya AA coffee is famous globally but Kenyans buy imported instant Nescafé at home","local_advantage":"Kenyan Nyeri and Kirinyaga AA arabica is among the world''s most sought-after. Specialty coffee shops in US/UK pay $20–$40 for 250g. Kenyan farmers get $0.50/kg.","product_ideas":["Direct-to-consumer roasted Kenyan coffee (subscriptions)","Branded specialty Kenyan coffee bags","Coffee tourism experiences","Coffee equipment import for local cafes"],"local_buyers":["Naivas Supermarkets (fastest growing Kenyan chain)","Carrefour Kenya","Upscale Nairobi restaurants and hotels"],"export_channels":["Own website (Shopify + Klaviyo email subscriptions)","Amazon gourmet food","UK specialty coffee shops (direct B2B)","US specialty roasters (buy green beans directly)"],"starting_capital":"$500–$3,000","government_program":"Kenya Coffee Directorate export support, Youth Enterprise Development Fund"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-11-avocado-oil-imported-from-mexico-and-chile-despite-kenya-being-one-of-', 'Market gap: Avocado oil — imported from Mexico and Chile despite Kenya being one of the world''s top 5 avocado producers', 'KE',
  '{"country":"Kenya","imported":"Avocado oil — imported from Mexico and Chile despite Kenya being one of the world''s top 5 avocado producers","local_advantage":"Murang''a and Meru counties produce Hass avocados year-round. Cold-pressed avocado oil retails for $12–$25/100ml in European beauty markets.","product_ideas":["Cold-pressed avocado oil (food grade)","Avocado oil for hair and skin (beauty)","Avocado face masks","Guacamole in jars for export"],"local_buyers":["Naivas","Quickmart","Carrefour Kenya","Nairobi hotel restaurants"],"export_channels":["UK Holland & Barrett","Amazon UK natural beauty","Germany organic beauty market","Etsy"],"starting_capital":"$400–$2,000","government_program":"KIRDI (Kenya Industrial Research Development Institute) for SME processing"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-12-packaged-cashews-despite-c-te-d-ivoire-being-the-world-s-largest-cashe', 'Market gap: Packaged cashews — despite Côte d''Ivoire being the world''s largest cashew producer, most nuts are exported raw to Vietnam for processing', 'CI',
  '{"country":"Côte d''Ivoire","imported":"Packaged cashews — despite Côte d''Ivoire being the world''s largest cashew producer, most nuts are exported raw to Vietnam for processing","local_advantage":"CIV produces 900,000 tons of cashews per year. 90% exported raw. In US/UK, roasted packaged cashews sell for $8–$15/200g. CIV gets $0.90/kg raw.","product_ideas":["Roasted packaged cashews (flavoured: honey, spicy, natural)","Cashew butter","Cashew milk","Cashew apple juice (the fruit is thrown away)"],"local_buyers":["Carrefour Abidjan","Spar CIV","Premium Abidjan hotels","Air Côte d''Ivoire in-flight snacks"],"export_channels":["Amazon FBA France (large CIV diaspora)","UK supermarket supplier (Tesco, Waitrose local brand programs)","Germany organic food trade fairs"],"starting_capital":"$500–$3,000","government_program":"Conseil du Coton et de l''Anacarde value-addition grants"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-13-beauty-products-french-and-european-brands-dominate-despite-morocco-pr', 'Market gap: Beauty products — French and European brands dominate despite Morocco producing argan, rose water, ghassoul clay, and saffron', 'MA',
  '{"country":"Morocco","imported":"Beauty products — French and European brands dominate despite Morocco producing argan, rose water, ghassoul clay, and saffron","local_advantage":"Morocco has near-monopoly on argan oil. Taliouine saffron is world-class. Roses of Kelaat M''Gouna are famous globally. Most sold as low-grade bulk.","product_ideas":["Premium argan oil (food grade + cosmetic grade)","Rose water + rose oil beauty line","Ghassoul clay face mask (trending in natural beauty)","Saffron gift sets for export"],"local_buyers":["Marjane Hypermarché","Label''Vie","Carrefour Maroc","Moroccan pharmacy chains","Tourist Marrakech souks (direct retail)"],"export_channels":["Amazon EU (argan beauty is top 20 natural beauty)","Sephora supplier program","ASOS Marketplace","Faire boutique wholesale","France (large Moroccan diaspora)"],"starting_capital":"$500–$3,000","government_program":"Maroc PME subsidy — up to 80% of investment cost, women''s cooperative support (INDH)"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, publish_status, sort_order
) values (
  'example-marketgap-14-premium-spirits-whisky-and-gin-imported-from-uk-scotland-us-south-afri', 'Market gap: Premium spirits — whisky and gin imported from UK, Scotland, US. South Africa has world-class fruit, honey, indigenous plants (rooibos, buchu, fynbos)', 'ZA',
  '{"country":"South Africa","imported":"Premium spirits — whisky and gin imported from UK, Scotland, US. South Africa has world-class fruit, honey, indigenous plants (rooibos, buchu, fynbos)","local_advantage":"South Africa''s rooibos is globally unique. Buchu is a protected indigenous plant used in medicine. Honeybush grows only in Western Cape. All underutilized in premium products.","product_ideas":["Rooibos gin and spirits","Buchu health supplement","Fynbos honey skincare range","Honeybush tea for export","African botanicals bitters and tonics"],"local_buyers":["Woolworths Food SA","Pick n Pay","Checkers","Liquor World","Upscale Cape Town/Joburg restaurants"],"export_channels":["UK specialty gin retailers","Amazon UK premium spirits","Germany natural wellness market","US Whole Foods"],"starting_capital":"$1,000–$10,000","government_program":"SEFA Youth Fund, IDC (Industrial Development Corporation) agro-processing"}', '{}',
  'Unverified example content imported verbatim; illustrative only, not fact-checked.',
  'exploratory', 'unverified_example', '[{"title":"Unverified example content — pending fact-check","type":"unverified_example","note":"Imported verbatim from lib/data/build-opportunities.ts during the Opportunity OS wiring pass; not yet independently sourced or verified. Treat every number and claim as illustrative only until fact-checked."}]'::jsonb, 'published', 100
) on conflict (slug) do nothing;

