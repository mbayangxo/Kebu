"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import Link from "next/link";
import { BRAND_NAMING_FORMULAS, PACKAGING_REQUIREMENTS, TIKTOK_STRATEGIES } from "@/lib/data/branding-playbook";
import { BRAND_DEEP_DIVES } from "@/lib/data/brand-deep-dives";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

const AFRICAN_COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "Senegal", "South Africa", "Rwanda", "Morocco",
  "Côte d'Ivoire", "Ethiopia", "Tanzania", "Uganda", "Cameroon", "Burkina Faso",
  "Mali", "Togo", "Benin", "Egypt", "Tunisia", "Algeria", "Angola",
];

const TARGET_MARKETS = [
  "Nigeria", "Ghana", "Senegal", "Kenya", "South Africa", "West Africa", "East Africa",
  "UK diaspora", "France diaspora", "USA diaspora", "Canada diaspora",
  "Amazon USA", "Amazon UK", "Amazon Germany", "TikTok Shop UK",
  "Etsy global", "Instagram direct", "China (Xiaohongshu / Red)", "UAE",
];

const SOCIAL_PLATFORMS = [
  { id: "tiktok", name: "TikTok", regions: "Global, especially US/UK/Germany", note: "Best for product discovery and going viral" },
  { id: "tiktok-shop", name: "TikTok Shop", regions: "UK, USA, Germany, SE Asia", note: "In-app checkout — huge for impulse buys" },
  { id: "instagram", name: "Instagram", regions: "Global — strong in Nigeria, UK, France, US", note: "Best for premium brand building and diaspora" },
  { id: "xiaohongshu", name: "Xiaohongshu (RED)", regions: "China", note: "250M monthly active — beauty and lifestyle dominate. Chinese Gen Z's Pinterest. Post in Mandarin." },
  { id: "whatsapp", name: "WhatsApp Broadcast", regions: "All of Africa + diaspora", note: "The #1 informal sales channel in Africa. Build a list from day one." },
  { id: "facebook", name: "Facebook Marketplace + Groups", regions: "West Africa especially", note: "Older demographic but high purchase intent in African markets" },
  { id: "youtube", name: "YouTube", regions: "East Africa (Kenya especially), Nigeria", note: "Long-form builds trust. Tutorials and documentary content work best." },
  { id: "pinterest", name: "Pinterest", regions: "USA, Europe", note: "Drives traffic. DIY, beauty, and food content is discovered years later." },
];

const PACKAGING_MARKETS = PACKAGING_REQUIREMENTS.map((r) => ({ id: r.market, label: `${r.flag} ${r.market}` }));

type Tab = "names" | "tiktok" | "packaging" | "social" | "story" | "hooks";

