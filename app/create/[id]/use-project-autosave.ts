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
import { enqueueSaveSection, isBrowserOnline } from "@/lib/create/offline-queue";
import type { PublishState } from "@/lib/create/publish-state";

/** The minimal shape this hook needs from a builder section — kept narrow so it doesn't depend on
 *  page.tsx's private `Section` type (which also carries page/layout fields this hook never touches). */
export interface AutosaveSection {
  id: string;
  props: Record<string, unknown>;
  [key: string]: unknown;
}

export type SaveState = "idle" | "unsaved" | "saving" | "saved" | "queued" | "error";

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
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const historyWindows = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const chromeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Section/chrome saves not yet CONFIRMED successful, keyed "section:<id>" or "chrome:header"/
   * "chrome:footer". Added the instant an edit is made; removed only when the server confirms the
   * write — so an errored or offline-queued save stays here until a real retry (Save draft, or the
   * offline-queue flush) actually confirms it, instead of the UI silently reporting "Draft saved"
   * while work is still pending.
   */
  const pendingSavesRef = useRef<Set<string>>(new Set());

  async function persistProps(sectionId: string, props: Record<string, unknown>) {
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      enqueueSaveSection({ projectId, sectionId, props });
      setSaveState("queued");
      setKbSaveNote("Not saved on server yet — queued until Syncing…");
      setError(null);
      return;
    }
    setSaveState("saving");
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
        setSaveState("error");
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
      setSaveState(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      setError(null);
    } catch {
      enqueueSaveSection({ projectId, sectionId, props });
      setSaveState("queued");
      setKbSaveNote("Not saved on server yet — queued until Syncing…");
      setError(null);
    }
  }

  async function persistChrome(part: "header" | "footer", props: Record<string, unknown>) {
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      setSaveState("queued");
      setKbSaveNote("Site header/footer queued until Syncing…");
      return;
    }
    setSaveState("saving");
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
        setSaveState("error");
        setError(typeof data.error === "string" ? data.error : "Could not save site header/footer.");
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
      setSaveState(pendingSavesRef.current.size > 0 ? "unsaved" : "saved");
      setError(null);
    } catch {
      setSaveState("queued");
      setKbSaveNote("Site header/footer queued until Syncing…");
    }
  }

  function updateChromeProps(part: "header" | "footer", patch: Record<string, unknown>) {
    pendingSavesRef.current.add(`chrome:${part}`);
    setSaveState("unsaved");
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
    setSaveState("unsaved");
    setSections((prev) => {
      // One undo snapshot per continuous edit gesture instead of one snapshot for every slider /
      // pointer event. This keeps drag/resize/typing responsive and makes Undo meaningful.
      if (!historyWindows.current[sectionId]) {
        pushHistory(prev);
      } else {
        clearTimeout(historyWindows.current[sectionId]);
      }
      historyWindows.current[sectionId] = setTimeout(() => {
        delete historyWindows.current[sectionId];
      }, 700);
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
  async function saveDraftNow(): Promise<boolean> {
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
      setSaveState("saved"); // explicit confirmation: nothing was pending, all is saved
      return true;
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
    return pendingSavesRef.current.size === 0;
  }

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

  // Clear any still-pending debounce timers on unmount — avoids a setState-after-unmount if the editor
  // page goes away mid-debounce (matches the equivalent cleanup that used to live in page.tsx's load effect).
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      Object.values(historyWindows.current).forEach(clearTimeout);
      if (chromeSaveTimer.current) clearTimeout(chromeSaveTimer.current);
    };
  }, []);

  const saveStatusLabel =
    saveState === "saving"
      ? "Saving draft…"
      : saveState === "queued"
        ? "Not saved yet — queued"
        : saveState === "error"
          ? "Save failed — click Save draft to retry"
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

  return {
    saveState,
    saveStatusLabel,
    kbSaveNote,
    updateProps,
    updateChromeProps,
    persistProps,
    markAllSaved,
    saveDraftNow,
  };
}
