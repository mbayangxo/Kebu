"use client";

import { useState } from "react";
import { BuilderAppearanceProvider } from "@/app/components/create/builder-appearance-provider";
import { BuilderStudioChrome, BuilderStudioRail, type BuilderStudioTab } from "@/app/components/create/builder-studio-chrome";
import type { BuilderDevice } from "@/lib/create/builder-device";
import { NativeInspectorFixture } from "./native-inspector-fixture";

/** Development-only fixture using the actual toolbar/store, never customer data. */
export function AppearanceFixture({ phoneFrame = false }: { phoneFrame?: boolean }) {
  const [device, setDevice] = useState<BuilderDevice>("desktop");
  const [tab, setTab] = useState<BuilderStudioTab>("content");
  const [feedback, setFeedback] = useState("No test action yet.");
  return (
    <main className="min-h-screen bg-white text-black">
      <p className="p-3 text-xs">QA fixture only. No customer data or real publishing. Auto uses local 8 pm–7 am.</p>
      <BuilderAppearanceProvider>
        <BuilderStudioChrome projectId="appearance-fixture" title="Appearance QA" saveLabel="Saved (fixture)" saveLabelColor="#009E40" device={device} onDevice={setDevice} canUndo={false} canRedo={false} onUndo={() => {}} onRedo={() => {}} publishing={false} publishLabel="Test action" onPublish={() => setFeedback("Publish callback observed; fixture only, no website published.")} />
        <div className="flex min-h-64">
          <BuilderStudioRail railTab={tab} panelOpen onRail={setTab} />
          <section className="min-w-0 flex-1 space-y-3 p-4">
            <p className="text-xs">Selected tool: {tab}. Device: {device}.</p>
            <div data-appearance-site-fixture style={{ background: "#FFF8E7", color: "#173B2B", border: "1px solid #D9B76E", padding: 16 }}>
              Customer website color fixture — stays cream and green in both toolbar themes.
            </div>
            <p role="status" className="text-xs">{feedback}</p>
            <NativeInspectorFixture />
          </section>
        </div>
      </BuilderAppearanceProvider>
      {!phoneFrame ? (
        <section className="overflow-x-auto p-4">
          <h2 className="mb-2 text-sm font-semibold">390px phone viewport using the same components</h2>
          <iframe title="Phone appearance QA" src="/qa/builder-appearance?frame=phone" style={{ width: 390, height: 480, border: "1px solid #aaa" }} />
        </section>
      ) : null}
    </main>
  );
}
