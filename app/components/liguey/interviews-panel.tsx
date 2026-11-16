"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ActionForm,
  Field,
  TextArea,
  formText,
  type SaveCompanyAction,
} from "@/app/components/company/action-form";
type Interview = {
  id: string;
  business_id: string;
  application_id: string;
  candidate_id: string;
  interviewer_id: string;
  kind: "online" | "office";
  office_address: string;
  starts_at: string;
  ends_at: string;
  room_id: string | null;
  status: string;
  revision: number;
  currentReview: boolean;
};
type Application = {
  id: string;
  candidateId: string;
  listingId: string;
  status: string;
};
export function InterviewsPanel({
  businessId,
  applicationId,
}: {
  businessId?: string;
  applicationId?: string;
}) {
  const [rows, setRows] = useState<Interview[]>([]),
    [applications, setApplications] = useState<Application[]>([]),
    [userId, setUserId] = useState(""),
    [error, setError] = useState<string | null>(null),
    [hint, setHint] = useState<string | null>(null),
    [invite, setInvite] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(
          "/api/liguey/interviews" +
            (businessId ? `?businessId=${businessId}` : ""),
          { cache: "no-store" },
        ),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setRows(d.interviews);
      setApplications(d.applications);
      setUserId(d.userId);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Could not load interviews.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);
  useEffect(() => {
    void load();
  }, [load]);
  const save: SaveCompanyAction = async (action, data, id) => {
    setHint(null);
    const endpoint =
      action === "report"
        ? "/api/liguey/safety-reports"
        : "/api/liguey/interviews";
    const payload =
      action === "report" ? { id, ...data } : { action, id, ...data };
    const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setHint(
      action === "report"
        ? "Report saved for the Kebu team. This is not an emergency service."
        : "Interview updated.",
    );
    await load();
  };
  async function prepare(application: string) {
    setError(null);
    try {
      const r = await fetch("/api/liguey/hiring-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: application }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setInvite(d.acceptPath);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not prepare the invitation.",
      );
    }
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Link
        className="underline"
        href={businessId ? `/business/${businessId}/liguey` : "/liguey"}
      >
        Back to Liguey
      </Link>
      <h1 className="text-3xl font-semibold">Interviews</h1>
      <p>
        Check the employer and recruiter independently. A review is not a safety
        guarantee. Never pay to apply or interview, and do not provide bank
        credentials before hiring. You can decline or cancel an invitation.
      </p>
      <button className="min-h-11 underline" onClick={() => void load()}>
        Refresh interviews
      </button>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4">
          {error}
        </p>
      )}
      {hint && <p role="status">{hint}</p>}
      {invite && (
        <p role="status">
          Team invitation prepared; no email was sent. Share this link with the
          accepted applicant:{" "}
          <Link className="underline" href={invite}>
            {typeof window === "undefined"
              ? invite
              : window.location.origin + invite}
          </Link>
          . They must accept it before gaining access.
        </p>
      )}
      {businessId && (
        <section className="space-y-4 rounded-2xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Propose an interview</h2>
          <p>
            An office interview uses the address actually reviewed by Kebu. No
            home, hotel or unreviewed meeting address can be entered here.
          </p>
          {applications.length ? (
            <ActionForm
              action="propose"
              label="Send interview invitation"
              save={save}
              build={(f) => ({
                applicationId: formText(f, "applicationId"),
                kind: formText(f, "kind"),
                startsAt: new Date(formText(f, "start")).toISOString(),
                endsAt: new Date(formText(f, "end")).toISOString(),
              })}
            >
              <label className="block">
                Application
                <select
                  name="applicationId"
                  defaultValue={applicationId}
                  className="mt-1 block min-h-11 w-full rounded border p-3"
                >
                  {applications.map((a, i) => (
                    <option key={a.id} value={a.id}>
                      Application {i + 1} · {a.status}
                      {a.id === applicationId
                        ? " · selected from applicant review"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Interview type
                <select
                  name="kind"
                  className="ml-2 min-h-11 rounded border p-2"
                >
                  <option value="online">Online in a private Kebu room</option>
                  <option value="office">
                    In person at the reviewed office
                  </option>
                </select>
              </label>
              <Field
                label="Starts (your local time)"
                name="start"
                type="datetime-local"
              />
              <Field
                label="Ends (your local time)"
                name="end"
                type="datetime-local"
              />
            </ActionForm>
          ) : (
            <p>No active applications are available.</p>
          )}
        </section>
      )}
      {loading ? (
        <p role="status">Loading interviews…</p>
      ) : (
        !rows.length && <p>No interview invitations yet.</p>
      )}
      {rows.map((i) => (
        <article
          className="space-y-4 rounded-2xl border bg-white p-5"
          key={i.id}
        >
          <h2 className="text-xl font-semibold">
            {i.kind === "online" ? "Online interview" : "Office interview"} ·{" "}
            {i.status}
          </h2>
          <p>
            {new Date(i.starts_at).toLocaleString()} –{" "}
            {new Date(i.ends_at).toLocaleString()} (
            {Intl.DateTimeFormat().resolvedOptions().timeZone})
          </p>
          {i.kind === "office" && <p>Reviewed office: {i.office_address}</p>}
          {!i.currentReview && (
            <p role="alert" className="rounded-lg bg-red-50 p-3">
              The company, recruiter or application review has changed. Do not
              attend until Kebu resolves it.
            </p>
          )}
          {i.currentReview && i.status === "accepted" && i.room_id && (
            <Link
              className="inline-block min-h-11 underline"
              href={`/rooms/${i.room_id}`}
            >
              Open private interview room
            </Link>
          )}
          <div className="flex flex-wrap gap-3">
            {i.candidate_id === userId &&
              i.status === "proposed" &&
              i.currentReview &&
              ["accepted", "declined"].map((status) => (
                <button
                  className="min-h-11 rounded-full border px-4"
                  key={status}
                  onClick={() =>
                    void save(
                      "respond",
                      { revision: i.revision, status },
                      i.id,
                    ).catch((e) => setError(e.message))
                  }
                >
                  {status === "accepted"
                    ? "Accept invitation"
                    : "Decline invitation"}
                </button>
              ))}
            {["proposed", "accepted"].includes(i.status) && (
              <button
                className="min-h-11 rounded-full border px-4"
                onClick={() =>
                  void save(
                    "respond",
                    { revision: i.revision, status: "cancelled" },
                    i.id,
                  ).catch((e) => setError(e.message))
                }
              >
                Cancel interview
              </button>
            )}
          </div>
          <details>
            <summary className="min-h-11 cursor-pointer font-semibold">
              Report a safety concern
            </summary>
            <ActionForm
              action="report"
              label="Send safety report"
              save={save}
              build={(f) => ({
                businessId: i.business_id,
                message: formText(f, "message"),
              })}
            >
              <TextArea label="Describe the concern" name="message" />
            </ActionForm>
          </details>
        </article>
      ))}
      {businessId && applications.some((a) => a.status === "accepted") && (
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="text-xl font-semibold">
            Start onboarding after hiring
          </h2>
          <p>
            Prepare an employee invitation for an accepted applicant. This does
            not grant access or claim an employment contract was signed.
          </p>
          {applications
            .filter((a) => a.status === "accepted")
            .map((a, i) => (
              <button
                key={a.id}
                className="block min-h-11 underline"
                onClick={() => void prepare(a.id)}
              >
                Prepare team invitation for accepted application {i + 1}
              </button>
            ))}
          <Link
            className="underline"
            href={`/business/${businessId}/workplace`}
          >
            Manage onboarding and project assignments
          </Link>
        </section>
      )}
    </main>
  );
}
