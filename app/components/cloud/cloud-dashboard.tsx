"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Quota = { usedBytes: number; limitBytes: number; tierName: string };
type Bucket = { id: string; name: string; visibility: "private" | "public"; fileCount: number; sizeBytes: number; created_at: string };
type CloudFile = { id: string; file_name: string; mime_type: string; size_bytes: number; created_at: string };
type Deployment = { id: string; name: string; slug: string; live_version_id: string | null; liveUrl: string | null; created_at: string };
type DeploymentVersion = { id: string; version_number: number; size_bytes: number; file_count: number; created_at: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function CloudDashboard() {
  const [tab, setTab] = useState<"storage" | "deployments">("storage");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: KEBU.orange }}>
          Kebu Cloud
        </p>
        <h1 className="text-2xl font-black mb-1" style={{ color: KEBU.black, fontFamily: "var(--font-fraunces)" }}>
          Storage & static hosting
        </h1>
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Static deployments are isolated: forms, popups, browser storage and embedded frames are restricted.
          Real object storage and static site hosting. No server-side code runs here — every deployment is served as-is,
          on its own subdomain, isolated from your Kebu account.
        </p>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: KEBU.border }}>
        {(["storage", "deployments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-bold capitalize -mb-px border-b-2"
            style={{
              color: tab === t ? KEBU.orange : KEBU.muted,
              borderColor: tab === t ? KEBU.orange : "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "storage" ? <StoragePanel /> : <DeploymentsPanel />}
    </div>
  );
}

function QuotaBar({ quota }: { quota: Quota | null }) {
  if (!quota) return null;
  const pct = quota.limitBytes > 0 ? Math.min(100, (quota.usedBytes / quota.limitBytes) * 100) : 0;
  return (
    <div className="rounded-xl p-4" style={{ background: "#FAFAF8", border: `1px solid ${KEBU.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold" style={{ color: KEBU.black }}>
          {formatBytes(quota.usedBytes)} / {formatBytes(quota.limitBytes)} used
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          {quota.tierName}
        </p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: KEBU.border }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "#D64545" : KEBU.orange }} />
      </div>
    </div>
  );
}

function StoragePanel() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/cloud/buckets", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setBuckets(Array.isArray(data.buckets) ? data.buckets : []);
      setQuota(data.quota ?? null);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function createBucket() {
    if (!newBucketName.trim()) return;
    setBusy("create"); setError(null);
    try {
      const res = await fetch("/api/cloud/buckets", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBucketName.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not create bucket."); return; }
      setNewBucketName("");
      await load();
    } finally { setBusy(null); }
  }

  async function deleteBucket(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/cloud/buckets/${id}`, { method: "DELETE", credentials: "include" });
      if (activeBucket === id) setActiveBucket(null);
      await load();
    } finally { setBusy(null); }
  }

  if (loading) return <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p>;

  return (
    <div className="space-y-4">
      <QuotaBar quota={quota} />
      {error ? <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>{error}</p> : null}

      <div className="flex gap-2">
        <input
          value={newBucketName}
          onChange={(e) => setNewBucketName(e.target.value)}
          placeholder="new-bucket-name"
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        <button
          type="button"
          disabled={busy === "create"}
          onClick={() => void createBucket()}
          className="rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          Create bucket
        </button>
      </div>

      <div className="space-y-2">
        {buckets.map((b) => (
          <div key={b.id} className="rounded-xl" style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}>
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => setActiveBucket(activeBucket === b.id ? null : b.id)}
                className="text-left"
              >
                <p className="text-sm font-bold" style={{ color: KEBU.black }}>{b.name}</p>
                <p className="text-[10px]" style={{ color: KEBU.muted }}>
                  {b.fileCount} file{b.fileCount === 1 ? "" : "s"} · {formatBytes(b.sizeBytes)} · {b.visibility}
                </p>
              </button>
              <button
                type="button"
                disabled={busy === b.id}
                onClick={() => void deleteBucket(b.id)}
                className="text-xs font-bold"
                style={{ color: "#D64545" }}
              >
                Delete
              </button>
            </div>
            {activeBucket === b.id ? <BucketFiles bucketId={b.id} onChange={load} /> : null}
          </div>
        ))}
        {!buckets.length ? <p className="text-sm" style={{ color: KEBU.muted }}>No buckets yet.</p> : null}
      </div>
    </div>
  );
}

function BucketFiles({ bucketId, onChange }: { bucketId: string; onChange: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cloud/buckets/${bucketId}/files`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setFiles(Array.isArray(data.files) ? data.files : []);
  }, [bucketId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy("upload"); setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/cloud/buckets/${bucketId}/files`, { method: "POST", credentials: "include", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
      await load();
      onChange();
    } finally { setBusy(null); }
  }

  async function download(fileId: string) {
    const res = await fetch(`/api/cloud/files/${fileId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.downloadUrl) window.open(data.downloadUrl, "_blank");
  }

  async function remove(fileId: string) {
    setBusy(fileId);
    try {
      await fetch(`/api/cloud/files/${fileId}`, { method: "DELETE", credentials: "include" });
      await load();
      onChange();
    } finally { setBusy(null); }
  }

  return (
    <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: KEBU.border }}>
      {error ? <p className="text-xs" style={{ color: "#D64545" }}>{error}</p> : null}
      <button
        type="button"
        disabled={busy === "upload"}
        onClick={() => fileRef.current?.click()}
        className="rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
        style={{ background: KEBU.black }}
      >
        {busy === "upload" ? "Uploading…" : "Upload file"}
      </button>
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }} />

      {loading ? null : files.map((f) => (
        <div key={f.id} className="flex items-center justify-between text-xs py-1">
          <button type="button" onClick={() => void download(f.id)} className="underline" style={{ color: KEBU.black }}>
            {f.file_name}
          </button>
          <div className="flex items-center gap-3">
            <span style={{ color: KEBU.muted }}>{formatBytes(f.size_bytes)}</span>
            <button type="button" disabled={busy === f.id} onClick={() => void remove(f.id)} style={{ color: "#D64545" }}>
              Delete
            </button>
          </div>
        </div>
      ))}
      {!loading && !files.length ? <p className="text-xs" style={{ color: KEBU.muted }}>Empty.</p> : null}
    </div>
  );
}

function DeploymentsPanel() {
  const bundleRef = useRef<HTMLInputElement>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/cloud/deployments", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setDeployments(Array.isArray(data.deployments) ? data.deployments : []);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function create() {
    if (!name.trim() || !slug.trim()) { setError("Name and slug are both required."); return; }
    setBusy("create"); setError(null);
    try {
      const res = await fetch("/api/cloud/deployments", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not create deployment."); return; }
      setName(""); setSlug("");
      await load();
    } finally { setBusy(null); }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/cloud/deployments/${id}`, { method: "DELETE", credentials: "include" });
      if (active === id) setActive(null);
      await load();
    } finally { setBusy(null); }
  }

  if (loading) return <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p>;

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>{error}</p> : null}

      <div className="rounded-xl p-4 space-y-2" style={{ border: `1px solid ${KEBU.border}`, background: "#FAFAF8" }}>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" className="flex-1 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: KEBU.border }} />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-app" className="flex-1 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: KEBU.border }} />
        </div>
        <p className="text-[10px]" style={{ color: KEBU.muted }}>Lives at https://&lt;slug&gt;.cloud.kebu.africa — its own isolated origin.</p>
        <button
          type="button"
          disabled={busy === "create"}
          onClick={() => void create()}
          className="rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          Create deployment
        </button>
      </div>

      <div className="space-y-2">
        {deployments.map((d) => (
          <div key={d.id} className="rounded-xl" style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}>
            <div className="flex items-center justify-between px-4 py-3">
              <button type="button" onClick={() => setActive(active === d.id ? null : d.id)} className="text-left">
                <p className="text-sm font-bold" style={{ color: KEBU.black }}>{d.name}</p>
                <p className="text-[10px]" style={{ color: KEBU.muted }}>
                  {d.liveUrl ? <a href={d.liveUrl} target="_blank" rel="noreferrer" className="underline">{d.liveUrl}</a> : "Not live yet"}
                </p>
              </button>
              <button type="button" disabled={busy === d.id} onClick={() => void remove(d.id)} className="text-xs font-bold" style={{ color: "#D64545" }}>
                Delete
              </button>
            </div>
            {active === d.id ? <DeploymentVersions deploymentId={d.id} bundleRef={bundleRef} onChange={load} /> : null}
          </div>
        ))}
        {!deployments.length ? <p className="text-sm" style={{ color: KEBU.muted }}>No deployments yet.</p> : null}
      </div>
    </div>
  );
}

