import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email?: string;
};

export async function requireUser(): Promise<
  { user: AuthUser; supabase: Awaited<ReturnType<typeof createClient>> } | { error: NextResponse }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return {
      error: NextResponse.json(
        { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." },
        { status: 503 }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }

  return { user: { id: user.id, email: user.email }, supabase };
}

export function logCreate(event: string, meta: Record<string, unknown> = {}) {
  console.info(
    JSON.stringify({
      scope: "kebu.create",
      event,
      at: new Date().toISOString(),
      ...meta,
    })
  );
}
