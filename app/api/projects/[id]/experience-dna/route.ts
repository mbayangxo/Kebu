import { NextResponse } from "next/server";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { authorizeExperienceProject } from "@/lib/create/experience-dna-access";
import { compileExperienceDna, experienceRecordFromRow, experienceSaveSchema } from "@/lib/create/experience-dna";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, context: Context) {
  const { id } = await context.params;
  const auth = await authorizeExperienceProject(id);
  if ("error" in auth) return auth.error;
  const result = await auth.supabase.from("project_experience_dna").select("project_id,revision,dna").eq("project_id", id).maybeSingle();
  if (result.error) return NextResponse.json({ error: "Could not load saved site direction. Retry." }, { status: 503 });
  try {
    const record = experienceRecordFromRow(id, result.data);
    return NextResponse.json({ record, direction: record.dna ? compileExperienceDna(record.dna) : null });
  } catch { return NextResponse.json({ error: "Saved site direction is incompatible. Its data has been kept." }, { status: 422 }); }
}
export async function PUT(req: Request, context: Context) {
  const csrf = assertSameOriginMutation(req); if (csrf) return csrf;
  const limited = builderRateLimit(req); if (limited) return limited;
  const { id } = await context.params;
  const auth = await authorizeExperienceProject(id);
  if ("error" in auth) return auth.error;
  // Bound streamed JSON before allocating/parsing the full request.
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Enter valid site direction." }, { status: 400 });
  let raw = "", bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 65536) { await reader.cancel(); return NextResponse.json({ error: "Site direction is too large." }, { status: 413 }); }
      raw += decoder.decode(part.value, { stream: true });
    }
    raw += decoder.decode();
  } catch { return NextResponse.json({ error: "Could not read site direction. Your draft is kept." }, { status: 400 }); }
  let body: unknown; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Enter valid site direction." }, { status: 400 }); }
  const parsed = experienceSaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter valid site direction." }, { status: 400 });
  const { dna, expectedRevision } = parsed.data;
  const result = await auth.supabase.rpc("save_project_experience_dna", { p_project: id, p_expected: expectedRevision, p_dna: dna });
  if (result.error) {
    const status = result.error.code === "40001" ? 409 : ["42501", "P0002"].includes(result.error.code) ? 404 : 503;
    return NextResponse.json({ error: status === 409 ? "Site direction changed elsewhere. Reload the saved version before retrying." : status === 404 ? "Site not found." : "Save could not be confirmed. Reload the saved version before retrying." }, { status });
  }
  try {
    const record = experienceRecordFromRow(id, result.data);
    if (record.revision !== expectedRevision + 1 || JSON.stringify(record.dna) !== JSON.stringify(dna)) throw new Error("Invalid acknowledgement");
    return NextResponse.json({ record });
  } catch { return NextResponse.json({ error: "Save acknowledgement was invalid. Reload the saved version before retrying." }, { status: 503 }); }
}
