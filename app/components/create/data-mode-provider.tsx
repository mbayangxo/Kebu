"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

const MODE_ICON_COLOR: Record<DataMode, string> = {
  normal: KEBU.orange,
  data_saver: "#22C55E",
  ultra: "#0EA5E9",
  offline: "#F59E0B",
};

/** Signal-bars icon — active bar count reflects mode intensity */
function DataModeSignalIcon({ mode }: { mode: DataMode }) {
  const c = MODE_ICON_COLOR[mode];
  const activeMap: Record<DataMode, [boolean, boolean, boolean]> = {
    normal: [true, true, true],
    data_saver: [true, true, false],
    ultra: [true, false, false],
    offline: [false, false, false],
  };
  const active = activeMap[mode];
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" aria-hidden>
      <rect x="0.5" y="8.5" width="3" height="5" rx="0.75" fill={c} opacity={active[0] ? 1 : 0.18} />
      <rect x="5.5" y="5" width="3" height="8.5" rx="0.75" fill={c} opacity={active[1] ? 1 : 0.18} />
      <rect x="10.5" y="0.5" width="3" height="13" rx="0.75" fill={c} opacity={active[2] ? 1 : 0.18} />
    </svg>
  );
}

/** Fixed icon-button dock — color and bar count change with data mode. */
export function DataModeDock() {
  const { mode, online } = useDataMode();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const color = MODE_ICON_COLOR[mode];
  const onlineDot = online ? "#22C55E" : "#F59E0B";

  return (
    <div ref={containerRef} className="kebu-data-mode-dock" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Data mode: ${labelDataMode(mode)}. Tap to change.`}
        aria-expanded={open}
        title={`${labelDataMode(mode)} — ${online ? "Online" : "Offline"}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: `${color}1A`,
          border: `1.5px solid ${color}66`,
          cursor: "pointer",
          outline: "none",
          transition: "background 0.2s ease, border-color 0.2s ease",
          boxShadow: open ? `0 0 0 3px ${color}22` : "none",
        }}
      >
        <DataModeSignalIcon mode={mode} />
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: onlineDot,
            border: "1.5px solid rgba(10,10,10,0.7)",
          }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Data mode settings"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 0.5rem)",
            zIndex: 10,
            minWidth: 196,
            background: "rgba(255,251,247,0.98)",
            border: "1px solid rgba(10,10,10,0.12)",
            borderRadius: "1rem",
            padding: "0.65rem 0.75rem",
            boxShadow: "0 4px 20px rgba(10,10,10,0.15)",
            backdropFilter: "blur(10px)",
            fontFamily: "var(--kebu-ui-font, system-ui, sans-serif)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: KEBU.black,
              }}
            >
              Data mode
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ fontSize: 11, fontWeight: 700, color: KEBU.muted, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          <DataModeControls compact />
        </div>
      )}
    </div>
  );
}
