"use client";

import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";

type Experience = { title: string; description: string; kind: "formal" | "informal"; startAt?: string | null; endAt?: string | null };
type Profile = {
  headline: string | null; bio: string; skills: string[]; languages: string[]; experience: Experience[];
  location: string | null; countryCode: string | null; remoteEligible: boolean;
  availability: "open" | "limited" | "unavailable" | null; isDiscoverable: boolean; verifiedAt: string | null;
};
type LibraryNode = { id: string; title: string; kind: string };
type EvidenceLink = { id: string; library_node_id: string; label: string | null; created_at: string };

const fieldStyle = { borderColor: KEBU.borders.default } as const;

export function LigueyProfilePanel({ libraryNodes }: { libraryNodes: LibraryNode[] }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [location, setLocation] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [remoteEligible, setRemoteEligible] = useState(false);
  const [availability, setAvailability] = useState<"" | "open" | "limited" | "unavailable">("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [experience, setExperience] = useState<Experience[]>([]);

  const [evidence, setEvidence] = useState<EvidenceLink[]>([]);
  const [evidenceNodes, setEvidenceNodes] = useState<Record<string, { title: string; kind: string }>>({});
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [profileRes, evidenceRes] = await Promise.all([fetch("/api/liguey/profile"), fetch("/api/liguey/profile/evidence")]);
        const profileBody = await profileRes.json();
        if (profileRes.ok) {
          const p: Profile = profileBody.profile;
          setProfile(p);
          setHeadline(p.headline ?? "");
          setBio(p.bio);
          setSkills(p.skills.join(", "));
          setLanguages(p.languages.join(", "));
          setLocation(p.location ?? "");
          setCountryCode(p.countryCode ?? "");
          setRemoteEligible(p.remoteEligible);
          setAvailability(p.availability ?? "");
          setIsDiscoverable(p.isDiscoverable);
          setExperience(p.experience);
        } else {
          setError(profileBody.error ?? "Could not load your profile.");
        }
        const evidenceBody = await evidenceRes.json();
        if (evidenceRes.ok) {
          setEvidence(evidenceBody.evidence ?? []);
          const map: Record<string, { title: string; kind: string }> = {};
          for (const node of evidenceBody.nodes ?? []) map[node.id] = { title: node.title, kind: node.kind };
          setEvidenceNodes(map);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addExperience() {
    setExperience((prev) => [...prev, { title: "", description: "", kind: "informal" }]);
  }
  function updateExperience(index: number, patch: Partial<Experience>) {
    setExperience((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }
  function removeExperience(index: number) {
    setExperience((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/liguey/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline.trim() || null,
          bio,
          skills: skills.split(",").map((value) => value.trim()).filter(Boolean),
          languages: languages.split(",").map((value) => value.trim()).filter(Boolean),
          location: location.trim() || null,
          countryCode: countryCode.trim() ? countryCode.trim().toUpperCase() : null,
          remoteEligible,
          availability: availability || null,
          isDiscoverable,
          experience: experience.filter((entry) => entry.title.trim().length > 0),
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not save your profile."); return; }
      setProfile(body.profile);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkEvidence() {
    if (!selectedNodeId) return;
    setEvidenceError(null);
    const res = await fetch("/api/liguey/profile/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryNodeId: selectedNodeId, label: evidenceLabel.trim() || null }),
    });
    const body = await res.json();
    if (!res.ok) { setEvidenceError(body.error ?? "Could not link this item."); return; }
    setEvidence((prev) => [body.evidence, ...prev]);
    const node = libraryNodes.find((candidate) => candidate.id === selectedNodeId);
    if (node) setEvidenceNodes((prev) => ({ ...prev, [node.id]: { title: node.title, kind: node.kind } }));
    setSelectedNodeId("");
    setEvidenceLabel("");
  }

  async function handleRemoveEvidence(libraryNodeId: string) {
    const res = await fetch(`/api/liguey/profile/evidence?libraryNodeId=${libraryNodeId}`, { method: "DELETE" });
    if (res.ok) setEvidence((prev) => prev.filter((link) => link.library_node_id !== libraryNodeId));
  }

  const linkedNodeIds = new Set(evidence.map((link) => link.library_node_id));
  const availableNodes = libraryNodes.filter((node) => !linkedNodeIds.has(node.id));

  if (loading) {
    return <div className="mx-auto max-w-[760px] px-4 py-10 text-[11px]" style={{ color: KEBU.muted }}>Loading your profile…</div>;
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-4 sm:px-6">
      <header className="border-b pb-4" style={fieldStyle}>
        <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Kebu Liguey</p>
        <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Your worker profile</h1>
        <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>
          {profile?.verifiedAt ? `Verified ${new Date(profile.verifiedAt).toLocaleDateString()}` : "Self-reported — nothing here is verified yet."}
        </p>
      </header>

      {error ? <div className="mt-4 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{error}</div> : null}

      <section className="mt-6 space-y-4">
        <div>
          <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>Headline</label>
          <input disabled={saving} value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={160}
            placeholder="e.g. Wolof-French translator and community organizer"
            className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
        </div>

        <div>
          <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>About you</label>
          <textarea disabled={saving} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={4000} rows={4}
            placeholder="Tell employers about your background — formal or informal — in your own words."
            className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>Skills</label>
            <input disabled={saving} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Comma-separated, e.g. translation, bookkeeping"
              className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>Languages</label>
            <input disabled={saving} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Comma-separated, e.g. Wolof, French"
              className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>Location</label>
            <input disabled={saving} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, region"
              className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>Country code</label>
            <input disabled={saving} value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} maxLength={2} placeholder="SN"
              className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[12px] uppercase" style={fieldStyle} />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>Availability</label>
            <select disabled={saving} value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)}
              className="mt-1 w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle}>
              <option value="">Not set</option>
              <option value="open">Open to work</option>
              <option value="limited">Limited availability</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-[11px]"><input disabled={saving} type="checkbox" checked={remoteEligible} onChange={(e) => setRemoteEligible(e.target.checked)} />Open to remote work</label>
          <label className="flex items-center gap-2 text-[11px]"><input disabled={saving} type="checkbox" checked={isDiscoverable} onChange={(e) => setIsDiscoverable(e.target.checked)} />Discoverable by employers</label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>Experience</label>
            <button type="button" disabled={saving} onClick={addExperience} className="text-[9px] font-black uppercase" style={{ color: KEBU.orange }}>+ Add</button>
          </div>
          <p className="mt-1 text-[9px]" style={{ color: KEBU.faint }}>Formal jobs and informal/life experience are both welcome here.</p>
          <div className="mt-2 space-y-2">
            {experience.map((entry, index) => (
              <div key={index} className="rounded-[10px] border p-3" style={fieldStyle}>
                <div className="flex items-center gap-2">
                  <input disabled={saving} value={entry.title} onChange={(e) => updateExperience(index, { title: e.target.value })} maxLength={160}
                    placeholder="What did you do?" className="flex-1 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
                  <select disabled={saving} value={entry.kind} onChange={(e) => updateExperience(index, { kind: e.target.value as Experience["kind"] })}
                    className="rounded-[8px] border px-2 py-1.5 text-[10px]" style={fieldStyle}>
                    <option value="informal">Informal / life experience</option>
                    <option value="formal">Formal employment</option>
                  </select>
                  <button type="button" disabled={saving} onClick={() => removeExperience(index)} aria-label="Remove experience entry" className="text-[9px] font-black" style={{ color: KEBU.muted }}>✕</button>
                </div>
                <textarea disabled={saving} value={entry.description} onChange={(e) => updateExperience(index, { description: e.target.value })} maxLength={2000} rows={2}
                  placeholder="Describe it in your own words" className="mt-2 w-full rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
              </div>
            ))}
            {experience.length === 0 ? <p className="text-[10px]" style={{ color: KEBU.faint }}>No experience added yet.</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="button" disabled={saving} onClick={handleSave} className="rounded-full bg-black px-5 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save profile"}
          </button>
          {savedAt ? <span className="text-[9px]" style={{ color: KEBU.faint }}>Saved</span> : null}
        </div>
      </section>

      <section className="mt-10 border-t pt-6" style={fieldStyle}>
        <h2 className="text-[13px] font-black">Portfolio evidence</h2>
        <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>Link items from your Library to show your work.</p>

        {evidenceError ? <div className="mt-3 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{evidenceError}</div> : null}

        <div className="mt-3 space-y-2">
          {evidence.map((link) => (
            <div key={link.id} className="flex items-center gap-3 rounded-[10px] border px-3 py-2" style={fieldStyle}>
              <KebuIcon name="library" size={16} style={{ color: KEBU.faint }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold">{link.label || evidenceNodes[link.library_node_id]?.title || "Library item"}</p>
                <p className="truncate text-[9px]" style={{ color: KEBU.faint }}>{evidenceNodes[link.library_node_id]?.title}</p>
              </div>
              <button type="button" onClick={() => handleRemoveEvidence(link.library_node_id)} className="text-[9px] font-black" style={{ color: KEBU.muted }}>Remove</button>
            </div>
          ))}
          {evidence.length === 0 ? <p className="text-[10px]" style={{ color: KEBU.faint }}>No portfolio evidence linked yet.</p> : null}
        </div>

        {availableNodes.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)} className="rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle}>
              <option value="">Choose a Library item…</option>
              {availableNodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
            </select>
            <input value={evidenceLabel} onChange={(e) => setEvidenceLabel(e.target.value)} placeholder="Label (optional)" maxLength={160}
              className="rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
            <button type="button" disabled={!selectedNodeId} onClick={handleLinkEvidence} className="rounded-full border px-4 py-1.5 text-[10px] font-black disabled:opacity-40" style={fieldStyle}>Link</button>
          </div>
        ) : (
          <p className="mt-4 text-[10px]" style={{ color: KEBU.faint }}>
            {libraryNodes.length === 0 ? "You don't have any Library documents, sheets or links yet to use as evidence." : "All of your eligible Library items are already linked."}
          </p>
        )}
      </section>
    </div>
  );
}
