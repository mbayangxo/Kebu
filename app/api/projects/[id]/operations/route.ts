import { NextResponse } from "next/server";
import { z } from "zod";
import { TX_LIMITS, isUuid } from "@/lib/creative-core";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { requireUser } from "@/lib/create/auth";
import { builderOperationsEnabled, builderRenderPath } from "@/lib/create/kcd-render-flag";
import { builderTransactionSchema } from "@/lib/create/kcd-transaction-schema";
import { loadKcdChanges, loadKcdDocument } from "@/lib/create/kcd-project-document";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { assertProjectEditorAccess, dbForProjectAccess } from "@/lib/create/project-access";
import type { ProjectRow } from "@/lib/create/kcd-adapter";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
const resultSchema = z.object({
  status: z.enum(["committed", "rejected", "conflicted"]), replayed: z.boolean().optional(),
  code: z.string().optional(), message: z.string().optional(), opIndex: z.number().nullable().optional(),
  conflicts: z.array(z.object({ id: z.string(), expected: z.number().nullable(), actual: z.number() })).optional(),
  versions: z.record(z.string(), z.number().int().positive()).optional(),
  removedPages: z.array(z.string()).optional(),
  removed: z.array(z.string()).optional(), rebalanced: z.array(z.string()).optional(),
  orderKeys: z.record(z.string(), z.string()).optional(),
});

async function authorized(id: string) {
  const auth = await requireUser();
  if ("error" in auth) return { error: auth.error };
  if (!isUuid(id)) return { error: NextResponse.json({ error: "Invalid project id." }, { status: 400 }) };
  const access = await assertProjectEditorAccess(auth.supabase, {
    userId: auth.user.id, email: auth.user.email, projectId: id, action: "operations",
    select: "id,owner_id,business_id,title,theme,seo,site_chrome,document_schema_version",
  });
  if (!access) return { error: NextResponse.json({ error: "Project not found." }, { status: 404 }) };
  if (access.project.document_schema_version !== "kcd-1" || builderRenderPath(id) !== "kcd") {
    return { error: NextResponse.json({ error: "This project is not enabled for operation editing." }, { status: 409 }) };
  }
  const db = dbForProjectAccess(auth.supabase, access.via);
  if (!builderOperationsEnabled(id)) return { error: NextResponse.json({ error: "Operation editing is temporarily unavailable." }, { status: 503 }) };
  const protocol = await db.rpc("kcd_operation_protocol");
  if (protocol.error || ![3, 4].includes(protocol.data)) {
    return { error: NextResponse.json({ error: "Operation editing is temporarily unavailable." }, { status: 503 }) };
  }
  return { db, protocol: protocol.data, project: access.project as unknown as ProjectRow };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const gate = await authorized((await params).id);
    if ("error" in gate) return gate.error;
    return NextResponse.json({ document: await loadKcdDocument(gate.db, gate.project) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the document." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const origin = assertSameOriginMutation(req);
  if (origin) return origin;
  const limited = builderRateLimit(req);
  if (limited) return limited;
  try {
    const gate = await authorized((await params).id);
    if ("error" in gate) return gate.error;
    const text = await req.text();
    if (new TextEncoder().encode(text).length > TX_LIMITS.maxTxBytes) {
      return NextResponse.json({ error: "Transaction too large." }, { status: 413 });
    }
    let body: unknown;
    try { body = JSON.parse(text); } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = builderTransactionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid transaction.", issues: parsed.error.flatten() }, { status: 400 });
    const tx = parsed.data;
    if (gate.protocol < 4 && tx.ops.some(op => op.op === "setMotion" || op.op === "setInteraction")) return NextResponse.json({ error: "Motion editing is temporarily unavailable." }, { status: 503 });
    // A committed replay must reach the idempotency authority before stale-version validation.
    const replay = await gate.db.from("creative_op_journal").select("tx_id")
      .eq("project_id", gate.project.id).eq("tx_id", tx.txId).eq("status", "committed").maybeSingle();
    if (replay.error) throw new Error("Could not check replay");
    let preparedTx: unknown = tx;
    if (!replay.data) {
      const doc = await loadKcdDocument(gate.db, gate.project, tx.ops);
      const prepared = prepareBuilderTransaction(doc, tx);
      if (!prepared.ok) {
        if (prepared.error.code !== "KCD_CONFLICT") return NextResponse.json({ error: prepared.error.message, ...prepared.error }, { status: 400 });
        // Another request with this txId may have committed after the first replay lookup.
        const committed = await gate.db.from("creative_op_journal").select("tx_id")
          .eq("project_id", gate.project.id).eq("tx_id", tx.txId).eq("status", "committed").maybeSingle();
        if (committed.error) throw new Error("Could not check concurrent replay");
        if (!committed.data) return NextResponse.json({ error: prepared.error.message, ...prepared.error }, { status: 409 });
      } else preparedTx = prepared.transaction;
    }
    const proposal = tx.origin === "ai" ? await gate.db.from("project_experience_proposals").select("id").eq("id", tx.txId).eq("project_id", gate.project.id).eq("kind", "plan").maybeSingle() : null;
    if (proposal?.error) throw new Error("Could not check reviewed plan");
    const { data, error } = await gate.db.rpc(proposal?.data ? "apply_experience_plan" : "apply_node_ops", { p_project_id: gate.project.id, p_tx: preparedTx });
    if (error?.code === "40001") return NextResponse.json({ error: "Site or saved direction changed. Generate and review a fresh plan." }, { status: 409 });
    if (proposal?.data && error?.code === "22023") return NextResponse.json({ error: "This transaction does not match the reviewed saved plan." }, { status: 400 });
    if (proposal?.data && error?.code === "42501") return NextResponse.json({ error: "Only the site owner can apply this private plan." }, { status: 404 });
    if (error) throw new Error("Operation authority failed");
    const result = resultSchema.parse(data);
    if (result.status !== "committed") {
      return NextResponse.json({ error: result.message ?? "Changes were not saved.", ...result }, { status: result.status === "conflicted" ? 409 : 400 });
    }
    const changes = await loadKcdChanges(gate.db, gate.project.id, result.versions ?? {});
    return NextResponse.json({ ...result, ...changes }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // An uncertain acknowledgement is retried with the same txId; never report success.
    return NextResponse.json({ error: "Could not confirm the save. Retry with the same transaction." }, { status: 500 });
  }
}
