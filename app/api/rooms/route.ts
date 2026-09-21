import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).default(""),
  roomType: z.enum(["friends","school","study","hobby","community","project","team","client"]).default("friends"),
  businessId: z.string().uuid().nullable().optional(),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  const personal = url.searchParams.get("personal") === "1";

  let query = supabase
    .from("rooms")
    .select("id, created_by, business_id, name, description, room_type, archived_at, created_at, updated_at")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (businessId) query = query.eq("business_id", businessId);
  else if (personal) query = query.is("business_id", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message.includes("rooms") ? "Apply Kebu Rooms migration." : "Could not load rooms." }, { status: 500 });
  return NextResponse.json({ rooms: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid room.", issues: parsed.error.flatten() }, { status: 400 });

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      created_by: user.id,
      business_id: parsed.data.businessId ?? null,
      name: parsed.data.name,
      description: parsed.data.description,
      room_type: parsed.data.roomType,
    })
    .select("*")
    .single();

  if (error || !room) return NextResponse.json({ error: "Could not create room." }, { status: 500 });

  await supabase.from("room_members").insert({ room_id: room.id, user_id: user.id, role: "owner" });
  await supabase.from("space_channels").insert({
    created_by: user.id,
    business_id: room.business_id,
    room_id: room.id,
    name: room.name,
  });

  return NextResponse.json({ room }, { status: 201 });
}
