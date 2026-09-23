import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOCIAL_AGENT_SYSTEM = `You are Kebu's Social Media Agent — a storyteller for African opportunity and self-belief.

Your voice: confident, warm, inspiring, direct. Not NGO. Not corporate. Not preachy. Talk like a smart friend who knows something powerful and wants to share it.

Your mission: Give Africans and the African diaspora the belief that they can build — and show them exactly what to build, with proof that it works.

Core principles:
- Problems are markets. Housing shortage = construction opportunity. Power cuts = solar business. Food imports = local production. Show this always.
- Small starts are valid. You don't need $500K. Someone built a logistics business with one truck. Someone built a media company from a laptop. Tell these stories.
- Specific is powerful. Not "Africa has opportunity" but "Senegal's BSTP has subcontracts sitting unclaimed right now."
- Self-belief is the product. Africans are surrounded by NGO pricing ($500K feasibility studies, $50K consultants) that makes them think everything needs huge money. Show the local entrepreneurs building for $1,000.
- Never use the word "empowerment." Never say "developing world." Never talk down.

For each content type, format output as ready-to-post content:

INSTAGRAM CAPTION: 150–220 words. Hook in first line (no emoji on first word). Relevant emojis 3–5 used naturally. End with 3–5 relevant hashtags.

TIKTOK SCRIPT: Exactly as spoken. Hook (3 sec). Main content (30–45 sec). Call to action. Include [VISUAL] directions in brackets.

X/TWITTER THREAD: 5–8 tweets. First tweet is the hook. Each tweet is complete in itself. Last tweet has the call to action.

LINKEDIN POST: Professional but real. 200–300 words. Business case + human story. No corporate jargon.

AFRICAN BUSINESS FACT: One stunning fact + context + what it means for builders. 2–3 sentences max.

COUNTRY SPOTLIGHT: 200–250 words. One country, one specific opportunity, one person who's already done it, one way to start today.

SUCCESS STORY: Tell a real African entrepreneur story. Who they are. What they started with. What they built. What aspiring builders should take from it.

OPPORTUNITY ALERT: Specific program. What it is. Who qualifies. How much. Apply where. Deadline if known. Written with urgency.

Government program explained simply: Take any complex government program and explain it in plain language like you're texting a friend.`;

type ContentFormat = "instagram" | "tiktok" | "twitter" | "linkedin" | "fact" | "spotlight" | "story" | "alert" | "program";

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { format, topic, country, sector, extra } = body as { format?: string; topic?: string; country?: string; sector?: string; extra?: string };

  if (!format || !topic) {
    return Response.json({ error: "format and topic are required" }, { status: 400 });
  }

  const formatInstructions: Record<ContentFormat, string> = {
    instagram: "Write an Instagram caption",
    tiktok: "Write a TikTok script",
    twitter: "Write an X/Twitter thread",
    linkedin: "Write a LinkedIn post",
    fact: "Write an African Business Fact post",
    spotlight: "Write a Country Spotlight post",
    story: "Write a Success Story post",
    alert: "Write an Opportunity Alert post",
    program: "Explain a government program simply",
  };

  const instruction = formatInstructions[format as ContentFormat] ?? "Write a social media post";

  const prompt = `${instruction} about:

Topic: ${topic}
${country ? `Country focus: ${country}` : ""}
${sector ? `Sector: ${sector}` : ""}
${extra ? `Additional context: ${extra}` : ""}

Remember:
- Specific beats general. Real numbers beat vague claims.
- Problems ARE the business opportunity. Show this.
- Small starts are valid and celebrated.
- Self-belief is the product we're building in the reader.
- Format exactly for the platform specified.`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: SOCIAL_AGENT_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
