"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { builderChromeReceipt, builderSectionReceipt } from "@/lib/create/builder-write-receipts";
import { builderDraftCheckpoint } from "@/lib/create/builder-draft-checkpoint";
import { builderProjectWrites, builderSaveReadiness } from "@/lib/create/builder-save-readiness";
import { SectionSaveCoordinator } from "@/lib/create/section-save-coordinator";
import { canonicalJson } from "@/lib/create/device-overrides";
import {
  CHROME_HEADER_ID,
  isChromeSectionId,
  parseSiteChrome,
  patchSiteChromePart,
  type SiteChrome,
} from "@/lib/create/site-chrome";
import { resolveClientDataMode } from "@/lib/create/data-mode";
import { measureResponseBytes, evaluateKb } from "@/lib/create/kb-budget";
import {
  enqueueSaveSection,
  enqueueSaveChrome,
  enqueueSaveBatchSections,
  flushOfflineQueue,
  discardTerminalItem,
  getTerminalItems,
  listOfflineQueue,
  isBrowserOnline,
  isOfflineQueueDurable,
  type TerminalItem,
} from "@/lib/create/offline-queue";
import type { PublishState } from "@/lib/create/publish-state";

/** The minimal shape this hook needs from a builder section — kept narrow so it doesn't depend on
 *  page.tsx's private `Section` type (which also carries page/layout fields this hook never touches). */
export interface AutosaveSection {
  id: string;
  props: Record<string, unknown>;
  /** Row placement — lets Undo/Redo re-create a removed section and restore order. */
  page_id?: string;
  section_type?: string;
  sort_order?: number;
  [key: string]: unknown;
}

/** Pending-save key of an Undo/Redo snapshot the server has not accepted yet. */
const HISTORY_PENDING_KEY = "history";

export type SaveState = "idle" | "unsaved" | "saving" | "saved" | "queued" | "error" | "needs-attention";

/**
 * Extracted from app/create/[id]/page.tsx: the project's autosave state machine (section props +
 * site chrome), the offline-queue fallback, and the "Save draft" retry path. Pulled into its own hook
 * per docs/product/KEBU-BUILDER-UX-STANDARD.md §8 (separation of concerns) and to make the save-state
 * fix (unsaved state, real retry, beforeunload guard) testable and reusable in isolation from the rest
 * of the ~4000-line editor page.
 *
 * `pushHistory` is passed in rather than owned here because undo/redo history is shared with actions
 * (add/delete/reorder section) that live outside autosave — this hook only needs to call it, not own it.
 */
