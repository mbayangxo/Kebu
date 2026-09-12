"use client";

import { useState, useEffect, useCallback } from "react";

type FlowTrigger = "subscribe" | "order_placed" | "cart_abandoned";

type Flow = {
  id: string;
  name: string;
  trigger_type: FlowTrigger;
  status: "draft" | "active" | "paused";
  from_email: string;
  from_name: string;
  reply_to: string | null;
  step_count: number;
  created_at: string;
};

type Step = {
  id: string;
  flow_id: string;
  sort_order: number;
  delay_hours: number;
  subject: string;
  body_html: string;
  body_text: string;
};

const TRIGGER_LABELS: Record<FlowTrigger, string> = {
  subscribe: "Newsletter signup",
  order_placed: "Order placed",
  cart_abandoned: "Abandoned cart",
};

const TRIGGER_ICONS: Record<FlowTrigger, string> = {
  subscribe: "✉",
  order_placed: "✓",
  cart_abandoned: "⟳",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10B981",
  draft: "#9CA3AF",
  paused: "#F59E0B",
};

function delayLabel(hours: number): string {
  if (hours === 0) return "Immediately";
  if (hours < 24) return `After ${hours}h`;
  const d = Math.round(hours / 24);
  return `After ${d} day${d !== 1 ? "s" : ""}`;
}