export default function BrandPage() {
  const [tab, setTab] = useState<Tab>("names");
  const [product, setProduct] = useState("");
  const [country, setCountry] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [packagingMarket, setPackagingMarket] = useState("European Union");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePlatform, setActivePlatform] = useState("instagram");
  const [activeDive, setActiveDive] = useState(0);

  async function runAI(prompt: string, system: string) {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, prompt }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResult(text);
      }
    } catch {
      setResult("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const BRANDING_SYSTEM = `You are Kebu's Brand Architect — a world-class creative director who specialises in building premium African brands. You understand:

- African brand strategy: heritage, origin stories, ingredient heroes, diaspora nostalgia
- Gen Z aesthetics: Y2K, quiet luxury, clean girl, Afrofuturism, cottagecore — and how they apply to African products
- The difference between a commodity and a luxury is not the product — it's the story, the packaging, and the positioning
- African brands that win talk like they belong in Selfridges AND in your grandmother's kitchen at the same time
- Every brand you create should be completely unique — not duplicating what already exists
- You respect the buyer: Africa's consumer class is aspirational, brand-savvy, and growing fast. Never condescend.
- You do NOT treat Africa as one market. Senegal and Nigeria have different cultures, languages, aesthetics, and buyers
- You do NOT import the American playbook blindly — mobile-first, WhatsApp-first, community-trust-first
- You understand that informal distribution networks (market women, WhatsApp groups, church communities) move more product than formal retail in many African markets
- Local partnerships are not optional — they are the shortcut that cannot be skipped
- Brands that sprint for 12-month ROI pull out before the market knows them. Commit or don't come.
- Africa is not a risk. Not knowing it is.

When generating brand names: make them poetic, memorable, rooted in origin. Mix African languages with French or English where it creates luxury resonance. Avoid generic or corporate-sounding names. Each name should sound like it already exists in a Selfridges beauty hall or a premium airport shop.

Format your output beautifully with clear sections. Be specific. Be opinionated. Sound like a brilliant creative director in a pitch meeting, not a chatbot generating bullet points.`;

  function generateNames() {
    if (!product || !country) return;
    runAI(
      `Generate 5 unique, premium brand names for this African product:

Product: ${product}
Country of origin: ${country}
Target market: ${targetMarket || "African diaspora + international premium"}
Target customer: ${targetCustomer || "not specified"}

For each name, provide:
1. The name itself (make it feel like it already belongs in a luxury store)
2. The meaning or inspiration (etymology, cultural reference, place, person)
3. The brand world it lives in (2–3 sentences describing the aesthetic, the feeling, who wears/uses/buys it)
4. A tagline (6 words max — punchy and evocative)
5. Which naming formula it uses (Origin Story, Ancestor Name, Ingredient Hero, Founder's Confidence, or Feeling Name)

Make each of the 5 names completely different from each other in approach, aesthetic, and market positioning. One should feel luxurious, one should feel activist/purpose-driven, one should feel Gen Z/cool, one should feel heritage/traditional, one should feel modern African premium.

Do NOT create names that sound like existing brands. Do NOT use generic words like "Gold," "Royal," "Elite," or "Africa" alone. Be specific, surprising, and memorable.`,
      BRANDING_SYSTEM
    );
  }

  function generateStory() {
    if (!product || !country) return;
    runAI(
      `Write a brand origin story for this African product brand:

Product: ${product}
Country of origin: ${country}
Target market: ${targetMarket || "African diaspora + international premium"}
Target customer: ${targetCustomer || "not specified"}

Write it in 3 versions:

VERSION 1: The 30-second pitch (for Instagram bio, packaging back copy, or first email)
— conversational, warm, makes you feel something. Written in first person as if the founder is speaking.

VERSION 2: The full brand story (for website About page)
— 3–4 paragraphs. Begins with a vivid scene (the farm, the grandmother's kitchen, the market, the moment of realization). Talks about what the world was getting wrong. Talks about why this product had to exist. Ends with the mission.

VERSION 3: The 10-word brand purpose line
— simpler than a tagline. The sentence that lives on the packaging. Should feel like a manifesto, not a marketing line.

Make all three feel real and specific — not generic African heritage clichés. Mention specific places, traditions, and details that make it clear this brand knows where it comes from.`,
      BRANDING_SYSTEM
    );
  }

  function generateHooks() {
    if (!product || !country) return;
    runAI(
      `Generate 15 TikTok hooks for this African product brand:

Product: ${product}
Country of origin: ${country}
Target market: ${targetMarket || "diaspora + international"}

Create hooks in 5 categories:

CATEGORY 1: The Contrast Hook (Africa price vs. Western brand price)
— 3 hooks. E.g. "Josie Maran sells argan oil for $72. I'm from Morocco. Watch what we do differently."

CATEGORY 2: The Secret Knowledge Hook (what Africans know that the world doesn't)
— 3 hooks. E.g. "My grandmother's skin at 70 has never touched retinol. Here's what she actually uses."

CATEGORY 3: The Process Hook (show don't tell)
— 3 hooks. E.g. "POV: You're watching how [product] gets made from scratch in [country]"

CATEGORY 4: The Business Transparency Hook (economics, margins, real numbers)
— 3 hooks. E.g. "This jar costs me $3 to make. Here's why I price it at $28 and why that's still fair."

CATEGORY 5: The Identity/Pride Hook (for African and diaspora audience)
— 3 hooks. E.g. "They told us Africa doesn't produce quality. This is our response."

For each hook, also give:
- The first visual (what the camera shows in the first 2 seconds)
- Best posting time (day of week + time)
- Predicted audience (who will see it organically)`,
      BRANDING_SYSTEM
    );
  }

  function generatePackagingBrief() {
    if (!product) return;
    const req = PACKAGING_REQUIREMENTS.find((r) => r.market === packagingMarket);
    runAI(
      `Create a complete packaging and label brief for this product being sold in ${packagingMarket}:

Product: ${product}
Country of origin: ${country || "Africa"}
Target market: ${packagingMarket}

${req ? `Regulatory requirements for ${packagingMarket}:
Mandatory on label: ${req.mandatory_on_label.join("; ")}
Common mistakes to avoid: ${req.common_mistakes.join("; ")}
Certification needed: ${req.certification_needed}
Pro tip: ${req.pro_tip}` : ""}

Please provide:

1. LABEL REQUIREMENTS CHECKLIST
— Every piece of text that must appear on the label by law (as a checklist they can print and tick)

2. PACKAGING DESIGN BRIEF
— Size recommendations for the product type
— Materials that work for this product category (glass, tin, kraft paper, etc.)
— Color palette suggestions (based on African origin, heritage, and ${packagingMarket} market aesthetics)
— Typography direction (serif for luxury, sans-serif for clean/modern, etc.)
— What to avoid (what makes it look cheap or untrustworthy in ${packagingMarket})

3. COPY FOR THE PACKAGING
— Product name placeholder
— Front face copy (hero claim in 5–8 words)
— Back panel ingredient list format
— Back panel story/brand text (50–75 words)
— Back panel usage instructions format

4. CERTIFICATION ROADMAP
— What certifications to get and in what order
— Rough cost and timeline for each
— Which certification gives the best price premium in ${packagingMarket}

5. FIRST PACKAGING RUN
— Minimum viable approach (where to print, what quantity, realistic cost)
— Where to find affordable packaging suppliers in ${country || "Africa"} or online`,
      BRANDING_SYSTEM
    );
  }

  const selectedPlatform = SOCIAL_PLATFORMS.find((p) => p.id === activePlatform)!;

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      {/* Hero */}
      <div className="bg-deep-green text-ivory py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/15 px-3 py-1.5 rounded-full mb-5">
            BRAND BUILDER
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Build a brand world.<br />Not just a product.
          </h1>
          <p className="text-ivory/75 text-lg max-w-2xl leading-relaxed">
            Gen Z doesn&apos;t buy products — they buy worlds. Your African ingredient deserves a brand that lives in
            Selfridges AND your grandmother&apos;s kitchen. Let&apos;s build it.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-6">
          <AiEngineDisclaimer compact />
        </div>

        {/* Input form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Tell us about your product</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Your product</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. shea butter skincare, moringa powder, hibiscus tea, leather bags"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Country of origin</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold"
              >
                <option value="">Select country</option>
                {AFRICAN_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Target market</label>
              <select
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold"
              >
                <option value="">Select market (optional)</option>
                {TARGET_MARKETS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Target customer (optional)</label>
              <input
                type="text"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="e.g. African women 25–45, diaspora Gen Z, natural hair community"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex overflow-x-auto gap-2 mb-6 scrollbar-hide pb-1">
          {([
            { id: "names", label: "Brand Names" },
            { id: "story", label: "Brand Story" },
            { id: "hooks", label: "TikTok Hooks" },
            { id: "packaging", label: "Packaging Brief" },
            { id: "social", label: "Where to Sell" },
            { id: "tiktok", label: "TikTok Playbook" },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setResult(""); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all flex-shrink-0 ${
                tab === t.id
                  ? "bg-deep-green text-ivory border-deep-green"
                  : "bg-white text-ink border-border hover:border-deep-green"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Brand Names */}
        {tab === "names" && (
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-ink mb-3">5 naming formulas that build premium brands</h3>
              <div className="space-y-3">
                {BRAND_NAMING_FORMULAS.map((f) => (
                  <div key={f.formula} className="border border-border rounded-xl p-4">
                    <p className="text-sm font-bold text-ink mb-1">{f.formula}</p>
                    <p className="text-xs text-muted mb-2 leading-relaxed">{f.how_it_works}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.examples.map((ex) => (
                        <span key={ex} className="text-[10px] px-2 py-0.5 bg-gold/10 text-gold-dark rounded-full font-medium">{ex}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-deep-green rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ivory mb-2">Generate 5 names for your brand</h3>
              <p className="text-ivory/70 text-sm mb-4">
                AI will generate 5 completely different names — each with a brand world, tagline, and positioning.
              </p>
              <button
                onClick={generateNames}
                disabled={!product || !country || loading}
                className="bg-gold text-deep-green font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Building your brand names..." : "Generate 5 unique names →"}
              </button>
              {(!product || !country) && (
                <p className="text-ivory/50 text-xs mt-2">Fill in your product and country first</p>
              )}
            </div>

            {result && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{result}</div>
                {loading && <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />}
              </div>
            )}
          </div>
        )}

        {/* Tab: Brand Story */}
        {tab === "story" && (
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-ink mb-3">Why your story is your most valuable asset</h3>
              <p className="text-sm text-muted leading-relaxed mb-3">
                No brand can tell your story better than you. Josie Maran can talk about argan oil.
                But only a Moroccan woman can say &ldquo;my grandmother pressed this oil from trees her grandfather planted.&rdquo;
                That sentence is worth more than any marketing budget.
              </p>
              <div className="bg-gold/10 border border-gold/20 rounded-xl p-4">
                <p className="text-xs font-bold text-gold-dark mb-2">What makes a brand story land</p>
                <ul className="space-y-1">
                  {[
                    "Specific place, specific person, specific moment — not generic 'Africa'",
                    "The problem you saw that nobody was solving",
                    "The ingredient or tradition the world was ignoring",
                    "Why YOU are the right person to build this",
                    "What success looks like — not just for you, but for your community",
                  ].map((item, i) => (
                    <li key={i} className="text-xs text-ink flex gap-2">
                      <span className="text-gold flex-shrink-0">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-deep-green rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ivory mb-2">Generate your brand story</h3>
              <p className="text-ivory/70 text-sm mb-4">You&apos;ll get three versions: 30-second pitch, full website story, and a 10-word brand purpose line.</p>
              <button
                onClick={generateStory}
                disabled={!product || !country || loading}
                className="bg-gold text-deep-green font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Writing your story..." : "Write my brand story →"}
              </button>
            </div>

            {result && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{result}</div>
                {loading && <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />}
              </div>
            )}
          </div>
        )}

        {/* Tab: TikTok Hooks */}
        {tab === "hooks" && (
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-ink mb-3">The 5 hook types that work for African brands</h3>
              <div className="space-y-2">
                {[
                  { type: "Contrast hook", example: "'Josie Maran sells argan oil for $72. I'm from Morocco. Here's what we do differently.'" },
                  { type: "Secret knowledge hook", example: "'My grandmother's skin at 70 has never touched retinol. Here's what she actually uses.'" },
                  { type: "Process hook", example: "'POV: You're watching how shea butter gets made from scratch in Ghana.'" },
                  { type: "Business transparency hook", example: "'This jar costs me $3 to make. Here's why I price it at $28.'" },
                  { type: "Identity/pride hook", example: "'They told us Africa doesn't produce quality. This is our response.'" },
                ].map(({ type, example }) => (
                  <div key={type} className="border border-border rounded-xl p-3">
                    <p className="text-xs font-bold text-ink mb-1">{type}</p>
                    <p className="text-[10px] text-muted italic leading-snug">{example}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-deep-green rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ivory mb-2">Generate 15 TikTok hooks for your brand</h3>
              <p className="text-ivory/70 text-sm mb-4">5 hooks across each type, with first visual and best posting time for each.</p>
              <button
                onClick={generateHooks}
                disabled={!product || !country || loading}
                className="bg-gold text-deep-green font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Writing your hooks..." : "Generate 15 hooks →"}
              </button>
            </div>

            {result && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{result}</div>
                {loading && <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />}
              </div>
            )}
          </div>
        )}

        {/* Tab: Packaging Brief */}
        {tab === "packaging" && (
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-ink mb-4">Which market are you packaging for?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {PACKAGING_MARKETS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPackagingMarket(m.id)}
                    className={`text-sm font-medium px-3 py-2 rounded-xl border transition-all text-left ${
                      packagingMarket === m.id
                        ? "bg-deep-green text-ivory border-deep-green"
                        : "bg-white border-border text-ink hover:border-gold"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {PACKAGING_REQUIREMENTS.filter((r) => r.market === packagingMarket).map((req) => (
                <div key={req.market} className="space-y-3">
                  <div className="bg-red-earth/10 border border-red-earth/20 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-earth mb-2">Common mistakes for {req.market}</p>
                    <ul className="space-y-1">
                      {req.common_mistakes.map((m, i) => (
                        <li key={i} className="text-xs text-red-earth flex gap-2">
                          <span className="flex-shrink-0">✗</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gold/10 border border-gold/20 rounded-xl p-3">
                    <p className="text-xs font-bold text-gold-dark mb-1">Pro tip</p>
                    <p className="text-xs text-ink leading-relaxed">{req.pro_tip}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-deep-green rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ivory mb-2">Generate complete packaging brief</h3>
              <p className="text-ivory/70 text-sm mb-4">
                Get a full checklist of everything that must be on your label for {packagingMarket},
                design direction, copy templates, and certification roadmap.
              </p>
              <button
                onClick={generatePackagingBrief}
                disabled={!product || loading}
                className="bg-gold text-deep-green font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Building your brief..." : `Generate ${packagingMarket} packaging brief →`}
              </button>
            </div>

            {result && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{result}</div>
                {loading && <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />}
              </div>
            )}
          </div>
        )}

        {/* Tab: Where to Sell (Social Platforms) */}
        {tab === "social" && (
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-ink mb-4">Choose the right platform for your market</h3>
              <p className="text-sm text-muted mb-4 leading-relaxed">
                One platform strategy will not work across Africa. Senegal is WhatsApp and Facebook.
                Lagos is Instagram and TikTok. Nairobi is YouTube and Instagram. London diaspora is TikTok Shop.
                Chinese luxury buyers are on Xiaohongshu. Choose where your specific customer actually is.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                {SOCIAL_PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlatform(p.id)}
                    className={`text-sm font-medium px-3 py-2 rounded-xl border transition-all text-left ${
                      activePlatform === p.id
                        ? "bg-deep-green text-ivory border-deep-green"
                        : "bg-white border-border text-ink hover:border-gold"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="bg-warm-ivory rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-bold text-ink">{selectedPlatform.name}</p>
                  <span className="text-[10px] bg-gold/10 text-gold-dark px-2 py-0.5 rounded-full font-medium flex-shrink-0">{selectedPlatform.regions}</span>
                </div>
                <p className="text-sm text-muted mb-4 leading-relaxed">{selectedPlatform.note}</p>

                {selectedPlatform.id === "xiaohongshu" && (
                  <div className="bg-red-earth/10 border border-red-earth/30 rounded-xl p-4 text-sm">
                    <p className="font-bold text-red-earth mb-2">Selling on Xiaohongshu (RED) — the China opportunity</p>
                    <ul className="space-y-2 text-red-earth text-xs">
                      <li>• 250M+ monthly active users — mostly women, 18–35, urban China</li>
                      <li>• African beauty, food, and craft products are genuinely novel to this audience</li>
                      <li>• Post in Mandarin (use a translator — this is not optional)</li>
                      <li>• Short video + photo notes format — quality photography matters here</li>
                      <li>• Partner with a Chinese KOL (Key Opinion Leader) for your first push</li>
                      <li>• Register a Chinese business entity OR partner with a Chinese distributor first</li>
                      <li>• Product categories that work: natural beauty, exotic food, handcraft, fashion</li>
                    </ul>
                  </div>
                )}

                {selectedPlatform.id === "whatsapp" && (
                  <div className="bg-light-green/10 border border-light-green/30 rounded-xl p-4 text-sm">
                    <p className="font-bold text-mid-green mb-2">WhatsApp Broadcast — the most underrated sales tool in Africa</p>
                    <ul className="space-y-2 text-mid-green text-xs">
                      <li>• Build your broadcast list from day one — every customer who buys, add them</li>
                      <li>• Post 3–5 times per week: product photos, behind-the-scenes, customer reviews</li>
                      <li>• Use WhatsApp Business — it lets you create a catalog and quick replies</li>
                      <li>• Status updates reach your whole list — post high-quality photos there daily</li>
                      <li>• Partner with market women and trusted community figures to share your broadcast link</li>
                      <li>• WhatsApp Pay is live in Nigeria and India — enable it for frictionless checkout</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-deep-green text-ivory rounded-2xl p-5">
              <p className="text-gold text-xs font-bold uppercase tracking-widest mb-2">The Africa market principles</p>
              <div className="space-y-2.5">
                {[
                  "Do not treat Africa as one market. Senegal and Nigeria are different countries, different cultures, different buyers.",
                  "Mobile-first, community-trust-first, WhatsApp-first. These run the real economy.",
                  "Do not skip local partnerships. The brands that win move with local operators who have existing trust and distribution.",
                  "Do not underestimate the middle class. Aspirational positioning works — condescending 'affordable' positioning loses.",
                  "Commit to the timeline. Brands that sprint for 12-month ROI pull out before the market knows them.",
                  "Africa is not a risk. Not knowing it is.",
                ].map((p, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-gold font-bold flex-shrink-0">{i + 1}</span>
                    <p className="text-ivory/80 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: TikTok Playbook */}
        {tab === "tiktok" && (
          <div className="space-y-4">
            {TIKTOK_STRATEGIES.map((strategy) => (
              <div key={strategy.category} className="bg-white border border-border rounded-2xl p-5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-full mb-3">
                  {strategy.category}
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-ink mb-2">Posting cadence</p>
                  <p className="text-sm text-muted leading-relaxed">{strategy.posting_cadence}</p>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-ink mb-2">Hook formulas</p>
                  <div className="space-y-1.5">
                    {strategy.hook_formulas.slice(0, 4).map((h, i) => (
                      <div key={i} className="bg-warm-ivory rounded-lg px-3 py-2 text-xs text-ink italic">
                        &ldquo;{h}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-ink mb-2">5 content pillars</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {strategy.content_pillars.map((p, i) => (
                      <div key={i} className="flex gap-2 text-xs text-muted">
                        <span className="text-gold flex-shrink-0 font-bold">{i + 1}</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-light-green/10 border border-light-green/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-mid-green mb-1">What performs best</p>
                    <p className="text-xs text-mid-green leading-relaxed">{strategy.what_performs_best}</p>
                  </div>
                  <div className="bg-red-earth/10 border border-red-earth/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-red-earth mb-1">What kills reach</p>
                    <p className="text-xs text-red-earth leading-relaxed">{strategy.what_kills_reach}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-ink mb-2">Your first 30 days</p>
                  <div className="space-y-2">
                    {strategy.first_30_days.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-deep-green text-ivory text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-xs text-ink leading-snug">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Brand Deep Dives section — always visible at bottom */}
        <div className="mt-8">
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">
            Who built $100M+ brands from African ingredients — and what you can learn from them
          </p>
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
            {BRAND_DEEP_DIVES.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setActiveDive(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all flex-shrink-0 ${
                  activeDive === i
                    ? "bg-red-900 text-ivory border-red-900"
                    : "bg-white text-ink border-border hover:border-red-900"
                }`}
              >
                {BRAND_DEEP_DIVES[i].brand_name}
              </button>
            ))}
          </div>

          {BRAND_DEEP_DIVES.map((dive, i) => (
            <div key={dive.id} className={i === activeDive ? "block" : "hidden"}>
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="bg-red-900 text-ivory p-6">
                  <p className="text-gold text-xs font-bold uppercase tracking-widest mb-1">{dive.brand_name}</p>
                  <p className="text-2xl font-display font-bold mb-1">{dive.annual_revenue_est}/year</p>
                  <p className="text-ivory/70 text-sm">{dive.founder.name} · {dive.founder.from} · Founded {dive.founded}</p>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Who they actually are</p>
                    <p className="text-sm text-ink leading-relaxed">{dive.founder.background}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">What they built</p>
                    <p className="text-sm text-ink leading-relaxed">{dive.the_real_story}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-earth/10 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-red-earth mb-1">Africa earns</p>
                      <p className="text-xs font-bold text-red-earth">{dive.what_africa_earns}</p>
                    </div>
                    <div className="bg-warm-ivory rounded-xl p-3 text-center">
                      <p className="text-[10px] text-muted mb-1">They earn</p>
                      <p className="text-xs font-bold text-ink">{dive.what_they_earn}</p>
                    </div>
                    <div className="bg-deep-green/5 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-deep-green mb-1">Multiplier</p>
                      <p className="text-xs font-bold text-deep-green">{dive.multiplier}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gold/10 border border-gold/20 rounded-xl p-4">
                      <p className="text-xs font-bold text-gold-dark mb-1">Their TikTok angle</p>
                      <p className="text-xs text-ink leading-relaxed">{dive.tiktok_angle}</p>
                    </div>
                    <div className="bg-gold/10 border border-gold/20 rounded-xl p-4">
                      <p className="text-xs font-bold text-gold-dark mb-1">Their Instagram angle</p>
                      <p className="text-xs text-ink leading-relaxed">{dive.instagram_angle}</p>
                    </div>
                  </div>
                  <div className="bg-deep-green text-ivory rounded-xl p-5">
                    <p className="text-gold text-xs font-bold mb-2">The friend take</p>
                    <p className="text-sm text-ivory/90 leading-relaxed">{dive.the_friend_take}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink mb-2">What you can build instead</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {dive.africa_product_ideas.map((idea, j) => (
                        <div key={j} className="flex gap-2 text-xs text-ink bg-warm-ivory rounded-lg p-2.5">
                          <span className="text-gold flex-shrink-0">→</span>
                          <span>{idea}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <Link
                      href="/brand"
                      className="text-xs font-semibold text-deep-green hover:underline"
                    >
                      Build your brand around {dive.african_ingredient} →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
