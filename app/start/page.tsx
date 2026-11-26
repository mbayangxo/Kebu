"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readStoredWorkspace, workspaceHome } from "@/lib/navigation/kebu-workspace";
import { safeAuthNextPath } from "@/lib/auth/safe-next";

function StartContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeAuthNextPath(params.get("next"), "/dashboard");

  useEffect(() => {
    if (params.get("pick") === "1") {
      router.replace("/spaces");
      return;
    }
    const stored = readStoredWorkspace();
    if (stored) {
      router.replace(params.get("next") ? next : workspaceHome(stored));
      return;
    }
    router.replace("/welcome?next=" + encodeURIComponent(next));
  }, [next, params, router]);

  return <p className="p-8 text-sm opacity-60">Opening your Kebu…</p>;
}

export default function StartPage() {
  return <Suspense fallback={<p className="p-8 text-sm opacity-60">Loading…</p>}><StartContent /></Suspense>;
}
