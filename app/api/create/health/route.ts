import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { checkCreateDbHealth } from "@/lib/create/supabase-health";

export const dynamic = "force-dynamic";

/** Check whether Supabase has migrations needed for website builder save/publish. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const health = await checkCreateDbHealth(auth.supabase);
  return NextResponse.json(health);
}
