"use client";

import { useEffect, useState } from "react";
import { useProjectAutosave, type AutosaveSection } from "@/app/create/[id]/use-project-autosave";
import { builderProjectWrites, BuilderDraftActionGate } from "@/lib/create/builder-save-readiness";
import { listOfflineQueue, removeOfflineQueueItem } from "@/lib/create/offline-queue";
import type { SiteChrome } from "@/lib/create/site-chrome";
import type { PublishState } from "@/lib/create/publish-state";

const projectId = "00000000-0000-4000-8000-000000000099";
const sectionId = "00000000-0000-4000-8000-000000000098";

/** Actual save hook + action gate. The synthetic project is never created. */
function SaveReadinessSession() {
  const [sections, setSections] = useState<AutosaveSection[]>([{ id: sectionId, props: { text: "Original synthetic text" } }]);
  const [siteChrome, setSiteChrome] = useState<SiteChrome | null>(null);
  const [, setPublishState] = useState<PublishState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gate] = useState(() => new BuilderDraftActionGate());
  const [busy, setBusy] = useState(false);
  const [throwFlush, setThrowFlush] = useState(false);
  const [requests, setRequests] = useState(0);
  const [feedback, setFeedback] = useState("No gate callback yet.");
  const autosave = useProjectAutosave({ projectId, sections, setSections, pushHistory: () => {}, siteChrome, setSiteChrome, setPublishState, setError });

  const check = async (label: string) => {
    if (gate.busy) return;
    setBusy(true); setError(null);
    try {
      const outcome = await gate.run({
        save: async () => {
          if (throwFlush) throw new Error("Synthetic flush failure before the request.");
          await autosave.saveDraftNow();
        },
        readiness: autosave.canPublishNow,
        action: async () => {
          setRequests(n => n + 1);
          return `${label} fixture callback only; no AI or publish request sent.`;
        },
      });
      setFeedback(outcome.status === "blocked" ? outcome.reason : outcome.status === "completed" ? outcome.value : "Gate already busy.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Fixture action failed.");
    } finally { setBusy(false); }
  };
  // Only this explicitly nonexistent fixture's queue is cleared after the real hook checkpoints.
  useEffect(() => () => {
    builderProjectWrites(projectId, listOfflineQueue()).forEach(item => removeOfflineQueueItem(item.id));
  }, []);
  const readiness = autosave.canPublishNow();
  return (
    <div className="space-y-3 rounded-xl border border-gray-400 bg-white p-4 text-black">
      <p className="text-xs">This uses the actual autosave hook and confirmed-save gate. Editing attempts a real section PATCH for a nonexistent synthetic project: signed-out denial is expected. No customer project is loaded or AI/publishing performed.</p>
      <label className="block text-sm">Synthetic draft text
        <input className="mt-1 min-h-11 w-full rounded border border-gray-500 px-2" value={String(sections[0].props.text)} onChange={e => autosave.updateProps(sectionId, { text: e.target.value })} disabled={busy} />
      </label>
      <p className="text-xs">Save state: {autosave.saveState}. Readiness: {readiness.ok ? "confirmed" : "blocked"}.</p>
      <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={throwFlush} onChange={e => setThrowFlush(e.target.checked)} disabled={busy} />Simulate flush throw</label>
      <div className="flex flex-wrap gap-2">
        {["Preview", "Apply", "Publish"].map(label => <button key={label} type="button" className="min-h-11 rounded border border-gray-500 px-3 text-xs disabled:opacity-50" disabled={busy} onClick={() => void check(label)}>Check {label} gate</button>)}
      </div>
      <button type="button" className="min-h-11 rounded border border-gray-500 px-3 text-xs" disabled={busy} onClick={() => {
        try {
          autosave.checkpointPending();
          const items = builderProjectWrites(projectId, listOfflineQueue());
          const draft = items.find(item => item.kind === "save_section");
          setFeedback(`Checkpoint retained ${items.length} synthetic queued edit(s): ${draft?.kind === "save_section" ? String(draft.payload.props.text) : "none"}. No server save confirmed.`);
        } catch { setFeedback("Could not checkpoint synthetic edits."); }
      }}>Checkpoint pending fixture draft</button>
      <p role="status" className="text-xs">{feedback}</p>
      <p className="text-xs">Fixture callback count: {requests}. Busy: {busy ? "yes" : "no"}.</p>
      {error ? <p role="alert" className="text-xs text-red-800">{error}</p> : null}
    </div>
  );
}

export function SaveReadinessFixture() {
  const [epoch, setEpoch] = useState(0);
  return <section aria-label="Confirmed save QA" className="space-y-2">
    <h2 className="text-sm font-semibold">Confirmed save gate — synthetic QA</h2>
    <p className="text-xs">Reload resets this fixture. Successful fixture callbacks are not hosted persistence proof.</p>
    <button type="button" className="min-h-11 rounded border px-3 text-xs" onClick={() => setEpoch(n => n + 1)}>Reset save fixture</button>
    <SaveReadinessSession key={epoch} />
  </section>;
}
