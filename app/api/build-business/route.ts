import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { aiRateLimit, clamp } from "@/lib/api-guard";

const client = new Anthropic();

const SYSTEM = `You are a rigorous African business strategist. Your job is to build real, executable business plans for entrepreneurs building in or for Africa.

You give specific, actionable answers — not generic advice. You cite real African companies as examples. You include real supplier names, real regulatory steps, real costs in local currency.

You never say "it depends" without following it with a specific answer. You never suggest a business idea without a first-sale strategy. You understand African markets: mobile-first, cash-common, community-first, relationship-driven.

Your output uses this exact structure when generating a business plan:

## THE BUSINESS
One-line description of what this business does.

## WHY NOW IN AFRICA
Why this specific opportunity exists in Africa right now. Political context, demographic shift, technology change.

## WHO CONTROLS THIS MARKET TODAY
Who the current dominant players are — African and foreign. Their weaknesses.

## YOUR ENTRY POINT
The exact first move. Capital required. First 30 days.

## FIRST SALE
How to get the first paying customer. Not "find customers" — the specific method, channel, and pitch.

## 12-MONTH ROADMAP
Month 1–3: [action] → [result]
Month 4–6: [action] → [result]
Month 7–9: [action] → [result]
Month 10–12: [action] → [result]

## KEY SUPPLIERS & RESOURCES
Specific companies, platforms, or organizations to contact.

## REGULATORY REQUIREMENTS
Exact registrations needed in [country]. Costs. Timeline.

## REALISTIC NUMBERS
Start cost: [amount]
Month 6 revenue target: [amount]
Year 1 revenue ceiling: [amount]
Break-even: [timeline]

## THE RISK
The single biggest thing that could kill this. How to mitigate it.`;

export async function POST(req: NextRequest) {
  const denied = aiRateLimit(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const industry = clamp(body.industry, 100);
  const country = clamp(body.country, 100);
  const capital = clamp(body.capital, 50);
  const skills = clamp(body.skills, 300);
  const step = clamp(body.step, 50);
  const context = clamp(body.context, 2000);

  let prompt = "";

  if (step === "market-analysis") {
    prompt = `Analyze the ${industry} market in ${country}. Cover:
1. Total market size and growth rate
2. The 3 biggest foreign companies extracting value
3. The 3 biggest African companies succeeding
4. The 3 biggest gaps that a new entrant could fill
5. The single best entry point for someone with ${capital}

Be specific. Name companies. Give real numbers. This is for an entrepreneur making a real decision.`;
  } else if (step === "business-plan") {
    prompt = `Build a complete business plan for an entrepreneur who wants to build in the ${industry} industry in ${country}.

Their situation:
- Capital available: ${capital}
- Skills/background: ${skills}
- Additional context: ${context}

Follow the exact structure in your instructions. Give real supplier names, real costs in local currency, real regulatory steps. Make it executable from day 1.`;
  } else if (step === "competition") {
    prompt = `Who controls the ${industry} market in ${country} right now?

Give me:
1. The 3 dominant foreign players — what they do, how they extract value, their weakness
2. The 3 dominant African players — what they did right, their playbook
3. The exact gap in the market that a new entrant with ${capital} could fill

Be brutally honest. Don't soften anything. This entrepreneur needs to know what they're actually up against.`;
  } else if (step === "first-customer") {
    prompt = `I'm starting a ${industry} business in ${country} with ${capital}. ${context ? `Context: ${context}` : ""}

Tell me exactly how to get my first paying customer in the next 30 days. I don't want theory — I want the specific conversation to have, the specific channel to use, the specific price to charge, and the specific ask.

Walk me through it step by step.`;
  } else {
    prompt = clamp(body.prompt || context, 4000);
  }

  const stream = await client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 2500,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
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
