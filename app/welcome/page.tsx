"use client";

import { Suspense } from "react";
import { KebuWelcomeIntake } from "@/app/components/kebu/kebu-welcome-intake";

export default function WelcomePage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Loading…</p>}>
      <KebuWelcomeIntake />
    </Suspense>
  );
}
