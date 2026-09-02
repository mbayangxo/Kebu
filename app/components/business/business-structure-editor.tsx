"use client";

import { useCallback, useEffect, useState } from "react";
import { BusinessStructureGuide } from "@/app/components/business/business-structure-guide";
import type { LegalStructure } from "@/lib/kebu-id/countries/types";
import { KEBU } from "@/lib/kebu-brand";

type CountryModule = {
  countryCode: string;
  countryName: string;
  legalStructures: LegalStructure[];
};

export function BusinessStructureEditor({
  businessId,
  countryCode,
  currentStructure,
  canEdit,
  onUpdated,
}: {
  businessId: string;
  countryCode: string;
  currentStructure: string | null;
  canEdit: boolean;
  onUpdated?: (legalStructure: string) => void;
}) {
  const [module, setModule] = useState<CountryModule | null>(null);
  const [selected, setSelected] = useState(currentStructure ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelected(currentStructure ?? "");
  }, [currentStructure]);

  const loadModule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/country-modules?country=${countryCode}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load structures.");
        return;
      }
      setModule(data.module ?? null);
    } catch {
      setError("Network error loading business structures.");
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  useEffect(() => {
    void loadModule();
  }, [loadModule]);

  async function save() {
    if (!canEdit || saving || !selected || selected === currentStructure) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalStructure: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update structure.");
        return;
      }
      setSaved(true);
      onUpdated?.(selected);
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: KEBU.muted }}>Loading legal structures…</p>;
  }

  if (!module) {
    return (
      <p className="text-sm" style={{ color: KEBU.muted }}>
        {error ?? "No registration module for this country yet."}
      </p>
    );
  }

  const dirty = selected !== (currentStructure ?? "");

  return (
    <div className="space-y-4">
      {!canEdit ? (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: "#FFF8F2", color: "#6B5B45" }}>
          Structure is locked after government submission or verification upgrade. Contact support if you registered
          the wrong type by mistake.
        </p>
      ) : null}

      <BusinessStructureGuide
        structures={module.legalStructures}
        selectedCode={selected}
        onSelect={setSelected}
        disabled={!canEdit || saving}
        countryName={module.countryName}
      />

      {canEdit && dirty ? (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !selected}
          className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: KEBU.orange, color: KEBU.black }}
        >
          {saving ? "Saving…" : "Save structure on Kebu ID"}
        </button>
      ) : null}

      {saved ? (
        <p className="text-xs font-medium" style={{ color: "#009E40" }} role="status">
          Structure saved. Readiness score will refresh.
        </p>
      ) : null}
      {error ? (
        <p className="text-xs" style={{ color: "#8B1E1E" }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
