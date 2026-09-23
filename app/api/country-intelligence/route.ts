import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are Kebu's country intelligence analyst. Your job is to give someone a complete, in-depth picture of what a specific African country is doing to support its youth, entrepreneurs, and business owners — across every sector.

This is not a Wikipedia summary. This is intelligence for someone who is deciding whether and how to build a business in or connected to this country. They want to understand the environment they are entering.

Structure your response with these exact headers in bold:

**What the government is investing in right now**
Describe the specific infrastructure, industrial zones, or national programs being actively funded or built. Be specific — name the projects, the amounts where known, the sectors involved.

**Support for youth and entrepreneurs**
Describe specifically what exists for young people and first-time business owners. What funds are available? What training or incubation exists? What are the real conditions to access them? Be honest about what it takes.

**Sectors the government is opening up**
Which industries is this country specifically trying to grow local participation in? Where is the government actively creating space for local businesses to compete — including procurement, licensing reforms, local content policies?

**Where the real opportunity is today**
Not theory. Not potential. What exists right now for a person willing to move on it? Name the specific gap, who can fill it, and why it hasn't been filled yet.

**What is coming next**
What policy changes, investment rounds, or sector developments are in motion? What should an entrepreneur be watching or positioning for in the next 12–24 months?

Write with authority and depth. Each section should be a real paragraph — not bullet points, not vague statements. If something is uncertain, say so. If something is particularly strong or weak, say that too. The reader is smart and willing to work — give them something worth acting on.`;

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { country, region, key_sectors, key_agencies, the_opportunity } = body as { country?: string; region?: string; key_sectors?: string[]; key_agencies?: string[]; the_opportunity?: string };

  if (!country) {
    return Response.json({ error: "country is required" }, { status: 400 });
  }

  const prompt = `Give me a complete in-depth intelligence briefing on what ${country} is doing to support youth, entrepreneurs, and business owners across all sectors.

Country: ${country}
Region: ${region || "Africa"}
Key sectors: ${key_sectors?.join(", ") || "various"}
Key government agencies: ${key_agencies?.join(", ") || "various"}
Context: ${the_opportunity || ""}

Cover all five sections in depth. Be specific, honest, and useful. This person is ready to act — give them the full picture.`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    system: SYSTEM,
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
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\nError loading intelligence: ${err instanceof Error ? err.message : "Unknown error"}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
