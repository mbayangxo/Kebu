"use client";

/**
 * Skeleton shimmer components for loading states.
 * Africa has slow connections — show content shape before data arrives.
 */

/* ─── Base shimmer block ──────────────────────────────────────────────────── */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 6,
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="kebu-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/* ─── Text line(s) ───────────────────────────────────────────────────────── */
export function SkeletonText({ lines = 1, lastWidth = "60%" }: { lines?: number; lastWidth?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 && lines > 1 ? lastWidth : "100%"}
        />
      ))}
    </div>
  );
}

/* ─── Card skeleton ──────────────────────────────────────────────────────── */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: "1px solid rgba(10,10,10,0.08)",
      padding: "1rem 1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <Skeleton height={18} width="45%" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Skeleton width={36} height={36} radius={8} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton height={13} width="70%" />
            <Skeleton height={11} width="45%" />
          </div>
          <Skeleton height={13} width={48} style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Table row skeleton ─────────────────────────────────────────────────── */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {/* header */}
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16, padding: "10px 16px",
        background: "rgba(10,10,10,0.04)", borderRadius: "8px 8px 0 0",
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={11} width="60%" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16, padding: "12px 16px",
          background: "#fff",
          borderBottom: "1px solid rgba(10,10,10,0.06)",
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={13} width={c === 0 ? "80%" : "55%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Stat tile skeleton ─────────────────────────────────────────────────── */
export function SkeletonStatTile() {
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: "1px solid rgba(10,10,10,0.08)",
      padding: "1rem 1.25rem",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <Skeleton height={11} width="50%" />
      <Skeleton height={28} width="60%" />
      <Skeleton height={10} width="40%" />
    </div>
  );
}

/* ─── Panel loading — replaces spinner ──────────────────────────────────── */
export function PanelLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        {[1, 2, 3, 4].slice(0, Math.min(rows, 4)).map((i) => <SkeletonStatTile key={i} />)}
      </div>
      <SkeletonCard rows={rows} />
    </div>
  );
}
