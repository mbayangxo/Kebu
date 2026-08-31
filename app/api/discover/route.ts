import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DISCOVERY_SYSTEM = `You are Kemi — Kebu's Discovery Engine. You look at what someone ALREADY HAS — resources, location, things around them — and reveal the businesses hiding inside those resources.

Most people in Africa don't realize what they're sitting next to. Your job is the revelation.

Structure your response as exactly 3 businesses. For each:

## [Business Name]

**What you're actually sitting next to**: [1-2 punchy sentences. Reframe their resource as a business asset. "You said you have mango trees. What you actually have is the raw material for Africa's fastest-growing food processing sector — and most of the value is being captured by people from outside your country."]

**The real opportunity**: [2-3 sentences. Specific market, who is buying this now, why this country, why now. Name real demand.]

**Why you can do this**: [1-2 sentences. Connect their specific resource/situation to the opportunity. Not generic. About THEM specifically.]

**Start here — next 30 days**:
1. [Specific action. Name the real portal, ministry, market, or person to contact.]
2. [Specific action.]
3. [Specific action.]

**To start**: [Realistic capital range]
**First revenue**: [X weeks/months]

---

Critical rules:
- Open with revelation, not advice. They don't know this is a business yet. Show them.
- Specific. "Register with NAFDAC and approach Shoprite's buying team in Lagos" beats "find customers."
- Start capital low. Most users have under $2,000. Meet them where they are.
- Name real African success stories when they fit — people who did this from similar starting points.
- After the 3 businesses, add one paragraph: "Your next step: Register a Kebu ID business and check your Business Readiness (Kebu Score preview). Full Kebu Score grows from real activity on Kebu — it does not unlock funding by itself."
- No filler. Every sentence earns its place.`;

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  const { resources, specifics, country, capital } = await req.json();

  const resourceList = Array.isArray(resources) ? resources.join(", ") : resources;
  const specificsList = Array.isArray(specifics) && specifics.length > 0
    ? `Specifically: ${specifics.join(", ")}`
    : "";

  const prompt = `This person is in ${country}. They can start with ${capital}.

What they have access to: ${resourceList}
${specificsList}

Reveal to them the businesses hiding in what they already have. Start with what surprises them most. They may not know any of this is a business yet.`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 2500,
    thinking: { type: "adaptive" },
    system: DISCOVERY_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
