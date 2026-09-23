import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit, clamp } from "@/lib/api-guard";

const DEFAULT_SYSTEM = "You are an expert in African business, finance, and entrepreneurship. You help African founders, entrepreneurs, and diaspora access funding, navigate regulations, and build generational wealth.";

// Every caller of this route (the capital-stack / afcfta / bankability / budget-intel /
// regulatory / remittance / collective / succession "AI ENGINE" pages, plus assistant / brand /
// capital / goals / procurement) asks for specific tax rates, treaty terms, regulatory
// comparisons, or funding structures and streams the raw answer straight to the page with no
// citations. Appended to every system prompt — including each page's own specialized one, not
// only the default above, since previously the page-specific `system` field sent in the request
// body was silently ignored and this DEFAULT_SYSTEM was used for every page regardless — so no
// caller can opt out of the hedge just by supplying its own system prompt.
const SAFETY_APPEND = `

Important: figures, rates, laws, and structuring advice you are not certain of can be wrong or
out of date — you do not have live access to official sources. State clearly when something
should be verified against an official government source, a licensed lawyer, or a qualified
accountant rather than presenting it as settled fact. Do not invent specific numbers, statutes, or
treaty clauses you are not confident about; say so instead of guessing.`;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { prompt, system } = body as { prompt?: string; system?: string };

  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const baseSystem = typeof system === "string" && system.trim() ? clamp(system, 4000) : DEFAULT_SYSTEM;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: `${baseSystem}${SAFETY_APPEND}`,
    messages: [{ role: "user", content: clamp(prompt, 8000) }],
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
