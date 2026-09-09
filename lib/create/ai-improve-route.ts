import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, logCreate } from "@/lib/create/auth";
import { aiRateLimit } from "@/lib/api-guard";
import { buildSnapshotFromDb } from "@/lib/create/persist-site";
import { aiImproveBriefSchema } from "@/lib/create/website-schema";
import { assertAiGenerationAllowance, recordAiGeneration } from "@/lib/billing/ai-metering";

type AuthUser = { id: string };

export async function guardAiImproveRequest(
  req: NextRequest,
  projectId: string,
): Promise<
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      supabase: SupabaseClient;
      user: AuthUser;
      brief: ReturnType<typeof aiImproveBriefSchema.parse>;
      current: NonNullable<Awaited<ReturnType<typeof buildSnapshotFromDb>>>;
      project: { id: string; owner_id: string; title: string };
    }
> {
  const limited = aiRateLimit(req);
  if (limited) return { ok: false, response: limited };

  const auth = await requireUser();
  if ("error" in auth) return { ok: false, response: auth.error };
  const { supabase, user } = auth;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid project id." }, { status: 400 }),
    };
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }

  const parsed = aiImproveBriefSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid input.", issues: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.owner_id !== user.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Project not found." }, { status: 404 }),
    };
  }

  const current = await buildSnapshotFromDb(supabase, projectId);
  if (!current) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Could not load current site." }, { status: 500 }),
    };
  }

  const meter = await assertAiGenerationAllowance(supabase, user.id);
  if (!meter.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: meter.error,
          upgradeHint: meter.upgradeHint,
          aiUsage: meter.meter
            ? { used: meter.meter.used, limit: meter.meter.limit, remaining: meter.meter.remaining }
            : undefined,
        },
        { status: meter.status },
      ),
    };
  }

  return {
    ok: true,
    supabase,
    user,
    brief: parsed.data,
    current,
    project,
  };
}

/** Call after a successful AI improve that consumed the model. */
export async function consumeAiImproveCredit(
  supabase: SupabaseClient,
  ownerId: string,
  projectId: string,
) {
  return recordAiGeneration(supabase, {
    ownerId,
    action: "website_ai_improve",
    projectId,
  });
}

export function logAiImproveFailure(
  event: string,
  userId: string,
  projectId: string,
  error: string,
) {
  logCreate(event, { userId, projectId, error });
}

/** Auth + ownership only — for apply after client-side preview. */
export async function guardAiImproveProject(projectId: string): Promise<
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      supabase: SupabaseClient;
      user: AuthUser;
      project: { id: string; owner_id: string; title: string };
    }
> {
  const auth = await requireUser();
  if ("error" in auth) return { ok: false, response: auth.error };
  const { supabase, user } = auth;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid project id." }, { status: 400 }),
    };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.owner_id !== user.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Project not found." }, { status: 404 }),
    };
  }

  return { ok: true, supabase, user, project };
}
