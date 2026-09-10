import { Suspense } from "react";
import { AppShell } from "@/app/components/app-shell";
import { AestheticsStoreClient } from "@/app/components/create/aesthetics-store-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Aesthetic Gallery — Kebu Builder",
  description:
    "Browse site aesthetics by category. Open a look for live preview, try free, apply to a site in My Sites.",
};

export default async function CreateAestheticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="Aesthetic Gallery">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-muted mb-4">Sign in to browse, buy, and upload aesthetics.</p>
          <a href="/login?next=/create/aesthetics" className="font-bold underline text-orange-600">
            Sign in
          </a>
        </div>
      </AppShell>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("owner_id", user.id)
    .eq("project_type", "website")
    .order("updated_at", { ascending: false });

  const sites = (projects ?? []).map((p) => ({ id: p.id as string, title: (p.title as string) || "Untitled site" }));

  return (
    <AppShell title="Aesthetic Gallery">
      <Suspense fallback={<p className="p-8 text-sm text-muted">Loading Aesthetic Gallery…</p>}>
        <AestheticsStoreClient sites={sites} />
      </Suspense>
    </AppShell>
  );
}
