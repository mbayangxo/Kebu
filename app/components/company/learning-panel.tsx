"use client";
import { useState } from "react";
import type { CompanyState } from "@/lib/company/model";
import {
  ActionForm,
  Field,
  TextArea,
  formText,
  type SaveCompanyAction,
} from "./action-form";
type Question = { prompt: string; options: string[]; correctIndex: number };
export function CompanyLearning({
  state,
  manage,
  save,
}: {
  state: CompanyState;
  manage: boolean;
  save: SaveCompanyAction;
}) {
  const [quiz, setQuiz] = useState<Question[]>([
    { prompt: "", options: ["", ""], correctIndex: 0 },
  ]);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Onboarding and learning</h2>
      <p>
        Complete the lessons assigned by your company. Results record your
        answers and acknowledgment; they do not make hiring or disciplinary
        decisions.
      </p>
      {state.lessons.length === 0 && <p>No lessons assigned to you yet.</p>}
      {state.lessons.map((lesson) => (
        <article
          className="space-y-4 rounded-2xl border bg-white p-5"
          key={lesson.id}
        >
          <h3 className="text-xl font-semibold">{lesson.title}</h3>
          <p className="whitespace-pre-wrap">{lesson.lesson}</p>
          <p>
            {lesson.passed ? "Passed" : "Not yet passed"} · Required score:{" "}
            {lesson.passPercent}%
          </p>
          <ActionForm
            action="module_answer"
            label="Submit answers"
            save={save}
            build={(f) => ({
              moduleId: lesson.id,
              answers: lesson.questions.map((_, i) =>
                Number(formText(f, `q${i}`)),
              ),
              acknowledged: f.has("acknowledged"),
            })}
          >
            {lesson.questions.map((q, i) => (
              <fieldset key={i} className="space-y-2">
                <legend className="font-semibold">
                  {i + 1}. {q.prompt}
                </legend>
                {q.options.map((option, j) => (
                  <label
                    key={j}
                    className="flex min-h-11 items-center gap-3 rounded-lg border p-3"
                  >
                    <input type="radio" name={`q${i}`} value={j} required />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" required name="acknowledged" />I reviewed
              this lesson myself.
            </label>
          </ActionForm>
        </article>
      ))}
      {manage && (
        <>
          <section className="space-y-4 rounded-2xl border bg-white p-5">
            <h3 className="text-xl font-semibold">
              Create an onboarding module
            </h3>
            <p>
              Include company culture, procedures or safety guidance. Published
              modules keep their original content; create a new module when
              guidance changes.
            </p>
            <ActionForm
              action="module_create"
              label="Create module"
              save={save}
              build={(f) => ({
                title: formText(f, "title"),
                lesson: formText(f, "lesson"),
                passPercent: Number(formText(f, "passPercent")),
                quiz,
              })}
            >
              <Field label="Module title" name="title" />
              <TextArea label="Lesson" name="lesson" maxLength={20000} />
              <label className="block">
                Required score (%)
                <input
                  className="ml-2 min-h-11 rounded border p-2"
                  type="number"
                  required
                  name="passPercent"
                  defaultValue={80}
                  min={1}
                  max={100}
                />
              </label>
              {quiz.map((q, i) => (
                <fieldset className="space-y-3 rounded-xl border p-4" key={i}>
                  <legend>Question {i + 1}</legend>
                  <label className="block">
                    Question
                    <input
                      className="block min-h-11 w-full rounded border p-2"
                      value={q.prompt}
                      required
                      maxLength={500}
                      onChange={(e) =>
                        setQuiz((old) =>
                          old.map((item, n) =>
                            n === i
                              ? { ...item, prompt: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  {q.options.map((option, j) => (
                    <div className="flex items-center gap-3" key={j}>
                      <label className="min-h-11 py-3">
                        <input
                          type="radio"
                          checked={q.correctIndex === j}
                          name={`correct-${i}`}
                          onChange={() =>
                            setQuiz((old) =>
                              old.map((item, n) =>
                                n === i ? { ...item, correctIndex: j } : item,
                              ),
                            )
                          }
                        />{" "}
                        Correct
                      </label>
                      <label className="flex-1">
                        Answer {j + 1}
                        <input
                          className="block min-h-11 w-full rounded border p-2"
                          value={option}
                          required
                          maxLength={300}
                          onChange={(e) =>
                            setQuiz((old) =>
                              old.map((item, n) =>
                                n === i
                                  ? {
                                      ...item,
                                      options: item.options.map((v, k) =>
                                        k === j ? e.target.value : v,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <button
                      className="min-h-11 underline"
                      type="button"
                      onClick={() =>
                        setQuiz((old) =>
                          old.map((item, n) =>
                            n === i
                              ? { ...item, options: [...item.options, ""] }
                              : item,
                          ),
                        )
                      }
                    >
                      Add an answer
                    </button>
                  )}
                </fieldset>
              ))}
              {quiz.length < 10 && (
                <button
                  className="min-h-11 underline"
                  type="button"
                  onClick={() =>
                    setQuiz((old) => [
                      ...old,
                      { prompt: "", options: ["", ""], correctIndex: 0 },
                    ])
                  }
                >
                  Add a question
                </button>
              )}
            </ActionForm>
          </section>
          <section className="space-y-4 rounded-2xl border bg-white p-5">
            <h3 className="text-xl font-semibold">Assign a module</h3>
            {!state.modules.length ? (
              <p>Create a module first.</p>
            ) : (
              <ActionForm
                action="module_assign"
                label="Assign module"
                save={save}
                build={(f) => ({
                  moduleId: formText(f, "moduleId"),
                  userId: formText(f, "userId"),
                })}
              >
                <label className="block">
                  Module
                  <select
                    name="moduleId"
                    className="ml-2 min-h-11 rounded border p-2"
                  >
                    {state.modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Team member
                  <select
                    name="userId"
                    className="ml-2 min-h-11 rounded border p-2"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.kebuId ?? m.role}
                      </option>
                    ))}
                  </select>
                </label>
              </ActionForm>
            )}
            <ul className="space-y-2">
              {state.assignments.map((a) => (
                <li key={`${a.module_id}:${a.user_id}`}>
                  {state.members.find((m) => m.id === a.user_id)?.name ??
                    "Former team member"}{" "}
                  ·{" "}
                  {state.modules.find((m) => m.id === a.module_id)?.title ??
                    "Module"}{" "}
                  ·{" "}
                  {state.attempts.some(
                    (t) =>
                      t.module_id === a.module_id &&
                      t.user_id === a.user_id &&
                      t.passed,
                  )
                    ? "Passed"
                    : "Awaiting a passing result"}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
