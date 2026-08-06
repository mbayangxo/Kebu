import { NextResponse } from "next/server";
import { isPublicKebuIdFormat } from "@/lib/kebu-id/public-id";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ kebuId: string }> };

/**
 * Public lookup by Kebu ID.
 * Slice 1: draft businesses are private — always 404 (no private field leakage).
 * Future levels may return a minimal public card; never return documents/owners/tax IDs here.
 */
export async function GET(_req: Request, { params }: Params) {
  const { kebuId: raw } = await params;
  const kebuId = decodeURIComponent(raw).toUpperCase();

  if (!isPublicKebuIdFormat(kebuId)) {
    return NextResponse.json({ error: "Invalid Kebu ID." }, { status: 400 });
  }

  // Intentionally do not return private draft business records via public ID.
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
