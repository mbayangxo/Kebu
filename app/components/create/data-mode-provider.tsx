"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DATA_MODES,
  dataModeSiteClass,
  describeDataMode,
  labelDataMode,
  preferSystemFonts,
  resolveClientDataMode,
  writeStoredDataMode,
  type DataMode,
} from "@/lib/create/data-mode";
import {
  flushOfflineQueue,
  isBrowserOnline,
  listOfflineQueue,
  type FlushResult,
} from "@/lib/create/offline-queue";
import { evaluateKb, formatKb, type KbAction, type KbEvaluation } from "@/lib/create/kb-budget";
import { KEBU } from "@/lib/kebu-brand";

type DataModeContextValue = {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  online: boolean;
  queueCount: number;
  lastKb: KbEvaluation | null;
  reportKb: (action: KbAction, usedBytes: number) => KbEvaluation;
  flushQueue: () => Promise<FlushResult>;
  refreshQueueCount: () => void;
  syncing: boolean;
};

const DataModeContext = createContext<DataModeContextValue | null>(null);

function applyDocumentMode(mode: DataMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove(
    "kebu-mode-normal",
    "kebu-mode-data-saver",
    "kebu-mode-ultra",
    "kebu-mode-offline",
  );
  for (const cls of dataModeSiteClass(mode).split(/\s+/)) {
    if (cls) root.classList.add(cls);
  }
  root.dataset.kebuDataMode = mode;
  if (preferSystemFonts(mode)) {
    root.style.setProperty("--kebu-ui-font", "system-ui, -apple-system, sans-serif");
  } else {
    root.style.removeProperty("--kebu-ui-font");
  }
}

function DataModeProviderRoot({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DataMode>("data_saver");
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [lastKb, setLastKb] = useState<KbEvaluation | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const resolved = resolveClientDataMode();
    setModeState(resolved);
    applyDocumentMode(resolved);
    setOnline(isBrowserOnline());
    setQueueCount(listOfflineQueue().length);

    const onOnline = () => {
      setOnline(true);
      void (async () => {
        setSyncing(true);
        const result = await flushOfflineQueue();
        setQueueCount(listOfflineQueue().length);
        setSyncing(false);
        if (result.synced > 0) {
          setLastKb({
            action: "save_section",
            mode: "offline",
            usedKb: 0,
            budgetKb: 12,
            withinBudget: true,
            overByKb: 0,
            summary: `Synced ${result.synced} queued action${result.synced === 1 ? "" : "s"}.`,
          });
        }
      })();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const setMode = useCallback((next: DataMode) => {
    setModeState(next);
    writeStoredDataMode(next);
    applyDocumentMode(next);
  }, []);

  const reportKb = useCallback(
    (action: KbAction, usedBytes: number) => {
      const ev = evaluateKb({ action, mode, usedBytes });
      setLastKb(ev);
      return ev;
    },
    [mode],
  );

  const refreshQueueCount = useCallback(() => {
    setQueueCount(listOfflineQueue().length);
  }, []);

  useEffect(() => {
    const onQueue = () => refreshQueueCount();
    window.addEventListener("kebu-offline-queue-changed", onQueue);
    return () => window.removeEventListener("kebu-offline-queue-changed", onQueue);
  }, [refreshQueueCount]);

  const flushQueue = useCallback(async () => {
    setSyncing(true);
    const result = await flushOfflineQueue();
    setQueueCount(listOfflineQueue().length);
    setSyncing(false);
    return result;
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      online,
      queueCount,
      lastKb,
      reportKb,
      flushQueue,
      refreshQueueCount,
      syncing,
    }),
    [mode, setMode, online, queueCount, lastKb, reportKb, flushQueue, refreshQueueCount, syncing],
  );

  return <DataModeContext.Provider value={value}>{children}</DataModeContext.Provider>;
}

export function DataModeProvider({ children }: { children: ReactNode }) {
  const parent = useContext(DataModeContext);
  if (parent) return <>{children}</>;
  return <DataModeProviderRoot>{children}</DataModeProviderRoot>;
}

export function useDataMode(): DataModeContextValue {
  const ctx = useContext(DataModeContext);
  if (!ctx) {
    return {
      mode: "data_saver",
      setMode: () => {},
      online: true,
      queueCount: 0,
      lastKb: null,
      reportKb: (action, usedBytes) => evaluateKb({ action, mode: "data_saver", usedBytes }),
      flushQueue: async () => ({ synced: 0, failed: 0, remaining: 0 }),
      refreshQueueCount: () => {},
      syncing: false,
    };
  }
  return ctx;
}

/** Compact control: mode chips + last KB reading + Syncing… */
export function DataModeControls({ compact = false }: { compact?: boolean }) {
  const { mode, setMode, online, queueCount, lastKb, syncing, flushQueue } = useDataMode();

  return (
    <div
      className={compact ? "flex flex-wrap items-center gap-1.5" : "flex flex-col gap-2"}
      style={{ fontFamily: "var(--kebu-ui-font, system-ui, sans-serif)" }}
    >
      <div className="flex flex-wrap gap-1">
        {DATA_MODES.map((m) => (
          <button
            key={m}
            type="button"
            title={describeDataMode(m)}
            onClick={() => setMode(m)}
            className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
            style={{
              background: mode === m ? KEBU.black : "rgba(255,255,255,0.9)",
              color: mode === m ? "#fff" : KEBU.black,
              border: `1px solid ${KEBU.border}`,
            }}
          >
            {labelDataMode(m)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px]" style={{ color: KEBU.muted }}>
        {!online ? (
          <span style={{ color: "#B45309" }}>Offline — not saved on server until Syncing…</span>
        ) : syncing ? (
          <span style={{ color: KEBU.orange }}>Syncing…</span>
        ) : queueCount > 0 ? (
          <button
            type="button"
            className="font-bold underline"
            style={{ color: KEBU.orange }}
            onClick={() => void flushQueue()}
          >
            {queueCount} queued — tap to sync
          </button>
        ) : (
          <span>Online</span>
        )}
        {lastKb ? (
          <span title={lastKb.summary} style={{ color: lastKb.withinBudget ? "#166534" : "#B45309" }}>
            {lastKb.summary.includes("Synced")
              ? lastKb.summary
              : `${formatKb(lastKb.usedKb)} / ${formatKb(lastKb.budgetKb)}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Fixed dock for builder / live site / app shell. */
export function DataModeDock() {
  return (
    <div className="kebu-data-mode-dock" aria-label="Data mode">
      <DataModeControls compact />
    </div>
  );
}
