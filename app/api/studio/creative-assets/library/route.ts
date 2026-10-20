import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { listMyCreativeAssetLibrary } from "@/lib/studio/creative-assets-marketplace";

export const dynamic = "force-dynamic";

/** My acquired (free, owned) creative assets — the ones usable right now in Studio. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const result = await listMyCreativeAssetLibrary(auth.supabase, auth.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    items: result.items
      .filter((i) => i.asset)
      .map((i) => ({
        id: i.id,
        acquiredAt: i.created_at,
        asset: {
          id: i.asset!.id,
          kind: i.asset!.kind,
          name: i.asset!.name,
          fileUrl: i.asset!.file_url,
          previewUrl: i.asset!.preview_url,
          licenseNote: i.asset!.license_note,
        },
      })),
  });
}
