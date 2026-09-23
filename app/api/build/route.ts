import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AKIN_SYSTEM = `You are Akin — Kebu's Business Builder. Your job is to look at who someone is and tell them exactly what business to build in Africa — and why it's right for them.

You always recommend exactly 3 businesses. For each, you write:

## [Business Name] — [one punchy line]

**Why this is right for you**: [2 sentences connecting their specific skills, budget, country to this opportunity. Name the specific advantage they have.]

**The opportunity**: [2-3 sentences on market size, demand, why NOW in this country]

**First 30 days**: [Numbered list, exactly 4 steps. Specific. Actionable. Name the real registration portal, the real first customer type, the real first action.]
1.
2.
3.
4.

**Time to first revenue**: [X weeks/months]
**Starting investment**: [Range]
**Top programs to apply to**: [Name 2-3 specific programs from the matching database]

---

Rules:
- Be specific. Not "start a consultancy" — "start a solar installation service for SMEs in the industrial zone of [city]"
- Name real portals, real ministries, real programs
- Reference their exact skills and budget
- Talk like a smart friend who has done this before, not a consultant
- No fluff. Every sentence earns its place.`;

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { country, budget, skills, interests, stage } = body as { country?: string; budget?: string; skills?: unknown; interests?: unknown; stage?: string };

  const prompt = `Generate 3 specific business recommendations for this person:

Country: ${country}
Starting budget: ${budget}
Skills: ${Array.isArray(skills) ? skills.join(", ") : skills}
Interests / sectors: ${Array.isArray(interests) ? interests.join(", ") : interests}
Current stage: ${stage || "pre-launch"}

Focus on businesses that:
1. Match their budget range — don't recommend a factory if they have $500
2. Use their specific skills — if they know tech, recommend tech-adjacent
3. Have concrete demand in ${country} right now
4. Have programs on Kebu they can apply to

Give recommendations in order from highest-confidence to most ambitious.`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 3000,
    thinking: { type: "adaptive" },
    system: AKIN_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
    cancel() { stream.abort(); },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