export function useProjectAutosave<T extends AutosaveSection>({
  projectId,
  sections,
  setSections,
  pushHistory,
  siteChrome,
  setSiteChrome,
  setPublishState,
  setError,
}: {
  projectId: string;
  sections: T[];
  setSections: Dispatch<SetStateAction<T[]>>;
  pushHistory: (prev: T[]) => void;
  siteChrome: SiteChrome | null;
  setSiteChrome: Dispatch<SetStateAction<SiteChrome | null>>;
  setPublishState: Dispatch<SetStateAction<PublishState | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [kbSaveNote, setKbSaveNote] = useState<string | null>(null);
  /** Terminal items from a flush pass that have not yet been dismissed by the user. */
  const [pendingTerminals, setPendingTerminals] = useState<TerminalItem[]>(() =>
    builderProjectWrites(projectId, getTerminalItems()).map((i) => ({
      id: i.id,
      kind: i.kind,
      lastError: i.lastError,
      sectionId: i.kind === "save_section" ? i.payload.sectionId : undefined,
      description:
        i.kind === "save_section"
          ? "Section save failed (auth/validation error)"
          : i.kind === "save_chrome"
            ? `${(i.payload as { part: string }).part === "header" ? "Header" : "Footer"} save failed`
            : i.kind === "save_settings"
              ? "Site settings save failed"
              : "Mutation failed permanently",
    })),
  );
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const chromeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chromeEditVersion = useRef({ header: 0, footer: 0 });
  const kbNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ref-mirror of pendingTerminals so setSaveStateWithTerminals can read it synchronously. */
  const pendingTerminalsRef = useRef<TerminalItem[]>(pendingTerminals);

  /**
   * Section/chrome saves not yet CONFIRMED successful, keyed "section:<id>" or "chrome:header"/
   * "chrome:footer". Added the instant an edit is made; removed only when the server confirms the
   * write — so an errored or offline-queued save stays here until a real retry (Save draft, or the
   * offline-queue flush) actually confirms it, instead of the UI silently reporting "Draft saved"
   * while work is still pending.
   */
  const pendingSavesRef = useRef<Set<string>>(new Set());

  /**
   * Latest section list, including edits made since the last render — read by event handlers and
   * timers instead of a possibly stale render closure. Synced from `sections` after every render.
   */
  const sectionsRef = useRef<T[]>(sections);
  const siteChromeRef = useRef(siteChrome);
  useLayoutEffect(() => {
    sectionsRef.current = sections;
    siteChromeRef.current = siteChrome;
  }, [sections, siteChrome]);

  /** Sections an Undo/Redo step changed that the server has not stored yet (see writeHistorySnapshot). */
  const historyDirtyRef = useRef<Map<string, number>>(new Map());
  /** Generation of the latest mark in historyDirtyRef (a write clears only marks it has covered). */
  const historyMarkRef = useRef(0);

  /** Server's reason for rejecting the pending Undo/Redo snapshot (blocks publishing until resolved). */
  const historyRejectedRef = useRef<string | null>(null);

  /** Newest full props per section awaiting a save (what the debounce timer / Save draft sends). */
  const latestPropsRef = useRef<Record<string, Record<string, unknown>>>({});

  /** One save in flight per section, newest props last (lib/create/section-save-coordinator.ts). */
  const sendSectionSaveRef = useRef<(sectionId: string, props: Record<string, unknown>, version: number) => Promise<void>>(
    async () => undefined,
  );
  const [coordinator] = useState(
    () => new SectionSaveCoordinator((sectionId, props, version) => sendSectionSaveRef.current(sectionId, props, version)),
  );

  /** Derives the effective save state including terminal items. */
  function computeSaveState(base: SaveState, terminals: TerminalItem[]): SaveState {
    if (terminals.length > 0) return "needs-attention";
    return base;
  }

  function setSaveStateWithTerminals(base: SaveState) {
    // If there are terminal items (permanently failed saves), always escalate to "needs-attention"
    // so the user sees that action is required, regardless of the base save state.
    setSaveState(pendingTerminalsRef.current.length > 0 ? "needs-attention" : computeSaveState(base, []));
    if (base === "queued" && !isOfflineQueueDurable()) {
      setError("Browser storage is unavailable. These changes exist only in this tab — keep it open and retry Save draft.");
    }
  }

  async function persistProps(sectionId: string, props: Record<string, unknown>) {
    const mode = resolveClientDataMode();
    if (!isBrowserOnline() || mode === "offline") return sendSectionSave(sectionId, props, -1);
    return coordinator.save(sectionId, props);
  }

  /**
   * One PATCH /sections. `version` is the section's local edit version this save was sent for
   * (-1 when not sent through the coordinator): only a response for the latest edit may replace the
   * Builder's local props or mark the section saved — an older response must not revert newer edits.
   */
  async function sendSectionSave(sectionId: string, props: Record<string, unknown>, version: number) {
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      try {
        enqueueSaveSection({ projectId, sectionId, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote(isOfflineQueueDurable() ? "Not saved on server yet — queued until Syncing…" : "Storage unavailable — keep this tab open and retry Save draft.");
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.message === "offline_queue_full") {
          setSaveStateWithTerminals("error");
          setError("Offline queue is full — reconnect to sync your changes.");
        }
      }
      return;
    }
    setSaveStateWithTerminals("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Kebu-Data-Mode": mode,
        },
        body: JSON.stringify({ sectionId, props }),
      });
      const bytes = await measureResponseBytes(res);
      const ev = evaluateKb({ action: "save_section", mode, usedBytes: bytes });
      setKbSaveNote(ev.summary);
      // Auto-dismiss the within-budget note after 4 s so it doesn't linger forever.
      // Over-budget notes stay until the next save clears them — they need attention.
      if (ev.withinBudget) {
        if (kbNoteTimer.current) clearTimeout(kbNoteTimer.current);
        kbNoteTimer.current = setTimeout(() => { setKbSaveNote(null); }, 4000);
      }
      const data = await res.json().catch(() => ({}));
      // The section was edited again (or superseded by Undo/Redo) while this save was in flight:
      // keep the newer local props and the pending state; the newer write reports the outcome.
      const stale = version !== -1 && !coordinator.isCurrent(sectionId, version);
      if (!res.ok) {
        if (stale) return;
        setSaveStateWithTerminals("error");
        const issueHint =
          data?.issues?.fieldErrors && typeof data.issues.fieldErrors === "object"
            ? Object.entries(data.issues.fieldErrors as Record<string, string[]>)
                .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
                .slice(0, 3)
                .join(" · ")
            : "";
        setError(
          [typeof data.error === "string" ? data.error : "Save failed.", issueHint || data.detail]
            .filter(Boolean)
            .join(" — "),
        );
        return;
      }
      setPublishState((prev) =>
        prev
          ? { ...prev, hasUnpublishedChanges: true }
          : { isLive: false, hasUnpublishedChanges: true, lastPublishedAt: null, draftUpdatedAt: null, livePublicPath: null },
      );
      if (stale) return;
      const receipt = builderSectionReceipt(data, sectionId);
      if (!receipt) {
        setSaveStateWithTerminals("error");
        setError("Save response was incomplete. Your local edits are still pending — retry Save draft.");
        return;
      }
      setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...receipt } : s)));
      delete latestPropsRef.current[sectionId];
      pendingSavesRef.current.delete(`section:${sectionId}`);
      setSaveStateWithTerminals(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      setError(null);
    } catch (fetchErr) {
      // Never queue superseded props for replay: a newer write for this section follows.
      if (version !== -1 && !coordinator.isCurrent(sectionId, version)) return;
      try {
        enqueueSaveSection({ projectId, sectionId, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote(isOfflineQueueDurable() ? "Not saved on server yet — queued until Syncing…" : "Storage unavailable — keep this tab open and retry Save draft.");
        setError(null);
      } catch (queueErr) {
        if (queueErr instanceof Error && queueErr.message === "offline_queue_full") {
          setSaveStateWithTerminals("error");
          setError("Offline queue is full — reconnect to sync your changes.");
        } else {
          setSaveStateWithTerminals("error");
          setError("Could not save this change. Please try again.");
          void fetchErr;
        }
      }
    }
  }

  function persistChrome(part: "header" | "footer", props: Record<string, unknown>) {
    const version = chromeEditVersion.current[part];
    return coordinator.exclusive(() => sendChromeSave(part, props, version));
  }

  async function sendChromeSave(part: "header" | "footer", props: Record<string, unknown>, version: number) {
    if (version !== chromeEditVersion.current[part]) return;
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      try {
        enqueueSaveChrome({ projectId, part, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote(isOfflineQueueDurable() ? "Site header/footer queued until Syncing…" : "Storage unavailable — keep this tab open and retry Save draft.");
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.message === "offline_queue_full") {
          setSaveStateWithTerminals("error");
          setError("Offline queue is full — reconnect to sync your changes.");
        }
      }
      return;
    }
    setSaveStateWithTerminals("saving");
    try {
      const body = part === "header" ? { header: props } : { footer: props };
      const res = await fetch(`/api/projects/${projectId}/site-chrome`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Kebu-Data-Mode": mode },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (version !== chromeEditVersion.current[part]) return;
      if (!res.ok) {
        // Surface the error — but also queue for auto-retry on reconnect.
        try {
          enqueueSaveChrome({ projectId, part, props });
          setSaveStateWithTerminals("queued");
          setKbSaveNote(isOfflineQueueDurable() ? "Site header/footer queued for retry…" : "Storage unavailable — keep this tab open and retry Save draft.");
        } catch {
          setSaveStateWithTerminals("error");
          setError(typeof data.error === "string" ? data.error : "Could not save site header/footer.");
        }
        return;
      }
      const confirmed = builderChromeReceipt(data, part);
      if (!confirmed) {
        setSaveStateWithTerminals("error");
        setError("Header/footer save response was incomplete. Your local edits are still pending — retry Save draft.");
        return;
      }
      const next = patchSiteChromePart(siteChromeRef.current ?? parseSiteChrome(null), part, confirmed);
      siteChromeRef.current = next;
      setSiteChrome(next);
      setPublishState((prev) =>
        prev
          ? { ...prev, hasUnpublishedChanges: true }
          : { isLive: false, hasUnpublishedChanges: true, lastPublishedAt: null, draftUpdatedAt: null, livePublicPath: null },
      );
      pendingSavesRef.current.delete(`chrome:${part}`);
      setSaveStateWithTerminals(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      setError(null);
    } catch {
      if (version !== chromeEditVersion.current[part]) return;
      try {
        enqueueSaveChrome({ projectId, part, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote(isOfflineQueueDurable() ? "Site header/footer queued until Syncing…" : "Storage unavailable — keep this tab open and retry Save draft.");
        setError(null);
      } catch (queueErr) {
        if (queueErr instanceof Error && queueErr.message === "offline_queue_full") {
          setSaveStateWithTerminals("error");
          setError("Offline queue is full — reconnect to sync your changes.");
        }
      }
    }
  }

  function updateChromeProps(part: "header" | "footer", patch: Record<string, unknown>) {
    chromeEditVersion.current[part]++;
    pendingSavesRef.current.add(`chrome:${part}`);
    setSaveStateWithTerminals("unsaved");
    const base = siteChromeRef.current ?? parseSiteChrome(null);
    const next = patchSiteChromePart({ ...base, enabled: true }, part, patch);
    siteChromeRef.current = next;
    setSiteChrome(next);
    if (chromeSaveTimer.current) clearTimeout(chromeSaveTimer.current);
    chromeSaveTimer.current = setTimeout(() => {
      chromeSaveTimer.current = null;
      // Header and footer edits share a debounce window; save every pending part.
      for (const pendingPart of ["header", "footer"] as const) {
        const props = siteChromeRef.current?.[pendingPart]?.props;
        if (pendingSavesRef.current.has(`chrome:${pendingPart}`) && props) void persistChrome(pendingPart, props);
      }
    }, 500);
  }

  function updateProps(sectionId: string, patch: Record<string, unknown>) {
    if (isChromeSectionId(sectionId)) {
      updateChromeProps(sectionId === CHROME_HEADER_ID ? "header" : "footer", patch);
      return;
    }
    pendingSavesRef.current.add(`section:${sectionId}`);
    setSaveStateWithTerminals("unsaved");
    // Side effects (history, timers, save bookkeeping) stay outside the state updater: React may
    // call updaters more than once, which duplicated history entries.
    const prev = sectionsRef.current;
    const next = prev.map((s) => (s.id === sectionId ? { ...s, props: { ...s.props, ...patch } } : s));
    sectionsRef.current = next;
    latestPropsRef.current[sectionId] = next.find((s) => s.id === sectionId)?.props ?? { ...patch };
    coordinator.noteLocalEdit(sectionId);
    pushHistory(prev);
    setSections((current) => current.map((s) => (s.id === sectionId ? { ...s, props: { ...s.props, ...patch } } : s)));
    if (saveTimers.current[sectionId]) clearTimeout(saveTimers.current[sectionId]);
    saveTimers.current[sectionId] = setTimeout(() => {
      delete saveTimers.current[sectionId];
      const latest = latestPropsRef.current[sectionId];
      if (latest) void persistProps(sectionId, latest);
    }, 500);
  }

  /**
   * "Save draft" button handler — and the real retry path. Flushes any pending (still-debouncing)
   * autosave timers immediately, then re-attempts every save that hasn't yet been CONFIRMED
   * successful (pendingSavesRef), including ones already marked "queued" or "error" from a previous
   * attempt. If nothing is pending, this is a genuine no-op — it never claims a save happened when
   * there was nothing to save.
   */
  async function saveDraftNow() {
    // Writes already under way (autosaves, Add/Remove, Undo/Redo) finish first, so a pending key
    // below means the server really does not have that change yet.
    await coordinator.idle();
    Object.keys(saveTimers.current).forEach((id) => {
      clearTimeout(saveTimers.current[id]);
      delete saveTimers.current[id];
    });
    if (chromeSaveTimer.current) {
      clearTimeout(chromeSaveTimer.current);
      chromeSaveTimer.current = null;
    }
    const pending = Array.from(pendingSavesRef.current);
    if (pending.length === 0) {
      // Also flush any queued offline items.
      if (isBrowserOnline()) {
        const result = await flushOfflineQueue();
        if (result.terminalItems.length > 0) {
          setPendingTerminals((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const projectIds = new Set(builderProjectWrites(projectId, getTerminalItems()).map(item => item.id));
            const newOnes = result.terminalItems.filter((t) => projectIds.has(t.id) && !existingIds.has(t.id));
            return [...prev, ...newOnes];
          });
        }
      }
      setSaveStateWithTerminals("saved");
      return;
    }
    // A pending Undo/Redo snapshot is retried with the Builder's current sections — one batch that
    // also covers every pending section save.
    const retryHistory = pending.includes(HISTORY_PENDING_KEY);
    await Promise.all(
      pending.map((key) => {
        if (key.startsWith("section:")) {
          if (retryHistory) return Promise.resolve();
          const sectionId = key.slice("section:".length);
          const current = latestPropsRef.current[sectionId] ?? sectionsRef.current.find((s) => s.id === sectionId)?.props;
          return current ? persistProps(sectionId, current) : Promise.resolve();
        }
        if (key === HISTORY_PENDING_KEY) return writeHistorySnapshot(sectionsRef.current, sectionsRef.current);
        if (key === "chrome:header" || key === "chrome:footer") {
          const part = key === "chrome:header" ? "header" : "footer";
          const props = siteChromeRef.current?.[part]?.props;
          return props ? persistChrome(part, props as Record<string, unknown>) : Promise.resolve();
        }
        return Promise.resolve();
      }),
    );
    await coordinator.idle();
  }

  /**
   * Add / Remove / Move a section: `request` performs the server write (true = success) and runs in
   * order with every other write of section rows (SectionSaveCoordinator.exclusive). Removing a
   * section first drops its debounced and queued saves (an Undo re-creates it from the snapshot,
   * edits included); if the removal fails, its latest props are saved again.
   */
  async function writeStructure<R>(request: () => Promise<R>, opts: { removing?: string } = {}): Promise<R> {
    const removing = opts.removing;
    if (removing) {
      clearTimeout(saveTimers.current[removing]);
      delete saveTimers.current[removing];
      delete latestPropsRef.current[removing];
      pendingSavesRef.current.delete(`section:${removing}`);
    }
    let result!: R;
    await coordinator.exclusive(async () => {
      result = await request();
    }, removing ? [removing] : []);
    if (removing && !result) {
      const section = sectionsRef.current.find((x) => x.id === removing);
      if (section) {
        pendingSavesRef.current.add(`section:${removing}`);
        void persistProps(removing, section.props);
      }
    }
    return result;
  }

  /** Apply an Add / Remove / Move the server confirmed: one Undo step, local state updated at once. */
  function commitStructure(mutate: (prev: T[]) => T[]) {
    const prev = sectionsRef.current;
    const next = mutate(prev);
    pushHistory(prev);
    sectionsRef.current = next;
    setSections(next);
  }

  /** The Builder's current sections, including edits made since the last render. */
  function currentSections(): T[] {
    return sectionsRef.current;
  }

  /**
   * Flush the offline queue and surface any newly-terminal items.
   * Called automatically on reconnect and can be called from the UI.
   */
  async function flushAndSurfaceTerminals() {
    const result = await flushOfflineQueue();
    if (result.terminalItems.length > 0) {
      setPendingTerminals((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const projectIds = new Set(builderProjectWrites(projectId, getTerminalItems()).map(item => item.id));
        const newOnes = result.terminalItems.filter((t) => projectIds.has(t.id) && !existingIds.has(t.id));
        return [...prev, ...newOnes];
      });
    }
    // After flush, if queue is now empty, update save state.
    if (result.remaining === 0 && pendingSavesRef.current.size === 0) {
      setSaveState("saved");
    }
  }

  /**
   * Discard a single terminal item by id (user has acknowledged the loss).
   * For save_section items, marks the section in local state as "server-authoritative"
   * by reverting its props to the last value that was confirmed saved.
   * Since we can't reload a single section without a dedicated GET endpoint, we flag
   * the section with a `_discarded` marker so the UI can show a "Reverted to saved" notice.
   * A full reconciliation happens on the next hard reload.
   */
  function dismissTerminalItem(id: string) {
    const item = pendingTerminals.find((t) => t.id === id);
    discardTerminalItem(id);
    setPendingTerminals((prev) => prev.filter((t) => t.id !== id));

    // Mark the affected section as needing reconciliation so the UI knows the
    // displayed props may differ from what the server has.  The builder page
    // uses this flag to display a "Reloading…" notice and trigger a reload.
    if (item?.sectionId) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === item.sectionId
            ? { ...s, _needsServerReconcile: true }
            : s,
        ),
      );
    }
  }

  /** Discard all terminal items. */
  function dismissAllTerminalItems() {
    // Other projects and checkout/event mutations belong to their own recovery flows.
    pendingTerminals.forEach(item => discardTerminalItem(item.id));
    setPendingTerminals([]);
    // Mark all sections that had terminal items as needing reconciliation.
    const affectedSectionIds = new Set(
      pendingTerminals
        .filter((t) => t.kind === "save_section" && t.sectionId)
        .map((t) => t.sectionId!),
    );
    if (affectedSectionIds.size > 0) {
      setSections((prev) =>
        prev.map((s) =>
          affectedSectionIds.has(s.id) ? { ...s, _needsServerReconcile: true } : s,
        ),
      );
    }
  }

  // The coordinator calls the latest render's sendSectionSave.
  useLayoutEffect(() => {
    sendSectionSaveRef.current = sendSectionSave;
  });

  // Keep pendingTerminalsRef in sync so setSaveStateWithTerminals can read it synchronously.
  // Also escalate saveState to "needs-attention" when new terminals arrive.
  useEffect(() => {
    pendingTerminalsRef.current = pendingTerminals;
    if (pendingTerminals.length > 0) {
      setSaveState("needs-attention");
    }
  }, [pendingTerminals]);

  // Flush any queued offline saves when connectivity returns, and surface terminal results.
  useEffect(() => {
    const onOnline = () => {
      void flushAndSurfaceTerminals();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function checkpointPending() {
    const checkpoint = builderDraftCheckpoint({
      projectId, pending: pendingSavesRef.current, historyDirtyIds: historyDirtyRef.current.keys(),
      sections: sectionsRef.current, siteChrome: siteChromeRef.current,
    });
    if (checkpoint.history) enqueueSaveBatchSections(checkpoint.history);
    checkpoint.sections.forEach(enqueueSaveSection);
    checkpoint.chrome.forEach(enqueueSaveChrome);
    if ((checkpoint.history || checkpoint.sections.length || checkpoint.chrome.length) && !isOfflineQueueDurable()) {
      throw new Error("Browser storage is unavailable. Keep this editor open and retry Save draft.");
    }
  }
  const checkpointRef = useRef(checkpointPending);
  useLayoutEffect(() => { checkpointRef.current = checkpointPending; });

  // Pending edits survive the debounce window. If storage fails, warn instead of claiming saved.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSavesRef.current.size === 0) return;
      try { checkpointRef.current(); }
      catch { setError("Could not preserve your pending edits. Keep this editor open and retry Save draft."); }
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [setError]);

  useEffect(() => {
    const timers = saveTimers.current;
    const chromeTmr = chromeSaveTimer;
    const kbTmr = kbNoteTimer;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      if (chromeTmr.current) clearTimeout(chromeTmr.current);
      if (kbTmr.current) clearTimeout(kbTmr.current);
      try { checkpointRef.current(); }
      catch (error) { console.error("Could not preserve pending Builder edits on leaving the editor.", error instanceof Error ? error.message : "Storage unavailable"); }
    };
  }, []);

  const saveStatusLabel =
    saveState === "saving"
      ? "Saving draft…"
      : saveState === "queued"
        ? "Not saved yet — queued"
        : saveState === "error"
          ? "Save failed — click Save draft to retry"
          : saveState === "needs-attention"
            ? "Action required — some changes could not be saved"
            : saveState === "unsaved"
              ? "Unsaved changes"
              : saveState === "saved"
                ? "Draft saved"
                : "";

  /**
   * For callers that just replaced `sections`/`siteChrome` wholesale with a fresh server response
   * (e.g. after an AI-improve apply + reload) — nothing is actually pending anymore since the state
   * now IS the server's, so clear any stale pending keys and reflect that as "saved" rather than
   * leaving whatever saveState happened to be set from before the reload.
   */
  function markAllSaved() {
    pendingSavesRef.current.clear();
    historyDirtyRef.current.clear();
    historyRejectedRef.current = null;
    setSaveState("saved");
  }

  /**
   * Undo/Redo: persist a history snapshot. `current` is the section list the Builder showed before
   * the step; the local state is already `snapshot`.
   *
   * Only sections the step changes are written, plus sections whose pending saves it replaces
   * (their debounced/queued saves are dropped here) — one entry for a typical step instead of the
   * whole site (the batch endpoint accepts at most 50). Ids accumulate until written, so a step
   * skipped because a newer one replaced it (SectionSaveCoordinator.writeHistory) still gets its
   * sections written, with the newest snapshot's props. The write is ordered after in-flight saves
   * and earlier history writes. The server validates every entry with the same boundary as PATCH
   * (sectionPropsForSave); if it rejects the batch nothing is written, the error is shown, and
   * "Save draft" retries those sections with the Builder's current props.
   */
  function writeHistorySnapshot(snapshot: T[], current: T[]): Promise<void> {
    Object.keys(saveTimers.current).forEach((id) => {
      clearTimeout(saveTimers.current[id]);
      delete saveTimers.current[id];
    });
    latestPropsRef.current = {};
    const mark = (id: string) => historyDirtyRef.current.set(id, ++historyMarkRef.current);
    const currentById = new Map(current.map((s) => [s.id, s]));
    const snapshotIds = new Set(snapshot.map((s) => s.id));
    for (const s of snapshot) {
      const c = currentById.get(s.id);
      // Changed props or position, or a section the step brings back (Undo of Remove, Redo of Add).
      // Props compare by value: after a reload (e.g. Publish) equal props are new objects.
      const sameProps = c !== undefined && (c.props === s.props || canonicalJson(c.props) === canonicalJson(s.props));
      if (!c || !sameProps || c.sort_order !== s.sort_order || c.page_id !== s.page_id) mark(s.id);
    }
    // Sections the step takes away (Undo of Add, Redo of Remove).
    for (const c of current) if (!snapshotIds.has(c.id)) mark(c.id);
    for (const key of [...pendingSavesRef.current]) {
      if (!key.startsWith("section:")) continue;
      historyDirtyRef.current.set(key.slice("section:".length), ++historyMarkRef.current);
      pendingSavesRef.current.delete(key);
    }
    sectionsRef.current = snapshot;
    pendingSavesRef.current.add(HISTORY_PENDING_KEY);
    setSaveStateWithTerminals("unsaved");
    return coordinator.writeHistory(() => persistHistorySnapshot(snapshot));
  }

  async function persistHistorySnapshot(snapshot: T[]): Promise<void> {
    const dirty = historyDirtyRef.current;
    const coveredMark = historyMarkRef.current;
    const inSnapshot = new Set(snapshot.map((s) => s.id));
    const updates = snapshot
      .filter((s) => dirty.has(s.id))
      .map((s) => ({
        id: s.id,
        props: s.props,
        ...(typeof s.sort_order === "number" ? { sort_order: s.sort_order } : {}),
        ...(s.page_id && s.section_type && typeof s.sort_order === "number"
          ? { restore: { page_id: s.page_id, section_type: s.section_type, sort_order: s.sort_order } }
          : {}),
      }));
    const deletes = [...dirty.keys()].filter((id) => !inSnapshot.has(id));
    // Clears the marks this write covered — sections sent, and sections no longer in the Builder
    // (removed since; nothing to write). A section marked again meanwhile stays for the next write.
    const written = () => {
      for (const [id, mark] of [...dirty]) if (mark <= coveredMark) dirty.delete(id);
    };
    const queueForRetry = () => {
      // Network/server failure: one durable batch unit, retried by the offline queue.
      try {
        enqueueSaveBatchSections({ projectId, updates, deletes });
        if (!isOfflineQueueDurable()) throw new Error("Browser storage is unavailable");
        written();
        historyRejectedRef.current = null;
        pendingSavesRef.current.delete(HISTORY_PENDING_KEY);
        setSaveStateWithTerminals("queued");
        setKbSaveNote("Undo/redo not saved on server yet — queued until Syncing…");
      } catch {
        setSaveStateWithTerminals("error");
        setError("Could not save this undo/redo step. Please try again.");
      }
    };
    if (updates.length === 0 && deletes.length === 0) {
      written();
      historyRejectedRef.current = null;
      pendingSavesRef.current.delete(HISTORY_PENDING_KEY);
      setSaveStateWithTerminals(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      return;
    }
    const mode = resolveClientDataMode();
    if (!isBrowserOnline() || mode === "offline") {
      queueForRetry();
      return;
    }
    setSaveStateWithTerminals("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/batch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Kebu-Data-Mode": mode },
        body: JSON.stringify({ updates, deletes }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status >= 400 && res.status < 500) {
        // Rejected (validation/auth): retrying the same snapshot cannot succeed — surface it and
        // keep the history write pending so the user sees the draft is not saved.
        const reason = `${typeof data.error === "string" ? data.error : "This undo/redo step could not be saved."} Your saved draft was not changed.`;
        historyRejectedRef.current = reason;
        setSaveStateWithTerminals("error");
        setError(reason);
        return;
      }
      if (!res.ok) {
        queueForRetry();
        return;
      }
      written();
      historyRejectedRef.current = null;
      pendingSavesRef.current.delete(HISTORY_PENDING_KEY);
      setPublishState((prev) =>
        prev
          ? { ...prev, hasUnpublishedChanges: true }
          : { isLive: false, hasUnpublishedChanges: true, lastPublishedAt: null, draftUpdatedAt: null, livePublicPath: null },
      );
      setSaveStateWithTerminals(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      setError(null);
    } catch {
      queueForRetry();
    }
  }

  /**
   * Whether the Builder can publish safely.
   * Returns false if there are queued, failed, or terminal items that must be resolved first.
   */
  function canPublishNow() {
    return builderSaveReadiness({
      projectId,
      pending: pendingSavesRef.current,
      terminalCount: pendingTerminalsRef.current.length,
      historyRejection: historyRejectedRef.current,
      queue: listOfflineQueue(),
    });
  }

  return {
    saveState: pendingTerminals.length > 0 ? ("needs-attention" as SaveState) : saveState,
    saveStatusLabel: pendingTerminals.length > 0 ? "Action required — some changes could not be saved" : saveStatusLabel,
    kbSaveNote,
    pendingTerminals,
    updateProps,
    updateChromeProps,
    persistProps,
    writeHistorySnapshot,
    writeStructure,
    commitStructure,
    currentSections,
    markAllSaved,
    saveDraftNow,
    checkpointPending,
    dismissTerminalItem,
    dismissAllTerminalItems,
    canPublishNow,
  };
}
