import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ScanResult {
  product_name: string;
  product_type: string;
  african_origin: {
    material: string;
    country: string;
    local_price_raw: string;
    context: string;
  };
  retail_price_estimate: string;
  extraction_gap: {
    raw_fraction: string;
    value_added_outside: string;
    comparison: string;
  };
  local_opportunity: {
    what_to_make: string;
    start_cost: string;
    market: string;
    potential: string;
  };
  teaching_moment: string;
  confidence: "high" | "medium" | "low";
}

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;
  let rawBody: unknown;
  try { rawBody = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { imageBase64, mediaType = "image/jpeg" } = rawBody as {
    imageBase64: string;
    mediaType?: string;
  };

  if (!imageBase64) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const prompt = `You are an African supply chain analyst. A user has photographed a consumer product at a store. Your job is to trace the African raw material supply chain behind this product and show them the value that leaves Africa unprocessed.

Analyze this product and return a JSON object. Be specific about Africa — which country, which material, which communities. If the product has no plausible African origin in its raw materials, pick the most prominent ingredient/material that DOES come from Africa (almost all cocoa, shea, cotton, sesame, baobab, hibiscus, argan, rubber, coffee, tea, groundnuts, cashews, timber, leather have African origin chains).

Return ONLY valid JSON — no prose before or after:

{
  "product_name": "exact product name as seen or best guess",
  "product_type": "food / cosmetic / leather goods / textile / beverage / etc.",
  "african_origin": {
    "material": "the main raw material with African origin",
    "country": "most likely African country or region of origin",
    "local_price_raw": "approximate price in CFA or USD per kg/unit at origin",
    "context": "one sentence: how this material moves from African soil to this shelf"
  },
  "retail_price_estimate": "what this product likely costs in this store, in euros or local currency",
  "extraction_gap": {
    "raw_fraction": "approximately what % of the retail price stays in Africa as the raw material price",
    "value_added_outside": "approximately what % is added by processing/packaging/branding outside Africa",
    "comparison": "one punchy sentence comparing raw price to shelf price"
  },
  "local_opportunity": {
    "what_to_make": "what an African entrepreneur could make from this same raw material to capture more value",
    "start_cost": "approximate capital needed to start at micro scale — in CFA francs",
    "market": "where they could sell it (local, regional, export)",
    "potential": "realistic revenue range in CFA for a small-scale producer after 1 year"
  },
  "teaching_moment": "one sentence that makes someone stop and rethink what they're looking at",
  "confidence": "high if you clearly identified the product, medium if partially, low if unclear"
}`;

  try {
    const validMediaType = (mediaType === "image/png" || mediaType === "image/gif" || mediaType === "image/webp")
      ? mediaType as "image/png" | "image/gif" | "image/webp"
      : "image/jpeg" as const;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: validMediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = message.content.find(b => b.type === "text")?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]) as ScanResult;
    return Response.json(result);
  } catch {
    return Response.json({ error: "Scan failed — please try a clearer photo" }, { status: 500 });
  }
}
