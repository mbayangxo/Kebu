"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { KEBU } from "@/lib/kebu-brand";

type Project = { id: string; title: string; question: string; notes: string; updated_at: string };
type Source = { id: string; label: string; source_url: string; source_name: string; trust_label: string; note: string; created_at: string };

export default function OpportunityResearchPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId) ?? null, [projects, selectedId]);

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/opportunity/research", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not load research."); return; }
    const list = Array.isArray(data.projects) ? data.projects as Project[] : [];
    setProjects(list);
    setSelectedId((current) => current && list.some((project) => project.id === current) ? current : list[0]?.id ?? null);
  }, []);

  const loadProject = useCallback(async (id: string) => {
    const res = await fetch("/api/opportunity/research?projectId=" + encodeURIComponent(id), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not load research project."); return; }
    setSources(Array.isArray(data.sources) ? data.sources : []);
    if (data.project) setNotes(data.project.notes || "");
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useEffect(() => { if (selectedId) void loadProject(selectedId); else setSources([]); }, [loadProject, selectedId]);

  async function createProject() {
    if (!title.trim()) return;
    const res = await fetch("/api/opportunity/research", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), question }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.project) { setError(data.error || "Could not create project."); return; }
    setProjects((current) => [data.project, ...current]);
    setSelectedId(data.project.id);
    setTitle(""); setQuestion(""); setNotes("");
  }

  async function saveNotes() {
    if (!selected) return;
    const res = await fetch("/api/opportunity/research", {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not save notes."); return; }
    setProjects((current) => current.map((project) => project.id === selected.id ? { ...project, notes, updated_at: data.project.updated_at } : project));
  }

  async function addSource() {
    if (!selected || !sourceLabel.trim() || !sourceUrl.trim()) return;
    const res = await fetch("/api/opportunity/research", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "source", projectId: selected.id, label: sourceLabel.trim(), sourceUrl: sourceUrl.trim(), note: sourceNote }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.source) { setError(data.error || "Could not save source."); return; }
    setSources((current) => [data.source, ...current]);
    setSourceLabel(""); setSourceUrl(""); setSourceNote("");
  }

  return (
    <OpportunityOsShell title="Research Lab" eyebrow="Opportunity OS · Research Lab" headline="Build research you can trace." subhead="Save questions, notes and source links together. Research stays evidence-first; Kebu does not invent missing sources.">
      {error ? <div className="mb-4 rounded-xl border px-4 py-3 text-xs" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <section className="rounded-[20px] border bg-white p-3.5" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>New research</p>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project title" className="mt-2 min-h-10 w-full rounded-xl border px-3 text-xs font-bold outline-none" style={{ borderColor: KEBU.borders.default }} />
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="What are you trying to understand?" className="mt-2 w-full rounded-xl border px-3 py-2 text-[11px] outline-none" style={{ borderColor: KEBU.borders.default }} />
            <button type="button" onClick={() => void createProject()} disabled={!title.trim()} className="mt-2 rounded-full bg-black px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35">Create →</button>
          </section>
          <section className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: KEBU.borders.default }}>
            {projects.map((project) => <button key={project.id} type="button" onClick={() => setSelectedId(project.id)} className="w-full border-b px-3 py-3 text-left" style={{ borderColor: KEBU.borders.subtle, background: selectedId === project.id ? "rgba(255,106,0,.07)" : undefined }}><p className="truncate text-[11px] font-black">{project.title}</p><p className="mt-1 truncate text-[9px]" style={{ color: KEBU.muted }}>{project.question || "No research question yet"}</p></button>)}
            {!projects.length ? <p className="p-5 text-[10px]" style={{ color: KEBU.muted }}>No research projects yet.</p> : null}
          </section>
        </aside>

        <main>
          {selected ? (
            <div className="space-y-5">
              <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
                <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Working notes</p>
                <h2 className="mt-1 text-xl font-black">{selected.title}</h2>
                {selected.question ? <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{selected.question}</p> : null}
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={12} placeholder="Write findings, compare evidence, record open questions…" className="mt-4 w-full rounded-xl border px-3 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
                <button type="button" onClick={() => void saveNotes()} className="mt-3 rounded-full bg-black px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white">Save notes</button>
              </section>

              <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
                <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Sources</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} placeholder="Source label" className="min-h-10 rounded-xl border px-3 text-xs font-bold outline-none" style={{ borderColor: KEBU.borders.default }} />
                  <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://official-source…" className="min-h-10 rounded-xl border px-3 text-xs outline-none" style={{ borderColor: KEBU.borders.default }} />
                </div>
                <textarea value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} rows={2} placeholder="What does this source support?" className="mt-2 w-full rounded-xl border px-3 py-2 text-[11px] outline-none" style={{ borderColor: KEBU.borders.default }} />
                <button type="button" onClick={() => void addSource()} disabled={!sourceLabel.trim() || !sourceUrl.trim()} className="mt-2 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35" style={{ background: KEBU.orange }}>Add source</button>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {sources.map((source) => <a key={source.id} href={source.source_url} target="_blank" rel="noreferrer" className="rounded-[16px] border p-3" style={{ borderColor: KEBU.borders.default }}><div className="flex items-start justify-between gap-3"><p className="text-[11px] font-black">{source.label}</p><span className="text-[8px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>{source.trust_label.replaceAll("_"," ")}</span></div><p className="mt-1 truncate text-[9px]" style={{ color: KEBU.muted }}>{source.source_name || source.source_url}</p>{source.note ? <p className="mt-2 text-[9px] leading-relaxed">{source.note}</p> : null}</a>)}
                </div>
              </section>
            </div>
          ) : <div className="rounded-[22px] border border-dashed bg-white p-10 text-center" style={{ borderColor: KEBU.borders.default }}><p className="text-sm font-black">Create a research project to begin.</p></div>}
        </main>
      </div>
    </OpportunityOsShell>
  );
}