function StepCard({
  step,
  index,
  projectId,
  flowId,
  onUpdated,
  onDeleted,
}: {
  step: Step;
  index: number;
  projectId: string;
  flowId: string;
  onUpdated: (s: Step) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [delayHours, setDelayHours] = useState(String(step.delay_hours));
  const [subject, setSubject] = useState(step.subject);
  const [bodyHtml, setBodyHtml] = useState(step.body_html);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/flows/${flowId}/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delay_hours: Math.max(0, parseInt(delayHours, 10) || 0),
        subject,
        body_html: bodyHtml,
      }),
    });
    const data = await res.json().catch(() => ({})) as { step?: Step; error?: string };
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Save failed."); return; }
    if (data.step) onUpdated(data.step);
    setEditing(false);
  }

  async function del() {
    if (!confirm("Delete this email step?")) return;
    const res = await fetch(`/api/projects/${projectId}/flows/${flowId}/steps/${step.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(step.id);
  }

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        background: "#FAFAFA",
        marginBottom: 8,
      }}
    >
      {/* Step header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        style={{ userSelect: "none" }}
      >
        <span
          style={{
            background: "#6366F1",
            color: "#fff",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            padding: "1px 7px",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-[12px] font-semibold" style={{ color: "#1A1A1A", margin: 0 }}>
            {step.subject || "(No subject)"}
          </p>
          <p className="text-[10px]" style={{ color: "#9CA3AF", margin: 0 }}>
            {delayLabel(step.delay_hours)}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); del(); }}
          style={{ color: "#DC2626", fontSize: 14, background: "none", border: 0, cursor: "pointer", padding: "2px 4px" }}
          aria-label="Delete step"
        >
          ×
        </button>
        <span style={{ color: "#C0C0C0", fontSize: 11 }}>{expanded ? "▾" : "▸"}</span>
      </div>

      {/* Expanded step editor */}
      {expanded ? (
        <div style={{ padding: "0 12px 12px" }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C" }}>
                Delay after previous step
                <input
                  type="number"
                  min={0}
                  max={8760}
                  value={delayHours}
                  onChange={(e) => setDelayHours(e.target.value)}
                  style={inputStyle}
                />
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>hours (0 = immediate, 24 = 1 day)</span>
              </label>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C" }}>
                Subject
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="Welcome to {{name}}!"
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C" }}>
                Email body (HTML)
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={8}
                  placeholder={"<p>Hi {{name}},</p>\n<p>Thanks for signing up!</p>"}
                  style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11, resize: "vertical" }}
                />
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                  Tokens: {"{{name}} {{order_total}} {{product_name}} {{cart_total}}"}
                </span>
              </label>
              {error ? <p style={{ color: "#DC2626", fontSize: 11, margin: 0 }}>{error}</p> : null}
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={save} disabled={saving} style={primaryBtnStyle}>
                  {saving ? "Saving…" : "Save step"}
                </button>
                <button type="button" onClick={() => setEditing(false)} style={ghostBtnStyle}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 6px" }}>
                <strong>Delay:</strong> {delayLabel(step.delay_hours)}&nbsp;&nbsp;
                <strong>Subject:</strong> {step.subject || "(none)"}
              </p>
              {step.body_html ? (
                <pre
                  style={{
                    fontSize: 10,
                    background: "#F3F4F6",
                    borderRadius: 6,
                    padding: "6px 8px",
                    overflowX: "auto",
                    maxHeight: 120,
                    margin: "0 0 8px",
                    color: "#374151",
                  }}
                >
                  {step.body_html.slice(0, 400)}{step.body_html.length > 400 ? "…" : ""}
                </pre>
              ) : (
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 8px" }}>(No HTML body)</p>
              )}
              <button type="button" onClick={() => setEditing(true)} style={ghostBtnStyle}>
                Edit step
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FlowDetail({
  flow,
  projectId,
  onBack,
  onFlowUpdated,
}: {
  flow: Flow;
  projectId: string;
  onBack: () => void;
  onFlowUpdated: (f: Flow) => void;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(true);
  const [addingStep, setAddingStep] = useState(false);
  const [newDelay, setNewDelay] = useState("0");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSender, setEditingSender] = useState(false);
  const [fromEmail, setFromEmail] = useState(flow.from_email);
  const [fromName, setFromName] = useState(flow.from_name);
  const [savingSender, setSavingSender] = useState(false);

  useEffect(() => {
    setLoadingSteps(true);
    fetch(`/api/projects/${projectId}/flows/${flow.id}/steps`)
      .then((r) => r.json())
      .then((d: { steps?: Step[] }) => setSteps(d.steps ?? []))
      .catch(() => {})
      .finally(() => setLoadingSteps(false));
  }, [projectId, flow.id]);

  async function toggleStatus() {
    const next = flow.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/projects/${projectId}/flows/${flow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const d = await res.json().catch(() => ({})) as { flow?: Flow };
    if (d.flow) onFlowUpdated(d.flow);
  }

  async function addStep() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/flows/${flow.id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delay_hours: Math.max(0, parseInt(newDelay, 10) || 0),
        subject: newSubject,
        body_html: newBody,
      }),
    });
    const d = await res.json().catch(() => ({})) as { step?: Step; error?: string };
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "Could not add step."); return; }
    if (d.step) {
      setSteps((prev) => [...prev, d.step!]);
      onFlowUpdated({ ...flow, step_count: flow.step_count + 1 });
    }
    setNewDelay("0");
    setNewSubject("");
    setNewBody("");
    setAddingStep(false);
  }

  async function saveSender() {
    setSavingSender(true);
    const res = await fetch(`/api/projects/${projectId}/flows/${flow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_email: fromEmail, from_name: fromName }),
    });
    const d = await res.json().catch(() => ({})) as { flow?: Flow };
    setSavingSender(false);
    if (d.flow) { onFlowUpdated(d.flow); setEditingSender(false); }
  }

  const isActive = flow.status === "active";

  return (
    <div>
      {/* Back + title */}
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} style={{ color: "#6366F1", background: "none", border: 0, cursor: "pointer", fontSize: 12 }}>
          ← Flows
        </button>
        <span style={{ color: "#D1D5DB", fontSize: 12 }}>|</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1A1A" }}>{flow.name}</span>
      </div>

      {/* Status banner */}
      <div
        style={{
          background: isActive ? "#ECFDF5" : "#F9FAFB",
          border: `1px solid ${isActive ? "#A7F3D0" : "#E5E7EB"}`,
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[flow.status] ?? "#9CA3AF", flexShrink: 0 }}>
          {flow.status.toUpperCase()}
        </span>
        <span style={{ fontSize: 11, color: "#6B7280", flex: 1 }}>
          Trigger: {TRIGGER_LABELS[flow.trigger_type]} · {flow.step_count} step{flow.step_count !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={toggleStatus}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 999,
            border: 0,
            cursor: "pointer",
            background: isActive ? "#FEE2E2" : "#6366F1",
            color: isActive ? "#DC2626" : "#fff",
          }}
        >
          {isActive ? "Pause" : "Activate"}
        </button>
      </div>

      {/* Sender settings */}
      <div style={{ marginBottom: 14 }}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>Sender</span>
          <button type="button" onClick={() => setEditingSender((v) => !v)} style={{ fontSize: 11, color: "#6366F1", background: "none", border: 0, cursor: "pointer" }}>
            {editingSender ? "Cancel" : "Edit"}
          </button>
        </div>
        {editingSender ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type="email"
              placeholder="from@yourbrand.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Your Brand Name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              style={inputStyle}
            />
            <button type="button" onClick={saveSender} disabled={savingSender} style={primaryBtnStyle}>
              {savingSender ? "Saving…" : "Save sender"}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
            {flow.from_email || <span style={{ color: "#EF4444" }}>No from email set — required to activate</span>}
            {flow.from_name ? ` (${flow.from_name})` : ""}
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
          Steps ({steps.length})
        </span>
      </div>

      {loadingSteps ? (
        <p style={{ fontSize: 11, color: "#9CA3AF" }}>Loading steps…</p>
      ) : steps.length === 0 ? (
        <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>
          No steps yet. Add the first email below.
        </p>
      ) : (
        steps.map((s, i) => (
          <StepCard
            key={s.id}
            step={s}
            index={i}
            projectId={projectId}
            flowId={flow.id}
            onUpdated={(updated) => setSteps((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
            onDeleted={(id) => {
              setSteps((prev) => prev.filter((x) => x.id !== id));
              onFlowUpdated({ ...flow, step_count: Math.max(0, flow.step_count - 1) });
            }}
          />
        ))
      )}

      {/* Add step */}
      {addingStep ? (
        <div
          style={{
            border: "1.5px dashed #C7D2FE",
            borderRadius: 10,
            padding: "10px 12px",
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", margin: 0 }}>
            Step {steps.length + 1}
          </p>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C" }}>
            Wait (hours before sending)
            <input
              type="number"
              min={0}
              max={8760}
              value={newDelay}
              onChange={(e) => setNewDelay(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C" }}>
            Subject line
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              maxLength={200}
              placeholder="Welcome, {{name}}!"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C" }}>
            Email body (HTML)
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={6}
              placeholder={"<p>Hi {{name}},</p>\n<p>Thanks for joining us!</p>"}
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11, resize: "vertical" }}
            />
          </label>
          {error ? <p style={{ color: "#DC2626", fontSize: 11, margin: 0 }}>{error}</p> : null}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={addStep} disabled={saving || !newSubject.trim()} style={primaryBtnStyle}>
              {saving ? "Adding…" : "Add step"}
            </button>
            <button type="button" onClick={() => setAddingStep(false)} style={ghostBtnStyle}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingStep(true)}
          style={{
            marginTop: 6,
            width: "100%",
            padding: "8px",
            borderRadius: 8,
            border: "1.5px dashed #C7D2FE",
            background: "transparent",
            color: "#6366F1",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add email step
        </button>
      )}
    </div>
  );
}

/** Email automation flows panel — shown in project settings / marketing tab. */
export function EmailFlowsPanel({ projectId }: { projectId: string }) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState<FlowTrigger>("subscribe");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFlows = useCallback(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/flows`)
      .then((r) => r.json())
      .then((d: { flows?: Flow[] }) => setFlows(d.flows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { loadFlows(); }, [loadFlows]);

  async function createFlow() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/flows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), trigger_type: newTrigger }),
    });
    const d = await res.json().catch(() => ({})) as { flow?: Flow; error?: string };
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "Could not create flow."); return; }
    if (d.flow) {
      setFlows((prev) => [d.flow!, ...prev]);
      setSelectedFlow(d.flow!);
    }
    setNewName("");
    setCreating(false);
  }

  if (selectedFlow) {
    return (
      <FlowDetail
        flow={selectedFlow}
        projectId={projectId}
        onBack={() => setSelectedFlow(null)}
        onFlowUpdated={(updated) => {
          setFlows((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
          setSelectedFlow((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>Email Flows</p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
            Triggered sequences — welcome, post-purchase, abandoned cart
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={primaryBtnStyle}
        >
          + New flow
        </button>
      </div>

      {creating ? (
        <div
          style={{
            border: "1.5px solid #C7D2FE",
            borderRadius: 10,
            padding: "12px",
            marginBottom: 12,
            background: "#F5F3FF",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "#6366F1", margin: "0 0 10px" }}>New flow</p>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C" }}>
            Flow name
            <input
              type="text"
              placeholder="Welcome series"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={120}
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#5C5C5C", display: "block", marginTop: 8 }}>
            Trigger
            <select
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value as FlowTrigger)}
              style={inputStyle}
            >
              <option value="subscribe">Newsletter signup</option>
              <option value="order_placed">Order placed</option>
              <option value="cart_abandoned">Abandoned cart</option>
            </select>
          </label>
          {error ? <p style={{ color: "#DC2626", fontSize: 11, margin: "6px 0 0" }}>{error}</p> : null}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button type="button" onClick={createFlow} disabled={saving || !newName.trim()} style={primaryBtnStyle}>
              {saving ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={() => setCreating(false)} style={ghostBtnStyle}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p style={{ fontSize: 11, color: "#9CA3AF" }}>Loading flows…</p>
      ) : flows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 16px",
            border: "1.5px dashed #E5E7EB",
            borderRadius: 10,
          }}
        >
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 4px" }}>No flows yet</p>
          <p style={{ fontSize: 11, color: "#D1D5DB", margin: 0 }}>
            Create a welcome flow and it will automatically send when someone subscribes.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              onClick={() => setSelectedFlow(flow)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #E5E7EB",
                background: "#fff",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#EEF2FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {TRIGGER_ICONS[flow.trigger_type]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1A1A1A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {flow.name}
                </p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0 }}>
                  {TRIGGER_LABELS[flow.trigger_type]} · {flow.step_count} step{flow.step_count !== 1 ? "s" : ""}
                </p>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: STATUS_COLORS[flow.status] ?? "#9CA3AF",
                  flexShrink: 0,
                }}
              >
                {flow.status}
              </span>
              <span style={{ color: "#C0C0C0", fontSize: 11, flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "6px 10px",
  borderRadius: 7,
  border: "1px solid #E5E7EB",
  fontSize: 12,
  background: "#fff",
  color: "#1A1A1A",
  outline: "none",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "#6366F1",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  padding: "6px 14px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#6B7280",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: "6px 14px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};
