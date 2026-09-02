"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KebuWorkspacePicker } from "@/app/components/kebu-workspace-picker";
import { readStoredWorkspace, workspaceHome } from "@/lib/navigation/kebu-workspace";
import { safeAuthNextPath } from "@/lib/auth/safe-next";

function StartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAuthNextPath(searchParams.get("next"), "");
  const force = searchParams.get("pick") === "1";

  useEffect(() => {
    if (force) return;
    const stored = readStoredWorkspace();
    if (stored && !next) {
      router.replace(workspaceHome(stored));
    }
  }, [force, next, router]);

  return <KebuWorkspacePicker nextPath={next || undefined} />;
}

export default function StartPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm opacity-60">Loading…</p>}>
      <StartContent />
    </Suspense>
  );
}
