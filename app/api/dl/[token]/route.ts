import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  resolveDownloadToken,
  signedDownloadUrl,
  incrementDownloadCount,
} from "@/lib/shop/digital-downloads";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/**
 * D2 — public download link.
 * Validates the token, increments the count, generates a 60s Supabase Storage signed URL,
 * then redirects the browser there.
 * No auth required — the token IS the proof of purchase.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new NextResponse("Service unavailable.", { status: 503 });
  }

  // Use service role so we can bypass RLS and access private storage
  const supabase = createClient(supabaseUrl, serviceKey);

  const download = await resolveDownloadToken(supabase, token);

  if (!download) {
    return new NextResponse(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Lien invalide</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151}
.box{text-align:center;padding:2rem;max-width:380px}</style></head>
<body><div class="box">
<p style="font-size:2rem;margin:0">🔒</p>
<h1 style="font-size:1.25rem;margin:.75rem 0 .5rem">Lien invalide ou expiré</h1>
<p style="font-size:.875rem;opacity:.7">Ce lien de téléchargement a expiré ou a déjà été utilisé le nombre de fois maximum.</p>
<p style="font-size:.8rem;opacity:.5;margin-top:1.5rem">Contactez le vendeur si vous avez besoin d'aide.</p>
</div></body></html>`,
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Generate a short-lived signed URL from Supabase Storage
  const signedUrl = await signedDownloadUrl(supabase, download.file_path);

  if (!signedUrl) {
    return new NextResponse(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Erreur</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}</style></head>
<body><p>Le fichier est temporairement indisponible. Réessayez dans quelques instants.</p></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Increment counter (best-effort — don't block the redirect)
  void supabase
    .from("shop_digital_downloads")
    .update({ download_count: download.download_count + 1 })
    .eq("id", download.id);

  // Redirect to the signed URL — browser gets the file directly from Supabase Storage
  return NextResponse.redirect(signedUrl, { status: 302 });
}
