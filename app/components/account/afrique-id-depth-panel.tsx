"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type FinancialStatus = "banked" | "mobile_money_only" | "unbanked" | null;

const FINANCIAL_STATUS_LABEL: Record<Exclude<FinancialStatus, null>, string> = {
  banked: "Banked",
  mobile_money_only: "Mobile money only",
  unbanked: "Fully unbanked",
};

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

/**
 * AfriID profile depth (build-order item 4) + optional sensitive fields
 * with explicit per-field consent (item 5), per
 * docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md. Self-reported profile
 * data, not a verification claim — no admin review here, unlike the
 * heritage/verification request flow in AfriqueIdVerificationForm.
 */
export function AfriqueIdDepthPanel() {
  const [birthCountryCode, setBirthCountryCode] = useState("");
  const [occupation, setOccupation] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [financialStatus, setFinancialStatus] = useState<FinancialStatus>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sensitiveOpen, setSensitiveOpen] = useState(false);
  const [nextOfKinConsent, setNextOfKinConsent] = useState(false);
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");
  const [nextOfKinContact, setNextOfKinContact] = useState("");
  const [landConsent, setLandConsent] = useState(false);
  const [landDescription, setLandDescription] = useState("");
  const [landLocation, setLandLocation] = useState("");
  const [sensitiveSaving, setSensitiveSaving] = useState(false);
  const [sensitiveSaved, setSensitiveSaved] = useState(false);
  const [sensitiveError, setSensitiveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, sensitiveRes] = await Promise.all([
        fetch("/api/me/afrique-id/profile", { credentials: "include" }),
        fetch("/api/me/afrique-id/sensitive", { credentials: "include" }),
      ]);
      const profileData = await profileRes.json().catch(() => ({}));
      if (profileRes.ok && profileData.profile) {
        setBirthCountryCode(profileData.profile.birthCountryCode ?? "");
        setOccupation(profileData.profile.occupation ?? "");
        setSkillsText((profileData.profile.skills ?? []).join(", "));
        setFinancialStatus(profileData.profile.financialStatus ?? null);
      }
      const sensitiveData = await sensitiveRes.json().catch(() => ({}));
      if (sensitiveRes.ok) {
        if (sensitiveData.nextOfKin) {
          setNextOfKinName(sensitiveData.nextOfKin.name ?? "");
          setNextOfKinRelationship(sensitiveData.nextOfKin.relationship ?? "");
          setNextOfKinContact(sensitiveData.nextOfKin.contact ?? "");
        }
        if (sensitiveData.landDeclaration) {
          setLandDescription(sensitiveData.landDeclaration.description ?? "");
          setLandLocation(sensitiveData.landDeclaration.location ?? "");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const skills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const res = await fetch("/api/me/afrique-id/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthCountryCode: birthCountryCode.trim() === "" ? null : birthCountryCode.trim(),
          occupation: occupation.trim() === "" ? null : occupation.trim(),
          skills,
          financialStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save profile.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSensitive() {
    if (!nextOfKinConsent && !landConsent) {
      setSensitiveError("Check a consent box for at least one field before saving.");
      return;
    }
    setSensitiveSaving(true);
    setSensitiveError(null);
    setSensitiveSaved(false);
    try {
      const body: Record<string, unknown> = { consent: {} };
      const consent = body.consent as Record<string, boolean>;
      if (nextOfKinConsent && nextOfKinName.trim() && nextOfKinRelationship.trim()) {
        body.nextOfKin = {
          name: nextOfKinName.trim(),
          relationship: nextOfKinRelationship.trim(),
          contact: nextOfKinContact.trim() || undefined,
        };
        consent.nextOfKin = true;
      }
      if (landConsent && landDescription.trim()) {
        body.landDeclaration = { description: landDescription.trim(), location: landLocation.trim() || undefined };
        consent.landDeclaration = true;
      }
      const res = await fetch("/api/me/afrique-id/sensitive", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSensitiveError(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      setSensitiveSaved(true);
    } catch {
      setSensitiveError("Network error while saving.");
    } finally {
      setSensitiveSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm" style={{ color: KEBU.muted }}>
        Loading profile…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider">Deepen your profile</h3>
        <p className="mb-3 text-[10px]" style={{ color: KEBU.faint }}>
          Optional. Not used for Kebu Score or credit decisions.
        </p>

        <div className="space-y-3">
          <div>
            <p style={labelStyle}>Country of birth</p>
            <input
              type="text"
              value={birthCountryCode}
              onChange={(e) => setBirthCountryCode(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="2-letter code, e.g. SN"
              maxLength={2}
              style={inputStyle}
            />
          </div>
          <div>
            <p style={labelStyle}>Occupation</p>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              maxLength={160}
              style={inputStyle}
            />
          </div>
          <div>
            <p style={labelStyle}>Skills</p>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Comma-separated, e.g. tailoring, logistics"
              style={inputStyle}
            />
          </div>
          <div>
            <p style={labelStyle}>Financial status</p>
            <select
              value={financialStatus ?? ""}
              onChange={(e) => setFinancialStatus((e.target.value || null) as FinancialStatus)}
              style={inputStyle}
            >
              <option value="">Prefer not to say</option>
              {Object.entries(FINANCIAL_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: KEBU.orange, color: KEBU.black }}
          >
            {saving ? "Saving…" : "Save profile"}
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
      </div>

      <div className="rounded-2xl p-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
        <button
          type="button"
          onClick={() => setSensitiveOpen((v) => !v)}
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: KEBU.black }}
        >
          {sensitiveOpen ? "▾" : "▸"} Optional: next of kin & land declaration
        </button>
        {sensitiveOpen ? (
          <div className="mt-3 space-y-4">
            <p className="text-[10px]" style={{ color: KEBU.faint }}>
              Both are fully optional, never public, and never used for Kebu Score or credit decisions. Nothing is
              saved unless you check its own consent box below.
            </p>

            <div className="space-y-2 border-t pt-3" style={{ borderColor: KEBU.border }}>
              <label className="flex items-center gap-2 text-xs font-medium" style={{ color: KEBU.black }}>
                <input type="checkbox" checked={nextOfKinConsent} onChange={(e) => setNextOfKinConsent(e.target.checked)} />
                I consent to sharing next-of-kin information
              </label>
              {nextOfKinConsent ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nextOfKinName}
                    onChange={(e) => setNextOfKinName(e.target.value)}
                    placeholder="Full name"
                    maxLength={160}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={nextOfKinRelationship}
                    onChange={(e) => setNextOfKinRelationship(e.target.value)}
                    placeholder="Relationship"
                    maxLength={80}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={nextOfKinContact}
                    onChange={(e) => setNextOfKinContact(e.target.value)}
                    placeholder="Contact (optional)"
                    maxLength={160}
                    style={inputStyle}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2 border-t pt-3" style={{ borderColor: KEBU.border }}>
              <label className="flex items-center gap-2 text-xs font-medium" style={{ color: KEBU.black }}>
                <input type="checkbox" checked={landConsent} onChange={(e) => setLandConsent(e.target.checked)} />
                I consent to sharing a land/property declaration (not a Property Passport)
              </label>
              {landConsent ? (
                <div className="space-y-2">
                  <textarea
                    value={landDescription}
                    onChange={(e) => setLandDescription(e.target.value)}
                    placeholder="Description"
                    maxLength={500}
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical" as const }}
                  />
                  <input
                    type="text"
                    value={landLocation}
                    onChange={(e) => setLandLocation(e.target.value)}
                    placeholder="Location (optional)"
                    maxLength={200}
                    style={inputStyle}
                  />
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void saveSensitive()}
              disabled={sensitiveSaving || (!nextOfKinConsent && !landConsent)}
              className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ background: KEBU.orange, color: KEBU.black }}
            >
              {sensitiveSaving ? "Saving…" : "Save"}
            </button>
            {sensitiveSaved ? (
              <p className="text-xs font-medium" style={{ color: "#009E40" }} role="status">
                Saved.
              </p>
            ) : null}
            {sensitiveError ? (
              <p className="text-xs" style={{ color: "#8B1E1E" }} role="alert">
                {sensitiveError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
