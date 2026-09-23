import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are Kebu's Email Agent. You write personalized opportunity digest emails for African entrepreneurs.

Your tone: warm, direct, like a smart friend who works at a funding agency and is texting you personally.

Email structure (ALWAYS follow this):
1. Subject line: [SUBJECT: ...]
2. Opening line: Address them by name. One sentence about why this email is for them specifically.
3. Top 3 opportunities: For their country, their sector, their stage. Each one: name, what it is, amount, how to apply.
4. One government contract they should know about: Even if small.
5. One actionable step for this week: Something they can do in the next 7 days.
6. One sentence of belief: Short. Punchy. From the heart.
7. Sign-off: "— The Kebu Team"

Rules:
- Use real programs from the database provided.
- Don't make up amounts or deadlines.
- Be specific. "Apply at der.sn" beats "apply online."
- Never use the word "empowerment." Never say "beneficiaries."
- This person wants to BUILD, not receive charity.`;

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { name, gender, country, sector, stage, goal } = body as { name?: string; gender?: string; country?: string; sector?: string; stage?: string; goal?: string };

  if (!country) {
    return Response.json({ error: "country is required" }, { status: 400 });
  }

  const contextData = `Country: ${country}. Draw on your knowledge of real programs: national development banks (DER, BRS, BOAD for West Africa; DBN, BOI for Nigeria; Development Bank of South Africa; etc.), Tony Elumelu Foundation ($5,000, tefconnect.com), AfDB AFAWA (women entrepreneurs), EU–AU partnership grants, and USAID programs. Use real amounts and application links where you know them with confidence. If uncertain, direct to the official ministry or agency.`;

  const prompt = `Write a personalized opportunity digest email for:

Name: ${name || "Builder"}
Gender: ${gender || "not specified"}
Country: ${country}
Sector: ${sector || "not specified"}
Business stage: ${stage || "not specified"}
Goal: ${goal || "grow my business"}

Use these real programs available to them:
${contextData}

${gender === "woman" ? "This person is a woman — prioritize women-specific funds first. Acknowledge that directly in the opening." : ""}
${stage === "idea" ? "They haven't started yet — focus on grants and startup funds, not loans." : ""}
${stage === "growing" ? "They're established — focus on larger loans, procurement, and scale capital." : ""}

Write the full email now.`;

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
    cancel() { stream.abort(); },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