function DeploymentVersions({
  deploymentId,
  bundleRef,
  onChange,
}: {
  deploymentId: string;
  bundleRef: React.RefObject<HTMLInputElement | null>;
  onChange: () => void;
}) {
  const [versions, setVersions] = useState<DeploymentVersion[]>([]);
  const [liveVersionId, setLiveVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cloud/deployments/${deploymentId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setVersions(Array.isArray(data.versions) ? data.versions : []);
      setLiveVersionId(data.deployment?.live_version_id ?? null);
    }
  }, [deploymentId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function uploadBundle(file: File | undefined) {
    if (!file) return;
    setBusy("upload"); setError(null);
    try {
      const form = new FormData();
      form.set("bundle", file);
      const res = await fetch(`/api/cloud/deployments/${deploymentId}/versions`, { method: "POST", credentials: "include", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
      await load();
      onChange();
    } finally { setBusy(null); }
  }

  async function promote(versionId: string) {
    setBusy(versionId);
    try {
      const res = await fetch(`/api/cloud/deployments/${deploymentId}/versions/${versionId}/promote`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not promote version."); return; }
      await load();
      onChange();
    } finally { setBusy(null); }
  }

  return (
    <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: KEBU.border }}>
      {error ? <p className="text-xs" style={{ color: "#D64545" }}>{error}</p> : null}
      <button
        type="button"
        disabled={busy === "upload"}
        onClick={() => bundleRef.current?.click()}
        className="rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
        style={{ background: KEBU.black }}
      >
        {busy === "upload" ? "Uploading…" : "Upload new version (.zip)"}
      </button>
      <input
        ref={bundleRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => { void uploadBundle(e.target.files?.[0]); e.currentTarget.value = ""; }}
      />
      <p className="text-[10px]" style={{ color: KEBU.muted }}>Zip must include an index.html at its root. Static assets only — no server code runs.</p>

      {loading ? null : versions.map((v) => (
        <div key={v.id} className="flex items-center justify-between text-xs py-1.5">
          <span style={{ color: KEBU.black }}>
            v{v.version_number} · {v.file_count} files · {formatBytes(v.size_bytes)}
            {liveVersionId === v.id ? <span className="ml-2 font-bold" style={{ color: "#1B6B3A" }}>LIVE</span> : null}
          </span>
          {liveVersionId !== v.id ? (
            <button type="button" disabled={busy === v.id} onClick={() => void promote(v.id)} className="font-bold" style={{ color: KEBU.orange }}>
              Promote to live
            </button>
          ) : null}
        </div>
      ))}
      {!loading && !versions.length ? <p className="text-xs" style={{ color: KEBU.muted }}>No versions uploaded yet.</p> : null}
    </div>
  );
}
