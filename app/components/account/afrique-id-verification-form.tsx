"use client";

import { useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { HeritageNotes } from "@/app/api/me/afrique-id/route";

type Props = {
  identityType: "indigenous" | "visitor";
  onSubmit: (notes: HeritageNotes) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
};

const AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon",
  "Cape Verde", "Central African Republic", "Chad", "Comoros", "Congo (Brazzaville)",
  "Congo (DRC)", "Côte d'Ivoire", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea",
  "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau",
  "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania",
  "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda",
  "São Tomé & Príncipe", "Senegal", "Sierra Leone", "Somalia", "South Africa",
  "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe",
];

export function AfriqueIdVerificationForm({ identityType, onSubmit, onCancel, busy }: Props) {
  const isDiaspora = identityType === "visitor";

  const [heritageType, setHeritageType] = useState<"continental" | "diaspora">(
    isDiaspora ? "diaspora" : "continental",
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [region, setRegion] = useState("");
  const [ethnicGroup, setEthnicGroup] = useState("");
  const [lastName, setLastName] = useState("");
  const [parentsFrom, setParentsFrom] = useState("");
  const [grandparentsFrom, setGrandparentsFrom] = useState("");
  const [connectionNote, setConnectionNote] = useState("");

  const canSubmit = countryOfOrigin.trim().length > 0 && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const notes: HeritageNotes = {
      type: heritageType,
      countryOfOrigin: countryOfOrigin.trim(),
      region: region.trim() || undefined,
      ethnicGroup: ethnicGroup.trim() || undefined,
      lastName: lastName.trim() || undefined,
      parentsFrom: heritageType === "diaspora" ? parentsFrom.trim() || undefined : undefined,
      grandparentsFrom: heritageType === "diaspora" ? grandparentsFrom.trim() || undefined : undefined,
      connectionNote: connectionNote.trim() || undefined,
    };
    await onSubmit(notes);
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
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <p style={{ fontSize: "13px", color: KEBU.muted, lineHeight: 1.6 }}>
          Kebu verifies African identity to protect this space for African people and the diaspora.
          Tell us about your African heritage — this is reviewed by the Kebu team, not automated.
        </p>
      </div>

      {/* Heritage type — only show if they haven't committed to indigenous */}
      {isDiaspora && (
        <div>
          <p style={labelStyle}>Your connection to Africa</p>
          <div className="flex gap-2">
            {(["continental", "diaspora"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setHeritageType(t)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: heritageType === t ? "rgba(255,85,0,0.1)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${heritageType === t ? KEBU.orange : KEBU.border}`,
                  color: heritageType === t ? KEBU.orange : KEBU.muted,
                }}
              >
                {t === "continental" ? "I'm in Africa" : "I'm in the diaspora"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Country of origin */}
      <div>
        <label style={labelStyle} htmlFor="aid-country">
          {heritageType === "diaspora" ? "African country your family is from *" : "Your African country *"}
        </label>
        <select
          id="aid-country"
          required
          value={countryOfOrigin}
          onChange={e => setCountryOfOrigin(e.target.value)}
          style={{ ...inputStyle, appearance: "none" }}
        >
          <option value="">Select a country…</option>
          {AFRICAN_COUNTRIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Region / state */}
      <div>
        <label style={labelStyle} htmlFor="aid-region">
          State / region / province
        </label>
        <input
          id="aid-region"
          type="text"
          placeholder="e.g. Lagos State, Ashanti Region, Western Cape…"
          value={region}
          onChange={e => setRegion(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Ethnic group / tribe */}
      <div>
        <label style={labelStyle} htmlFor="aid-ethnic">
          Ethnic group or tribe
        </label>
        <input
          id="aid-ethnic"
          type="text"
          placeholder="e.g. Yoruba, Akan, Zulu, Amhara, Wolof…"
          value={ethnicGroup}
          onChange={e => setEthnicGroup(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Last name / surname */}
      <div>
        <label style={labelStyle} htmlFor="aid-lastname">
          Your last name (surname / family name)
        </label>
        <input
          id="aid-lastname"
          type="text"
          placeholder="Your surname as it appears on your ID"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Diaspora-specific questions */}
      {heritageType === "diaspora" && (
        <>
          <div>
            <label style={labelStyle} htmlFor="aid-parents">
              Where are your parents from?
            </label>
            <input
              id="aid-parents"
              type="text"
              placeholder="e.g. Nigeria (Edo State) / Jamaica (Igbo descent)…"
              value={parentsFrom}
              onChange={e => setParentsFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="aid-grandparents">
              Where are your grandparents from?
            </label>
            <input
              id="aid-grandparents"
              type="text"
              placeholder="e.g. Ghana (Fante) — paternal side…"
              value={grandparentsFrom}
              onChange={e => setGrandparentsFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
        </>
      )}

      {/* Optional connection note */}
      <div>
        <label style={labelStyle} htmlFor="aid-note">
          Anything else you want to tell us? (optional)
        </label>
        <textarea
          id="aid-note"
          rows={2}
          placeholder="Any additional context about your African identity or heritage…"
          value={connectionNote}
          onChange={e => setConnectionNote(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <p style={{ fontSize: "11px", color: KEBU.faint, lineHeight: 1.6 }}>
        This information is only used by the Kebu team to verify your African identity. It is not shown publicly.
        Verification can take 1–5 business days.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 py-3 rounded-full text-sm font-bold text-white disabled:opacity-50 transition-all"
          style={{ background: KEBU.orange }}
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-5 py-3 rounded-full text-sm font-semibold transition-all"
          style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
