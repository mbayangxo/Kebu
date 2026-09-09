import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  createStudioFolderSchema,
  normalizeFolderName,
  type StudioFolder,
} from "@/lib/studio/folders";

export const dynamic = "force-dynamic";

/** List owner folders + design counts. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: folders, error } = await supabase
    .from("studio_folders")
    .select("id, name, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    const missing = error.message?.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Studio folders table missing. Apply migration 077."
          : "Could not load folders.",
      },
      { status: missing ? 503 : 500 },
    );
  }

  const { data: designs } = await supabase
    .from("create_designs")
    .select("id, folder_id")
    .eq("owner_id", user.id);

  const counts = new Map<string, number>();
  let unfiled = 0;
  for (const d of designs ?? []) {
    if (d.folder_id) {
      counts.set(d.folder_id as string, (counts.get(d.folder_id as string) ?? 0) + 1);
    } else {
      unfiled += 1;
    }
  }

  const list: StudioFolder[] = (folders ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    created_at: f.created_at as string,
    updated_at: f.updated_at as string,
    designCount: counts.get(f.id as string) ?? 0,
  }));

  return NextResponse.json({
    folders: list,
    unfiledCount: unfiled,
    totalOwned: (designs ?? []).length,
  });
}

/** Create a folder. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createStudioFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid folder name." }, { status: 400 });
  }

  const name = normalizeFolderName(parsed.data.name);

  const { data: folder, error } = await supabase
    .from("studio_folders")
    .insert({ owner_id: user.id, name })
    .select("id, name, created_at, updated_at")
    .single();

  if (error || !folder) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "You already have a folder with that name." }, { status: 409 });
    }
    const missing = error?.message?.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Studio folders table missing. Apply migration 077."
          : "Could not create folder.",
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ folder: { ...folder, designCount: 0 } }, { status: 201 });
}
