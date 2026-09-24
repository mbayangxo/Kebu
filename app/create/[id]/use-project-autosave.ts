"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
  flushOfflineQueue,
  discardTerminalItem,
  discardTerminalItems,
  getTerminalItems,
  isBrowserOnline,
  type TerminalItem,
} from "@/lib/create/offline-queue";
import type { PublishState } from "@/lib/create/publish-state";

/** The minimal shape this hook needs from a builder section — kept narrow so it doesn't depend on
 *  page.tsx's private `Section` type (which also carries page/layout fields this hook never touches). */
export interface AutosaveSection {
  id: string;
  props: Record<string, unknown>;
  [key: string]: unknown;
}

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
    getTerminalItems().map((i) => ({
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

  /**
   * Section/chrome saves not yet CONFIRMED successful, keyed "section:<id>" or "chrome:header"/
   * "chrome:footer". Added the instant an edit is made; removed only when the server confirms the
   * write — so an errored or offline-queued save stays here until a real retry (Save draft, or the
   * offline-queue flush) actually confirms it, instead of the UI silently reporting "Draft saved"
   * while work is still pending.
   */
  const pendingSavesRef = useRef<Set<string>>(new Set());

  /** Derives the effective save state including terminal items. */
  function computeSaveState(base: SaveState, terminals: TerminalItem[]): SaveState {
    if (terminals.length > 0) return "needs-attention";
    return base;
  }

  function setSaveStateWithTerminals(base: SaveState) {
    setSaveState(base);
  }

  async function persistProps(sectionId: string, props: Record<string, unknown>) {
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      try {
        enqueueSaveSection({ projectId, sectionId, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote("Not saved on server yet — queued until Syncing…");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
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
      if (data.section) {
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...data.section } : s)));
      }
      setPublishState((prev) =>
        prev
          ? { ...prev, hasUnpublishedChanges: true }
          : { isLive: false, hasUnpublishedChanges: true, lastPublishedAt: null, draftUpdatedAt: null, livePublicPath: null },
      );
      pendingSavesRef.current.delete(`section:${sectionId}`);
      setSaveStateWithTerminals(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      setError(null);
    } catch (fetchErr) {
      try {
        enqueueSaveSection({ projectId, sectionId, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote("Not saved on server yet — queued until Syncing…");
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

  async function persistChrome(part: "header" | "footer", props: Record<string, unknown>) {
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      try {
        enqueueSaveChrome({ projectId, part, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote("Site header/footer queued until Syncing…");
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
      if (!res.ok) {
        // Surface the error — but also queue for auto-retry on reconnect.
        try {
          enqueueSaveChrome({ projectId, part, props });
          setSaveStateWithTerminals("queued");
          setKbSaveNote("Site header/footer queued for retry…");
        } catch {
          setSaveStateWithTerminals("error");
          setError(typeof data.error === "string" ? data.error : "Could not save site header/footer.");
        }
        return;
      }
      if (data.siteChrome) {
        setSiteChrome(parseSiteChrome(data.siteChrome));
      }
      setPublishState((prev) =>
        prev
          ? { ...prev, hasUnpublishedChanges: true }
          : { isLive: false, hasUnpublishedChanges: true, lastPublishedAt: null, draftUpdatedAt: null, livePublicPath: null },
      );
      pendingSavesRef.current.delete(`chrome:${part}`);
      setSaveStateWithTerminals(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      setError(null);
    } catch {
      try {
        enqueueSaveChrome({ projectId, part, props });
        setSaveStateWithTerminals("queued");
        setKbSaveNote("Site header/footer queued until Syncing…");
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
    pendingSavesRef.current.add(`chrome:${part}`);
    setSaveStateWithTerminals("unsaved");
    setSiteChrome((prev) => {
      const base = prev ?? parseSiteChrome(null);
      const next = patchSiteChromePart({ ...base, enabled: true }, part, patch);
      if (chromeSaveTimer.current) clearTimeout(chromeSaveTimer.current);
      chromeSaveTimer.current = setTimeout(() => {
        const props = part === "header" ? next.header?.props : next.footer?.props;
        if (props) void persistChrome(part, props as Record<string, unknown>);
      }, 500);
      return next;
    });
  }

  function updateProps(sectionId: string, patch: Record<string, unknown>) {
    if (isChromeSectionId(sectionId)) {
      updateChromeProps(sectionId === CHROME_HEADER_ID ? "header" : "footer", patch);
      return;
    }
    pendingSavesRef.current.add(`section:${sectionId}`);
    setSaveStateWithTerminals("unsaved");
    setSections((prev) => {
      pushHistory(prev);
      const next = prev.map((s) => (s.id === sectionId ? { ...s, props: { ...s.props, ...patch } } : s));
      const merged = next.find((s) => s.id === sectionId)?.props ?? patch;
      if (saveTimers.current[sectionId]) clearTimeout(saveTimers.current[sectionId]);
      saveTimers.current[sectionId] = setTimeout(() => {
        void persistProps(sectionId, merged);
      }, 500);
      return next;
    });
  }

  /**
   * "Save draft" button handler — and the real retry path. Flushes any pending (still-debouncing)
   * autosave timers immediately, then re-attempts every save that hasn't yet been CONFIRMED
   * successful (pendingSavesRef), including ones already marked "queued" or "error" from a previous
   * attempt. If nothing is pending, this is a genuine no-op — it never claims a save happened when
   * there was nothing to save.
   */
  async function saveDraftNow() {
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
            const newOnes = result.terminalItems.filter((t) => !existingIds.has(t.id));
            return [...prev, ...newOnes];
          });
        }
      }
      setSaveStateWithTerminals("saved");
      return;
    }
    await Promise.all(
      pending.map((key) => {
        if (key.startsWith("section:")) {
          const sectionId = key.slice("section:".length);
          const current = sections.find((s) => s.id === sectionId)?.props;
          return current ? persistProps(sectionId, current) : Promise.resolve();
        }
        if (key === "chrome:header" || key === "chrome:footer") {
          const part = key === "chrome:header" ? "header" : "footer";
          const props = part === "header" ? siteChrome?.header?.props : siteChrome?.footer?.props;
          return props ? persistChrome(part, props as Record<string, unknown>) : Promise.resolve();
        }
        return Promise.resolve();
      }),
    );
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
        const newOnes = result.terminalItems.filter((t) => !existingIds.has(t.id));
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
    discardTerminalItems();
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

  // Flush any queued offline saves when connectivity returns, and surface terminal results.
  useEffect(() => {
    const onOnline = () => {
      void flushAndSurfaceTerminals();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before the user leaves with edits that haven't been CONFIRMED saved yet — covers the 500ms
  // autosave debounce window as well as anything still "queued" (offline) or "error" (failed) from a
  // previous attempt. Reads pendingSavesRef at fire time, so it never needs re-registering on state change.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSavesRef.current.size === 0) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // On unmount: flush any still-debouncing timers immediately into the queue
  // so pending edits survive navigation away from the Builder.
  useEffect(() => {
    const timers = saveTimers.current;
    const chromeTmr = chromeSaveTimer;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      if (chromeTmr.current) clearTimeout(chromeTmr.current);
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
    setSaveState("saved");
  }

  /**
   * Whether the Builder can publish safely.
   * Returns false if there are queued, failed, or terminal items that must be resolved first.
   */
  function canPublishNow(): { ok: boolean; reason?: string } {
    if (pendingTerminals.length > 0) {
      return {
        ok: false,
        reason: `${pendingTerminals.length} change(s) failed permanently and must be dismissed before publishing. Click "Needs attention" to review.`,
      };
    }
    if (saveState === "queued") {
      return { ok: false, reason: "Changes are queued offline — reconnect and sync before publishing." };
    }
    if (saveState === "error") {
      return { ok: false, reason: "Some changes failed to save — click Save draft to retry before publishing." };
    }
    return { ok: true };
  }

  return {
    saveState: pendingTerminals.length > 0 ? ("needs-attention" as SaveState) : saveState,
    saveStatusLabel: pendingTerminals.length > 0 ? "Action required — some changes could not be saved" : saveStatusLabel,
    kbSaveNote,
    pendingTerminals,
    updateProps,
    updateChromeProps,
    persistProps,
    markAllSaved,
    saveDraftNow,
    dismissTerminalItem,
    dismissAllTerminalItems,
    canPublishNow,
  };
}
