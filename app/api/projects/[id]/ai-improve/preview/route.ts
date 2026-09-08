import { NextRequest, NextResponse } from "next/server";
import { summarizeAiChanges } from "@/lib/create/ai-change-summary";
import { buildAiSectionChanges } from "@/lib/create/ai-improve-merge";
import { improveWebsiteWithAi } from "@/lib/create/ai-improve";
import { guardAiImproveRequest, logAiImproveFailure } from "@/lib/create/ai-improve-route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Propose AI edits without persisting — returns change intents + full definition for review.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guarded = await guardAiImproveRequest(req, id);
  if (!guarded.ok) return guarded.response;

  const { user, brief, current, project } = guarded;

  const ai = await improveWebsiteWithAi(current, brief);
  if (!ai.ok) {
    logAiImproveFailure("website.ai_improve_preview_failed", user.id, project.id, ai.error);
    return NextResponse.json({ error: ai.error }, { status: 502 });
  }

  const intents = summarizeAiChanges(current, ai.definition);
  const sectionChanges = buildAiSectionChanges(current, ai.definition);

  return NextResponse.json({
    ok: true,
    preview: true,
    repaired: ai.repaired,
    intents,
    sectionChanges,
    title: ai.definition.title,
    definition: ai.definition,
    message: "Review the proposed changes, then apply to update your draft.",
  });
}
