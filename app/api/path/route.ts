import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface PathStep {
  id: string;
  phase: "Foundation" | "Funding" | "Growth" | "Scale";
  title: string;
  description: string;
  whyNow: string;
  type: "registration" | "funding" | "training" | "networking" | "procurement" | "market";
  estimatedDays: number;
  link?: string;
}

export interface GeneratedPath {
  goal: string;
  country: string;
  steps: PathStep[];
  generatedAt: string;
}

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;
  let rawBody: unknown;
  try { rawBody = await req.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { goal, country, stage, topPrograms } = rawBody as {
    goal: string;
    country: string;
    stage?: string;
    topPrograms?: string[];
  };

  const programList = topPrograms?.slice(0, 6).join(", ") || "programs available in your country";

  const prompt = `Generate an Opportunity Path for:
Goal: ${goal}
Country: ${country}
Current stage: ${stage || "pre-launch"}
Best matched programs: ${programList}

Return ONLY valid JSON — no prose before or after:

{
  "steps": [
    {
      "id": "unique-kebab-case-id",
      "phase": "Foundation",
      "title": "Short action title (max 55 chars)",
      "description": "2-3 specific sentences. What exactly to do, where to go, what to bring. Use real ${country} names and portals.",
      "whyNow": "1 sentence. Why this step comes before the next one.",
      "type": "registration",
      "estimatedDays": 3,
      "link": "https://real-url-if-known.com"
    }
  ]
}

Phase order: Foundation (2-3 steps: register, documents, bank account) → Funding (3-4 steps: apply to the matched programs, in priority order) → Growth (2-3 steps: accelerator, procurement registration, market expansion) → Scale (1-2 steps: export, investment, partnerships).

Total steps: 8-12. Every step must be specific to ${country}. Name real portals, real deadlines, real contacts. The person should be able to complete step 1 today.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content.find(b => b.type === "text")?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as { steps: PathStep[] };

    const result: GeneratedPath = {
      goal,
      country,
      steps: parsed.steps,
      generatedAt: new Date().toISOString(),
    };

    return Response.json(result);
  } catch {
    return Response.json({ error: "Failed to generate path" }, { status: 500 });
  }
}
