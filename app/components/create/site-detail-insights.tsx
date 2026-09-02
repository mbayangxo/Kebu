"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { kebuSitePreviewPath, liveSiteUrl } from "@/lib/create/site-urls";
import type { SiteAnalyticsSummary } from "@/lib/create/site-analytics";

const DEVICES = [
  { id: "desktop" as const, label: "Desktop", width: 1280, height: 800, radius: 10 },
  { id: "tablet" as const, label: "Tablet", width: 768, height: 1024, radius: 16 },
  { id: "mobile" as const, label: "Phone", width: 390, height: 844, radius: 24 },
];

function speedLabel(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function DevicePreview({
  device,
  src,
  title,
  active,
}: {
  device: (typeof DEVICES)[number];
  src: string | null;
  title: string;
  active: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const [ready, setReady] = useState(false);
  const chromeH = device.id === "desktop" ? 28 : 14;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / device.width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device.width]);

  useEffect(() => {
    setReady(false);
  }, [src, device.id]);

  const viewH = Math.round(device.height * scale);

  return (
    <div className="flex min-w-0 flex-col" style={{ flex: device.id === "desktop" ? "1.4 1 40%" : "1 1 28%" }}>
      <p className="mb-1.5 text-center text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: KEBU.muted }}>
        {device.label}
        <span className="font-medium normal-case tracking-normal opacity-70"> · {device.width}px</span>
      </p>
      <div
        ref={shellRef}
        className="relative w-full overflow-hidden bg-white shadow-md"
        style={{
          height: viewH + chromeH,
          borderRadius: device.radius,
          border: `2px solid ${KEBU.black}`,
        }}
      >
        {device.id === "desktop" ? (
          <div
            className="flex items-center gap-1 px-2"
            style={{ height: chromeH, background: "#F3F0EB", borderBottom: `1px solid ${KEBU.border}` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height: chromeH }}>
            <span className="h-1 w-10 rounded-full bg-black/20" aria-hidden />
          </div>
        )}
        <div className="relative overflow-hidden" style={{ height: viewH }}>
          {active && src ? (
            <iframe
              key={`${src}-${device.id}`}
              src={src}
              title={`${title} ${device.label}`}
              className="absolute left-0 top-0 origin-top-left border-0 bg-white"
              style={{
                width: device.width,
                height: device.height,
                transform: `scale(${scale})`,
                opacity: ready ? 1 : 0.35,
              }}
              tabIndex={-1}
              loading="lazy"
              onLoad={() => setReady(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${KEBU.black}, ${KEBU.orange})` }}
            >
              Publish to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  status,
  children,
}: {
  title: string;
  subtitle: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl bg-white p-4 sm:p-5"
      style={{ border: `1px solid ${KEBU.border}`, boxShadow: "0 8px 24px rgba(10,10,10,0.04)" }}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
            {title}
          </h2>
          <p className="mt-0.5 text-[11px]" style={{ color: KEBU.muted }}>
            {subtitle}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(0,200,81,0.12)", color: "#009E40" }}
        >
          {status}
        </span>
      </div>
      {children}
    </section>
  );
}

export function SiteDetailInsights({
  projectId,
  title,
  subdomain,
}: {
  projectId: string;
  title: string;
  subdomain: string | null;
}) {
  const [summary, setSummary] = useState<SiteAnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(72);
  const [liveProbeMs, setLiveProbeMs] = useState<number | null>(null);

  const previewSrc = useMemo(() => {
    if (!subdomain) return null;
    return kebuSitePreviewPath(subdomain) ?? `/sites/${subdomain}`;
  }, [subdomain]);
  const live = liveSiteUrl(subdomain);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics?hours=${hours}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not load analytics.");
        setSummary(null);
        return;
      }
      setSummary(json.summary as SiteAnalyticsSummary);
    } catch {
      setError("Network error loading analytics.");
    } finally {
      setLoading(false);
    }
  }, [projectId, hours]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!previewSrc) return;
    const started = performance.now();
    const controller = new AbortController();
    void fetch(previewSrc, { credentials: "include", signal: controller.signal, cache: "no-store" })
      .then(() => setLiveProbeMs(Math.round(performance.now() - started)))
      .catch(() => setLiveProbeMs(null));
    return () => controller.abort();
  }, [previewSrc]);

  const maxDay = Math.max(1, ...(summary?.byDay.map((d) => d.views) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
            Site detail · real Kebu analytics
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            {title}
          </h1>
          <p className="mt-1 text-xs font-mono" style={{ color: KEBU.muted }}>
            {subdomain ? `${subdomain}.kebu.africa` : "No public address yet — publish first to collect visitors"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: `1px solid ${KEBU.border}`, background: KEBU.white }}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            <option value={24}>Last 24h</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.black }}
          >
            Refresh
          </button>
          <Link
            href={`/create/${projectId}`}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.orange }}
          >
            Edit site
          </Link>
          {live ? (
            <a
              href={live}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ border: `1px solid ${KEBU.border}` }}
            >
              Open live
            </a>
          ) : null}
        </div>
      </div>

      <div
        className="flex flex-wrap items-end gap-3 overflow-x-auto rounded-2xl p-4 sm:flex-nowrap sm:gap-4"
        style={{ background: "linear-gradient(180deg, #EDE9E3 0%, #D9D3C9 100%)" }}
      >
        {DEVICES.map((d) => (
          <DevicePreview
            key={d.id}
            device={d}
            src={previewSrc}
            title={title}
            active={Boolean(previewSrc)}
          />
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
      {loading && !summary ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading analytics…
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Web Analytics"
          subtitle="Visitors & traffic from your live site (Kebu-owned, not Vercel Web Analytics)"
          status={summary && summary.pageviews > 0 ? "Collecting" : subdomain ? "Waiting for visits" : "Needs publish"}
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Views", value: summary?.pageviews ?? 0 },
              { label: "Paths", value: summary?.uniquePaths ?? 0 },
              {
                label: "Phone",
                value: summary?.byDevice.mobile ?? 0,
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl px-3 py-3 text-center" style={{ background: KEBU.cream }}>
                <p className="text-xl font-bold tabular-nums" style={{ color: KEBU.black }}>
                  {stat.value}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]" style={{ color: KEBU.muted }}>
            <span>Desktop {summary?.byDevice.desktop ?? 0}</span>
            <span>Tablet {summary?.byDevice.tablet ?? 0}</span>
            <span>Phone {summary?.byDevice.mobile ?? 0}</span>
          </div>
          <div className="mt-4 space-y-1.5">
            {(summary?.byDay ?? []).length === 0 ? (
              <p className="text-[11px]" style={{ color: KEBU.muted }}>
                No visits in this range yet. Open the live site on desktop, tablet, or phone to start collecting.
              </p>
            ) : (
              summary?.byDay.map((d) => (
                <div key={d.day} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 font-mono text-[10px]" style={{ color: KEBU.muted }}>
                    {d.day.slice(5)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "#EDE9E3" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(6, (d.views / maxDay) * 100)}%`, background: KEBU.orange }}
                    />
                  </div>
                  <span className="w-8 text-right text-[10px] font-bold tabular-nums">{d.views}</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Speed Insights"
          subtitle="Performance from real browsers + live probe (Kebu-owned)"
          status={summary?.perf.samples || summary?.vitals.length ? "Enabled" : "Armed"}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-3" style={{ background: KEBU.cream }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Avg page load
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{speedLabel(summary?.perf.avgLoadMs)}</p>
              <p className="text-[10px]" style={{ color: KEBU.muted }}>
                {summary?.perf.samples ?? 0} samples
              </p>
            </div>
            <div className="rounded-xl px-3 py-3" style={{ background: KEBU.cream }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Live probe now
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{speedLabel(liveProbeMs)}</p>
              <p className="text-[10px]" style={{ color: KEBU.muted }}>
                From your browser to the site
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {(summary?.vitals ?? []).length === 0 ? (
              <li className="text-[11px]" style={{ color: KEBU.muted }}>
                Core Web Vitals (LCP / FCP / CLS) appear after real visits on supporting browsers.
              </li>
            ) : (
              summary?.vitals.map((v) => (
                <li
                  key={v.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                  style={{ background: "#FAFAF8", border: `1px solid ${KEBU.border}` }}
                >
                  <span className="font-bold">{v.name}</span>
                  <span className="tabular-nums">
                    {v.name === "CLS" ? v.avg.toFixed(3) : `${Math.round(v.avg)} ms`} · {v.samples} samples
                  </span>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel
          title="Observability"
          subtitle="App health & uptime checks for this site"
          status={
            summary?.health.ok === true ? "Healthy" : summary?.health.ok === false ? "Failing" : "No cron yet"
          }
        >
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt style={{ color: KEBU.muted }}>Last health check</dt>
              <dd className="font-semibold">
                {summary?.health.checkedAt
                  ? new Date(summary.health.checkedAt).toLocaleString()
                  : "Not run yet (cron uses CRON_SECRET)"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: KEBU.muted }}>HTTP status</dt>
              <dd className="font-semibold tabular-nums">{summary?.health.httpStatus ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: KEBU.muted }}>Status</dt>
              <dd className="font-semibold">
                {summary?.health.ok === true
                  ? "OK"
                  : summary?.health.ok === false
                    ? summary.health.errorMessage || "Failing"
                    : "Unknown"}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="Runtime Logs"
          subtitle="View and debug client runtime errors from visitors"
          status={(summary?.errors.length ?? 0) > 0 ? `${summary?.errors.length} recent` : "Quiet"}
        >
          {(summary?.errors.length ?? 0) === 0 ? (
            <p className="text-[11px]" style={{ color: KEBU.muted }}>
              No client errors recorded in this range. Script failures on the live site will show here.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {summary?.errors.map((err) => (
                <li
                  key={err.id}
                  className="rounded-lg px-3 py-2 text-[11px]"
                  style={{ background: "#FFF1F0", border: "1px solid #F5C2C0", color: "#8B1E1E" }}
                >
                  <p className="font-semibold break-words">{err.message}</p>
                  <p className="mt-1 opacity-70">
                    {err.path} · {new Date(err.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
