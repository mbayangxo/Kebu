"use client";

import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Props = {
  businessId: string;
  verificationLevel: number;
  deliveryRadiusKm: number | null;
  crossBorderWilling: boolean;
  yearsOperating: number | null;
  supplyCapacity: string | null;
  onUpdated?: (patch: {
    deliveryRadiusKm: number | null;
    crossBorderWilling: boolean;
    yearsOperating: number | null;
    supplyCapacity: string | null;
    verificationLevel: number;
  }) => void;
};

/**
 * Kebu ID commerce fields — build-order item 3 of
 * docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md: delivery radius,
 * cross-border willingness, years operating, supply capacity. Filling in
 * any one of these (plus an active business and a linked AfriID) is what
 * moves a business from verification level 1 to level 2 — see
 * lib/kebu-id/verification-level.ts.
 */
export function BusinessCommerceFieldsEditor({
  businessId,
  verificationLevel,
  deliveryRadiusKm,
  crossBorderWilling,
  yearsOperating,
  supplyCapacity,
  onUpdated,
}: Props) {
  const [radius, setRadius] = useState(deliveryRadiusKm?.toString() ?? "");
  const [crossBorder, setCrossBorder] = useState(crossBorderWilling);
  const [years, setYears] = useState(yearsOperating?.toString() ?? "");
  const [capacity, setCapacity] = useState(supplyCapacity ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRadius(deliveryRadiusKm?.toString() ?? "");
    setCrossBorder(crossBorderWilling);
    setYears(yearsOperating?.toString() ?? "");
    setCapacity(supplyCapacity ?? "");
  }, [deliveryRadiusKm, crossBorderWilling, yearsOperating, supplyCapacity]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryRadiusKm: radius.trim() === "" ? null : Number(radius),
          crossBorderWilling: crossBorder,
          yearsOperating: years.trim() === "" ? null : Number(years),
          supplyCapacity: capacity.trim() === "" ? null : capacity.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save commerce details.");
        return;
      }
      setSaved(true);
      onUpdated?.({
        deliveryRadiusKm: data.business?.delivery_radius_km ?? null,
        crossBorderWilling: Boolean(data.business?.cross_border_willing),
        yearsOperating: data.business?.years_operating ?? null,
        supplyCapacity: data.business?.supply_capacity ?? null,
        verificationLevel: data.business?.verification_level ?? verificationLevel,
      });
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${KEBU.border}`,
    fontSize: "14px",
    color: KEBU.black,
    background: "#FAFAFA",
    outline: "none",
  } as const;
  const labelStyle = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: KEBU.muted,
    marginBottom: "6px",
  };

  return (
    <div className="space-y-4">
      {verificationLevel < 2 ? (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: "#FFF8F2", color: "#6B5B45" }}>
          Filling in one of these details helps your Kebu ID reach verification level 2, which unlocks your full
          product limit regardless of plan.
        </p>
      ) : null}

      <div>
        <p style={labelStyle}>Delivery radius (km)</p>
        <input
          type="number"
          min={0}
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          placeholder="e.g. 20"
          style={inputStyle}
        />
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ color: KEBU.black }}>
        <input type="checkbox" checked={crossBorder} onChange={(e) => setCrossBorder(e.target.checked)} />
        Willing to ship cross-border
      </label>

      <div>
        <p style={labelStyle}>Years operating</p>
        <input
          type="number"
          min={0}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="Brand-new is OK — leave blank"
          style={inputStyle}
        />
      </div>

      <div>
        <p style={labelStyle}>Supply capacity</p>
        <textarea
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="e.g. 200 units/month, 2 production lines"
          style={{ ...inputStyle, resize: "vertical" as const }}
        />
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
        style={{ background: KEBU.orange, color: KEBU.black }}
      >
        {saving ? "Saving…" : "Save commerce details"}
      </button>

      {saved ? (
        <p className="text-xs font-medium" style={{ color: "#009E40" }} role="status">
          Saved.
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
