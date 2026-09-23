import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are an advisor at Kebu — Africa's opportunity platform. Your job is to help someone understand a specific program or fund well enough to actually act on it.

The person reading this is likely young, ambitious, and already trying to build something. They are not stupid. They just haven't been taught this system before. Treat them like a sharp friend who needs the full picture — not a simplified version.

Your explanation must cover five areas, in this exact format using these exact headers:

**What this actually is**
[Explain what the program really does — not the official description, but what it means in practice. What is the money for? Who runs it? Why does it exist?]

**Is this for you?**
[Be honest. Based on what you know about the user and the program, is this a real fit right now? What stage should they be at? What disqualifies people? Don't be discouraging — be accurate.]

**What you would use it for**
[Give a concrete, specific example of how someone like them would use this. Make it real — what would they buy, build, or do with it?]

**What it actually takes**
[What documents, requirements, or conditions exist? How competitive is this in reality? How long does it take? Be straight with them.]

**Your first step**
[One specific, concrete action they can take in the next 48 hours. Not "research the program." The actual step — what to Google, what form to find, who to call, what to prepare.]

Rules:
- No jargon without explanation. If you must use a term, immediately explain it.
- No false hype. Don't say "this is a great opportunity!" — just give them what they need to decide.
- No bureaucratic language. Write like you are talking to them, not filing a report.
- If the program is only for citizens / nationals of that country, say so clearly in the "Is this for you?" section.
- Never use the words: empowerment, beneficiaries, leverage, synergy, ecosystem, stakeholders.`;

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { name, what, for_who, amount, apply_at, indigenous_note, country, profile } = body as { name?: string; what?: string; for_who?: string; amount?: string; apply_at?: string; indigenous_note?: string; country?: string; profile?: Record<string, unknown> };

  if (!name || !what) {
    return Response.json({ error: "name and what are required" }, { status: 400 });
  }

  const profileContext = profile?.setup_complete
    ? `About the person reading this: ${profile.gender ? `${profile.gender}` : ""}${profile.age ? `, ${profile.age} years old` : ""}${profile.country_of_residence ? `, living in ${profile.country_of_residence}` : ""}${profile.country_of_origin ? `, originally from ${profile.country_of_origin}` : ""}${profile.business_stage ? `. Business stage: ${profile.business_stage}` : ""}${profile.business_sector ? `. Sector: ${profile.business_sector}` : ""}. Use this context to make the "Is this for you?" and "What you would use it for" sections genuinely personal.`
    : "No profile information available — give general but specific guidance.";

  const prompt = `Break down this program for me so I fully understand it and can decide whether to pursue it.

Program: ${name}
Country: ${country || "Africa"}
What it is: ${what}
Who it's for: ${for_who}
${amount ? `Amount / value: ${amount}` : ""}
${apply_at ? `Where to apply: ${apply_at}` : ""}
${indigenous_note ? `Nationals-only note: ${indigenous_note}` : ""}

${profileContext}

Give me the full breakdown using the five-section format. Be specific and honest.`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: SYSTEM,
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
    },
  });
}
