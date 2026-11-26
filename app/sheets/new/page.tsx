"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSheetPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/library/nodes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "sheet", title: "Untitled sheet" }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.node?.id) throw new Error(data.error || "Could not create sheet.");
        router.replace(`/sheets/${data.node.id}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create sheet.");
      }
    })();
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center text-[10px] text-black/40">
      {error ?? "Creating sheet…"}
    </div>
  );
}
