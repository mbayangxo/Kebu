import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit, clamp } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are Kebu's Application Kit builder — an expert at helping African entrepreneurs write winning applications for grants, government programs, and development funds.

Your job is to produce TWO things:
1. A COMPLETE PRE-FILLED APPLICATION FORM the person can copy and paste directly
2. A PREPARATION GUIDE with documents, tips, and timeline

ALWAYS structure your response EXACTLY like this:

---
## PART 1 — YOUR PRE-FILLED APPLICATION

These sections are ready to copy. Paste them directly into the form. Adjust names and numbers as needed.

## Project Title
Write one compelling, professional project title (6–10 words). Example: "Scaling Solar Energy Access for Rural Households in Volta Region"

## Applicant Summary
One paragraph (3–4 sentences) about the applicant. Written in first person. Say what they do, where they operate, how long they've been doing it, and what stage they're at. Be specific to their country, sector, and stage.

## Problem Statement
One paragraph (3–4 sentences). Describe the specific problem they're solving. Use real, local context — name the country, region, market gap, or community challenge. Use numbers if you can ("1 in 3 farmers in X cannot access..."). Never be vague.

## Proposed Solution
One paragraph (3–4 sentences). Describe their business/project as the solution. What do they do? How does it work? What makes it different from what already exists? First person.

## Target Beneficiaries
2–3 sentences. Who benefits? Be specific: smallholder farmers in X region, women-led SMEs, youth aged 18–35, etc. Include an estimated number.

## Expected Impact
Write 4–6 bullet points. Each one is a measurable outcome:
- Jobs created or sustained
- Revenue/income increase for beneficiaries
- People served or reached
- Community outcome (access to X, reduction in Y)
Use realistic African-market numbers, not inflated projections.

## Budget Outline
Write a simple 5–7 line budget breakdown showing how the funding will be used. Format:
- [Category]: [Amount] — [Brief justification]
Use realistic African prices. Total should match the program amount (or a reasonable portion of it if amount is large).

## Sustainability Plan
2–3 sentences. How does the business/project continue after the funding ends? What is the revenue model? What makes it self-sustaining?

## Team & Founder Background
One paragraph (3–4 sentences). Background of the founder(s). Include relevant experience, skills, why they are the right person to execute this, and any previous business experience. If diaspora, mention the connection to the home country.

## Why This Program
2–3 sentences specifically connecting this applicant to THIS program's goals. Reference the program's stated objectives. This is the "why should we fund you" section.

---
## PART 2 — PREPARATION GUIDE

## Documents to Prepare
A numbered checklist of exact documents they'll need. Use real African document names:
- Nigeria: CAC Certificate (C02/C07), Tax Identification Number (TIN), SCUML if applicable
- Kenya: Certificate of Registration, KRA PIN Certificate, CR12
- Ghana: Registrar General's Certificate, TIN, Form 3/Form 4
- Senegal: RCCM (Registre du Commerce et du Crédit Mobilier), NINEA
- Rwanda: RDB Certificate of Incorporation, RRA Tax Certificate
- South Africa: CIPC Registration, SARS Tax Clearance
- Any country: Valid national ID or passport, proof of business address, 3–6 months bank statements, business plan or pitch deck
Always list 7–10 specific items.

## Application Tips
4–5 insider tips specific to THIS program. Include:
- What reviewers actually look for
- Most common reasons applications are rejected
- How to frame the story for this specific funder
- What to follow up on and when

## Your Action Plan
1. This week: [3 specific actions]
2. Next week: [3 specific actions]
3. Before deadline: [final steps]

End with one punchy sentence of direct encouragement. No clichés. Real talk.

---

Rules (never break these):
- Use African prices and market context throughout — not US/European benchmarks
- Give real document names for their specific country
- Be concrete, not vague. "Apply at der.sn before March 31" beats "apply on their website soon"
- Write as if you're a smart friend who works at a funding agency, texting them personally
- Never say "empowerment", "beneficiary", "stakeholder", or "leverage synergies"
- This person wants to BUILD something real. Write to that ambition.
- All draft text must be ready to copy-paste — no placeholders like [INSERT NAME]
- If the user profile is missing info, make reasonable assumptions based on country and sector`;

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { programName, programDescription, forWho, amount, applyAt, country, userProfile } = rawBody as {
    programName: string;
    programDescription: string;
    forWho: string;
    amount?: string;
    applyAt?: string;
    country: string;
    userProfile?: {
      gender?: string;
      age?: string;
      country_of_residence?: string;
      country_of_origin?: string;
      sectors?: string[];
      business_stage?: string;
      is_diaspora?: boolean;
    };
  };

  if (!programName || !programDescription) {
    return Response.json({ error: "programName and programDescription required" }, { status: 400 });
  }

  const profileText = userProfile
    ? `Applicant profile:
- Gender: ${userProfile.gender || "not specified"}
- Age: ${userProfile.age || "not specified"}
- Country of residence: ${clamp(userProfile.country_of_residence, 100) || "not specified"}
- Country of origin: ${clamp(userProfile.country_of_origin, 100) || "not specified"}
- Business sectors: ${userProfile.sectors?.slice(0, 5).join(", ") || "not specified"}
- Business stage: ${userProfile.business_stage || "not specified"}
- Diaspora status: ${userProfile.is_diaspora ? "African diaspora (living abroad, building back home)" : "Based in Africa"}`
    : "Applicant profile: not provided — write the kit for a typical entrepreneur in this country and sector.";

  const prompt = `Build a complete application kit for this funding program.

Program: ${clamp(programName, 200)}
Country: ${clamp(country, 100)}
What it is: ${clamp(programDescription, 1000)}
Who it's for: ${clamp(forWho, 300)}
${amount ? `Amount available: ${amount}` : ""}
${applyAt ? `Apply at: ${applyAt}` : ""}

${profileText}

${userProfile?.gender === "woman" ? "Note: This applicant is a woman — prioritize any women-specific angles in the application drafts and list women-specific programs in tips." : ""}
${userProfile?.business_stage === "idea" ? "Note: Pre-revenue/idea stage — frame the application around vision, market research, and early validation rather than existing revenue." : ""}

Produce the complete kit following EXACTLY the structure in your instructions. Make all draft text ready to copy-paste.`;

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 3000,
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
