import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { blankSlide, newSlideId, slideSchema } from "@/lib/slides/schema";
import { buildSlidesPdf } from "@/lib/slides/export-pdf";
import { buildSlidesPptx } from "@/lib/slides/export-pptx";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Real export, RLS-gated the same way as GET on the content route: no body
 * row read bypasses the user-scoped client. `?format=pdf` (default) or
 * `?format=pptx`.
 */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }
  const format = new URL(req.url).searchParams.get("format") === "pptx" ? "pptx" : "pdf";

  const { data: node, error: nodeError } = await supabase
    .from("library_nodes")
    .select("id, title, kind")
    .eq("id", id)
    .eq("kind", "slide")
    .maybeSingle();
  if (nodeError || !node) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const { data: body } = await supabase
    .from("slide_bodies")
    .select("slides, width, height")
    .eq("id", id)
    .maybeSingle();

  const rawSlides = Array.isArray(body?.slides) && body.slides.length ? body.slides : [blankSlide(newSlideId())];
  const slides = rawSlides
    .map((s: unknown) => slideSchema.safeParse(s))
    .filter((r): r is { success: true; data: ReturnType<typeof slideSchema.parse> } => r.success)
    .map((r) => r.data);
  const width = body?.width ?? 1920;
  const height = body?.height ?? 1080;

  const filename = (node.title || "deck").replace(/[^a-z0-9-_ ]/gi, "").trim().slice(0, 80) || "deck";

  try {
    if (format === "pptx") {
      const bytes = await buildSlidesPptx(slides, width, height);
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${filename}.pptx"`,
        },
      });
    }
    const bytes = await buildSlidesPdf(slides, width, height);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not export deck." }, { status: 500 });
  }
}
