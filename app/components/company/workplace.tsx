"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CompanyState } from "@/lib/company/model";
import { formatPay, payMinor } from "@/lib/company/pay";
import {
  ActionForm,
  Field,
  TextArea,
  formText,
  type SaveCompanyAction,
} from "./action-form";
import { CompanyLearning } from "./learning-panel";
const tabs = [
  "Projects",
  "Onboarding",
  "Schedule",
  "HR",
  "Benefits",
  "Pay",
  "Team",
] as const;
export function CompanyWorkplace({ businessId }: { businessId: string }) {
  const [state, setState] = useState<CompanyState | null>(null),
    [error, setError] = useState<string | null>(null),
    [hint, setHint] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState<(typeof tabs)[number]>("Projects"),
    [projectId, setProjectId] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/businesses/${businessId}/workplace`, {
          cache: "no-store",
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setState(d);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load the company workplace.",
      );
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [businessId]);
  useEffect(() => {
    void load();
  }, [load]);
  const save: SaveCompanyAction = async (action, data, id) => {
    setHint(null);
    const r = await fetch(`/api/businesses/${businessId}/workplace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, ...data }),
      }),
      d = await r.json();
    if (!r.ok)
      throw Error(
        d.error || "Could not confirm this change. Your input is kept.",
      );
    setHint(
      typeof d.score === "number"
        ? `Answers saved. Score: ${d.score}%.`
        : "Saved.",
    );
    await load();
  };
  const name = (id: string) =>
    state?.members.find((m) => m.id === id)?.name ?? "Former team member";
  const members = (field = "userId") => (
    <label className="block">
      Team member
      <select
        required
        className="mt-1 block min-h-11 w-full rounded-lg border p-3"
        name={field}
      >
        {state?.members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {m.kebuId ?? m.role}
          </option>
        ))}
      </select>
    </label>
  );
  const manage = Boolean(
    state &&
    ["founder", "administrator", "manager", "store_manager"].includes(
      state.role,
    ),
  );
  const hr = Boolean(
      state && ["founder", "administrator"].includes(state.role),
    ),
    finance = Boolean(
      state &&
      ["founder", "administrator", "finance_manager"].includes(state.role),
    );
  const selected =
    state?.projects.find((p) => p.id === projectId) ?? state?.projects[0];
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="space-y-3 border-b pb-5">
        <div className="flex flex-wrap gap-4">
          <Link className="underline" href={`/business/${businessId}`}>
            Company overview
          </Link>
          <Link className="underline" href="/business/portfolio">
            My companies
          </Link>
          <Link className="underline" href="/app-store">
            Add Liguey
          </Link>
        </div>
        <h1 className="text-3xl font-semibold">Company workplace</h1>
        <p>Projects, people and the next steps that keep work moving.</p>
        <button
          className="min-h-11 underline"
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh workplace
        </button>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {hint && (
        <p role="status" className="rounded-lg bg-[#FFF1E9] p-4">
          {hint}
        </p>
      )}
      {loading ? (
        <p role="status">Loading workplace…</p>
      ) : (
        state && (
          <>
            <nav
              aria-label="Company workplace"
              className="flex flex-wrap gap-2"
            >
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-current={tab === t ? "page" : undefined}
                  className={`min-h-11 rounded-full border px-4 py-2 ${tab === t ? "bg-black text-white" : "bg-white"}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
            {state.limited && (
              <p role="status">
                This view shows up to 100 records per section. The company
                portfolio uses complete counts. Larger-list browsing remains to
                be added.
              </p>
            )}
            {tab === "Projects" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Company projects</h2>
                {manage && (
                  <details className="rounded-2xl border bg-white p-5">
                    <summary className="min-h-11 cursor-pointer font-semibold">
                      Create project
                    </summary>
                    <ActionForm
                      action="project_create"
                      label="Create project and team room"
                      save={save}
                      build={(f) => ({
                        title: formText(f, "title"),
                        description: formText(f, "description"),
                      })}
                    >
                      <Field label="Project name" name="title" />
                      <TextArea
                        label="Purpose and outcome"
                        name="description"
                      />
                    </ActionForm>
                  </details>
                )}
                {!state.projects.length && <p>No company projects yet.</p>}
                {selected && (
                  <>
                    <label className="block">
                      Project
                      <select
                        className="ml-2 min-h-11 rounded-lg border p-3"
                        value={selected.id}
                        onChange={(e) => setProjectId(e.target.value)}
                      >
                        {state.projects.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.title} · {p.status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <section className="space-y-4 rounded-2xl border bg-white p-5">
                      <h3 className="text-xl font-semibold">
                        {selected.title}
                      </h3>
                      <p className="whitespace-pre-wrap">
                        {selected.description}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <Link
                          className="underline"
                          href={`/rooms/${selected.room_id}`}
                        >
                          Team discussion and calls
                        </Link>
                        <Link
                          className="underline"
                          href={`/business/${businessId}/documents`}
                        >
                          Company documents
                        </Link>
                        <Link className="underline" href="/library">
                          Upload and manage files in Library
                        </Link>
                      </div>
                      {manage && (
                        <ActionForm
                          action="project_status"
                          label="Update project status"
                          save={save}
                          build={(f) => ({
                            projectId: selected.id,
                            expectedStatus: selected.status,
                            status: formText(f, "status"),
                          })}
                        >
                          <label>
                            Status
                            <select
                              name="status"
                              defaultValue={selected.status}
                              className="ml-2 min-h-11 rounded border p-2"
                            >
                              {["active", "blocked", "done", "archived"].map(
                                (s) => (
                                  <option key={s}>{s}</option>
                                ),
                              )}
                            </select>
                          </label>
                        </ActionForm>
                      )}
                    </section>
                    <section className="space-y-4 rounded-2xl border bg-white p-5">
                      <h3 className="text-xl font-semibold">Assignments</h3>
                      <p>
                        These are shared company tasks. Team members can update
                        completion; the assignee identifies who is responsible.
                      </p>
                      {state.tasks
                        .filter((t) => t.project_id === selected.id)
                        .map((t) => (
                          <article
                            className="space-y-2 border-b py-3"
                            key={t.id}
                          >
                            <h4 className="font-semibold">{t.title}</h4>
                            <p>
                              {name(t.assignee_user_id)} · {t.status}
                              {t.due_at
                                ? ` · Due ${new Date(t.due_at).toLocaleString()}`
                                : ""}
                            </p>
                            <p className="whitespace-pre-wrap">{t.body}</p>
                            <button
                              className="min-h-11 underline"
                              onClick={() =>
                                void save(
                                  "task_status",
                                  {
                                    taskId: t.id,
                                    status:
                                      t.status === "done" ? "open" : "done",
                                  },
                                  crypto.randomUUID(),
                                ).catch((e) => setError(e.message))
                              }
                            >
                              {t.status === "done" ? "Reopen" : "Mark done"}
                            </button>
                          </article>
                        ))}
                      {manage && (
                        <ActionForm
                          action="task_create"
                          label="Assign task"
                          save={save}
                          build={(f) => ({
                            projectId: selected.id,
                            title: formText(f, "title"),
                            body: formText(f, "body"),
                            userId: formText(f, "userId"),
                            dueAt: formText(f, "dueAt")
                              ? new Date(formText(f, "dueAt")).toISOString()
                              : null,
                          })}
                        >
                          <Field label="Task" name="title" />
                          <TextArea label="What needs to be done" name="body" />
                          {members()}
                          <Field
                            label="Due date (your local time)"
                            name="dueAt"
                            type="datetime-local"
                            required={false}
                          />
                        </ActionForm>
                      )}
                    </section>
                    <section className="space-y-4 rounded-2xl border bg-white p-5">
                      <h3 className="text-xl font-semibold">
                        Working documents and files
                      </h3>
                      <p>
                        Links keep the original document permissions. Share
                        Sheets/Slides in Library before colleagues can open
                        them.
                      </p>
                      {state.resources
                        .filter((r) => r.project_id === selected.id)
                        .map((r) => (
                          <p key={r.id}>
                            <Link
                              className="underline"
                              href={
                                r.kind === "doc"
                                  ? `/business/${businessId}/documents/${r.resource_id}`
                                  : `/${r.kind === "sheet" ? "sheets" : "slides"}/${r.resource_id}`
                              }
                            >
                              {r.label} · {r.kind}
                            </Link>
                          </p>
                        ))}
                      <ActionForm
                        action="doc_create"
                        label="Create shared project document"
                        save={save}
                        build={(f) => ({
                          projectId: selected.id,
                          title: formText(f, "title"),
                        })}
                      >
                        <Field label="Document title" name="title" />
                      </ActionForm>
                      <ActionForm
                        action="resource_attach"
                        label="Attach a working file"
                        save={save}
                        build={(f) => {
                          const [kind, resourceId] = formText(
                            f,
                            "resource",
                          ).split(":");
                          return {
                            projectId: selected.id,
                            kind,
                            resourceId,
                            label: formText(f, "label"),
                          };
                        }}
                      >
                        <label className="block">
                          Available document
                          <select
                            className="block min-h-11 w-full rounded-lg border p-3"
                            name="resource"
                            required
                          >
                            <option value="">Choose a document</option>
                            {state.availableResources?.map((r) => (
                              <option
                                key={`${r.kind}:${r.id}`}
                                value={`${r.kind}:${r.id}`}
                              >
                                {r.title} · {r.kind}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field label="Label for the team" name="label" />
                      </ActionForm>
                    </section>
                    <section className="space-y-4 rounded-2xl border bg-white p-5">
                      <h3 className="text-xl font-semibold">
                        Feedback and updates
                      </h3>
                      {state.feedback
                        .filter((f) => f.project_id === selected.id)
                        .map((f) => (
                          <article className="border-b py-3" key={f.id}>
                            <p className="text-sm">
                              {name(f.author_id)} ·{" "}
                              {new Date(f.created_at).toLocaleString()}
                            </p>
                            <p className="whitespace-pre-wrap">{f.message}</p>
                          </article>
                        ))}
                      <ActionForm
                        action="feedback_create"
                        label="Post feedback"
                        save={save}
                        build={(f) => ({
                          projectId: selected.id,
                          message: formText(f, "message"),
                        })}
                      >
                        <TextArea
                          label="Feedback or progress update"
                          name="message"
                        />
                      </ActionForm>
                    </section>
                  </>
                )}
              </div>
            )}
            {tab === "Onboarding" && (
              <CompanyLearning state={state} manage={manage} save={save} />
            )}
            {tab === "Schedule" && (
              <section className="space-y-5">
                <h2 className="text-2xl font-semibold">Work schedule</h2>
                <p>
                  Times are shown in{" "}
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}. Dates
                  entered here use your device’s time zone.
                </p>
                {state.shifts.length === 0 && <p>No shifts to show.</p>}
                {[...state.shifts]
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .map((s) => (
                    <article
                      className="rounded-xl border bg-white p-4"
                      key={s.id}
                    >
                      <p>
                        {name(s.user_id)} · {s.status}
                      </p>
                      <p>
                        {new Date(s.starts_at).toLocaleString()} –{" "}
                        {new Date(s.ends_at).toLocaleString()}
                      </p>
                      <p>{s.location}</p>
                      {manage && s.status === "scheduled" && (
                        <button
                          className="min-h-11 underline"
                          onClick={() =>
                            void save(
                              "shift_cancel",
                              { shiftId: s.id },
                              crypto.randomUUID(),
                            ).catch((e) => setError(e.message))
                          }
                        >
                          Cancel shift
                        </button>
                      )}
                    </article>
                  ))}
                {manage && (
                  <ActionForm
                    action="shift_create"
                    label="Schedule shift"
                    save={save}
                    build={(f) => ({
                      userId: formText(f, "userId"),
                      startsAt: new Date(formText(f, "startsAt")).toISOString(),
                      endsAt: new Date(formText(f, "endsAt")).toISOString(),
                      location: formText(f, "location"),
                    })}
                  >
                    {members()}
                    <Field
                      label="Starts (your local time)"
                      name="startsAt"
                      type="datetime-local"
                    />
                    <Field
                      label="Ends (your local time)"
                      name="endsAt"
                      type="datetime-local"
                    />
                    <Field
                      label="Work location"
                      name="location"
                      maxLength={300}
                    />
                  </ActionForm>
                )}
              </section>
            )}
            {tab === "HR" && (
              <section className="space-y-5">
                <h2 className="text-2xl font-semibold">Private HR requests</h2>
                <p>
                  Your request is visible to you and company
                  founders/administrators. It is not posted to your team.
                </p>
                <ActionForm
                  action="hr_create"
                  label="Send request to HR"
                  save={save}
                  build={(f) => ({
                    category: formText(f, "category"),
                    message: formText(f, "message"),
                  })}
                >
                  <label>
                    Request type
                    <select
                      className="ml-2 min-h-11 rounded border p-2"
                      name="category"
                    >
                      {[
                        "time_off",
                        "pay",
                        "benefits",
                        "workplace",
                        "other",
                      ].map((c) => (
                        <option key={c} value={c}>
                          {c.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextArea label="How can HR help?" name="message" />
                </ActionForm>
                {state.hr.map((h) => (
                  <article
                    className="space-y-3 rounded-xl border bg-white p-5"
                    key={h.id}
                  >
                    <p>
                      {name(h.user_id)} · {h.category} · {h.status}
                    </p>
                    <p className="whitespace-pre-wrap">{h.message}</p>
                    {h.response && (
                      <p className="whitespace-pre-wrap">
                        HR response: {h.response}
                      </p>
                    )}
                    {hr && (
                      <ActionForm
                        action="hr_reply"
                        label="Save HR response"
                        save={save}
                        build={(f) => ({
                          requestId: h.id,
                          expectedUpdatedAt: h.updated_at,
                          response: formText(f, "response"),
                          status: formText(f, "status"),
                        })}
                      >
                        <TextArea label="Response" name="response" />
                        <select
                          aria-label="Request status"
                          name="status"
                          className="min-h-11 rounded border p-2"
                        >
                          <option value="open">Open</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </ActionForm>
                    )}
                  </article>
                ))}
              </section>
            )}
            {tab === "Benefits" && (
              <section className="space-y-5">
                <h2 className="text-2xl font-semibold">Company benefits</h2>
                <p>
                  Benefits described here are provided by your employer. Ask HR
                  about eligibility and enrollment.
                </p>
                {!state.benefits.length && (
                  <p>Your company has not published benefits information.</p>
                )}
                {state.benefits.map((b) => (
                  <article
                    className="rounded-xl border bg-white p-5"
                    key={b.id}
                  >
                    <h3 className="text-xl font-semibold">{b.title}</h3>
                    <p className="whitespace-pre-wrap">{b.details}</p>
                  </article>
                ))}
                {manage && (
                  <ActionForm
                    action="benefit_create"
                    label="Publish benefit information"
                    save={save}
                    build={(f) => ({
                      title: formText(f, "title"),
                      details: formText(f, "details"),
                    })}
                  >
                    <Field label="Benefit name" name="title" />
                    <TextArea
                      label="Eligibility, enrollment and contact details"
                      name="details"
                      maxLength={8000}
                    />
                  </ActionForm>
                )}
              </section>
            )}
            {tab === "Pay" && (
              <section className="space-y-6">
                <h2 className="text-2xl font-semibold">Pay and statements</h2>
                <p>
                  These are employer-entered statements, not confirmation of a
                  transfer. Kebu does not calculate taxes or run payroll here.
                  Do not enter account numbers or bank credentials.
                </p>
                <p>
                  Your saved preference:{" "}
                  {state.preferences
                    .find((p) => p.user_id === state.userId)
                    ?.method.replaceAll("_", " ") ?? "Not selected"}
                </p>
                <ActionForm
                  action="pay_preference"
                  label="Save my pay preference"
                  save={save}
                  build={(f) => ({ method: formText(f, "method") })}
                >
                  <label>
                    Preferred method
                    <select
                      className="ml-2 min-h-11 rounded border p-2"
                      name="method"
                    >
                      <option value="bank">Bank transfer</option>
                      <option value="mobile_money">Mobile money</option>
                      <option value="cash">Cash</option>
                    </select>
                  </label>
                  <p>
                    Share actual payment details only through a verified
                    employer’s secure payroll setup. Saving this preference does
                    not connect an account or send money.
                  </p>
                </ActionForm>
                {state.statements.map((p) => (
                  <article
                    className="space-y-2 rounded-xl border bg-white p-5"
                    key={p.id}
                  >
                    <h3 className="font-semibold">
                      {name(p.user_id)} · {p.period_start}–{p.period_end}
                    </h3>
                    <dl>
                      <dt>Gross pay</dt>
                      <dd>{formatPay(p.gross_minor, p.currency)}</dd>
                      <dt>Deductions</dt>
                      <dd>{formatPay(p.deductions_minor, p.currency)}</dd>
                      <dt>Net pay</dt>
                      <dd>{formatPay(p.net_minor, p.currency)}</dd>
                    </dl>
                    <p className="whitespace-pre-wrap">{p.notes}</p>
                    <p className="text-sm">
                      Employer-entered record. Contact HR if this is incorrect.
                    </p>
                  </article>
                ))}
                {finance && (
                  <details className="rounded-xl border bg-white p-5">
                    <summary className="min-h-11 cursor-pointer font-semibold">
                      Record an employer pay statement
                    </summary>
                    <ActionForm
                      action="statement_create"
                      label="Save employer statement"
                      save={save}
                      build={(f) => {
                        const currency = formText(f, "currency").toUpperCase(),
                          grossMinor = payMinor(formText(f, "gross"), currency),
                          deductionsMinor = payMinor(
                            formText(f, "deductions"),
                            currency,
                          );
                        return {
                          userId: formText(f, "userId"),
                          periodStart: formText(f, "periodStart"),
                          periodEnd: formText(f, "periodEnd"),
                          currency,
                          grossMinor,
                          deductionsMinor,
                          netMinor: grossMinor - deductionsMinor,
                          notes: formText(f, "notes"),
                        };
                      }}
                    >
                      {members()}
                      <Field
                        label="Period starts"
                        name="periodStart"
                        type="date"
                      />
                      <Field label="Period ends" name="periodEnd" type="date" />
                      <Field
                        label="Currency code (for example XOF)"
                        name="currency"
                        maxLength={3}
                      />
                      <Field label="Gross pay" name="gross" />
                      <Field label="Deductions" name="deductions" />
                      <TextArea
                        label="Employer notes"
                        name="notes"
                        maxLength={2000}
                      />
                    </ActionForm>
                  </details>
                )}
              </section>
            )}
            {tab === "Team" && (
              <section className="space-y-5">
                <h2 className="text-2xl font-semibold">Team access</h2>
                <Link className="underline" href={`/business/${businessId}`}>
                  Manage team invitations in the company overview
                </Link>
                {state.members.map((m) => (
                  <article
                    className="rounded-xl border bg-white p-4"
                    key={m.id}
                  >
                    <h3 className="font-semibold">{m.name}</h3>
                    <p>
                      {m.kebuId ?? "Kebu account"} · {m.role}
                    </p>
                    {hr && m.id !== state.userId && m.role !== "founder" && (
                      <ActionForm
                        action="member_remove"
                        label="Remove company access"
                        save={save}
                        build={() => ({ userId: m.id })}
                      >
                        <label className="flex min-h-11 items-center gap-3">
                          <input type="checkbox" required />
                          Remove this person’s company access. Their personal
                          account remains theirs.
                        </label>
                      </ActionForm>
                    )}
                  </article>
                ))}
              </section>
            )}
          </>
        )
      )}
    </main>
  );
}
