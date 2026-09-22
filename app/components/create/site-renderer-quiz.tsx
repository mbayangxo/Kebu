"use client";

import { useState } from "react";
import { AnimatePresence, motion as fx } from "motion/react";
import { cssFontStack } from "@/lib/create/site-theme-fonts";
import { whatsAppOrderHref } from "@/lib/create/site-commerce";

export type QuizStepDef = { id: string; question: string; options: string[]; icon?: string };

/**
 * Real, working multi-step quiz: pick an answer per step, then hand the full set of answers to
 * WhatsApp as a pre-filled message. Progress bar + back navigation, step transitions animate only
 * when `motionExpressive` is set (theme.motion === "expressive").
 */
export function QuizSection({
  heading,
  subheading,
  ctaLabel,
  steps,
  whatsappPhone,
  whatsappIntro,
  fontDisplay,
  motionExpressive,
}: {
  heading: string;
  subheading: string;
  ctaLabel: string;
  steps: QuizStepDef[];
  whatsappPhone: string;
  whatsappIntro: string;
  fontDisplay: string;
  motionExpressive: boolean;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (steps.length === 0) return null;

  const total = steps.length;
  const isDone = stepIndex >= total;
  const current = !isDone ? steps[stepIndex] : null;

  function choose(option: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: option }));
    setStepIndex((i) => i + 1);
  }

  function reset() {
    setStepIndex(0);
    setAnswers({});
  }

  const message = [
    whatsappIntro,
    ...steps.map((s) => `${s.question} → ${answers[s.id] ?? "(skipped)"}`),
  ].join("\n");
  const waHref = whatsAppOrderHref(whatsappPhone, message);
  const progressPct = Math.round((Math.min(stepIndex, total) / total) * 100);

  const stepContent = isDone ? (
    <div className="text-center">
      <p className="text-lg font-bold">All done.</p>
      <p className="mt-2 text-sm opacity-70">Tap below to send your answers and get a real reply.</p>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block rounded-full px-6 py-3 text-sm font-bold text-white"
        style={{ background: "var(--kebu-accent)" }}
      >
        {ctaLabel}
      </a>
      <button
        type="button"
        onClick={reset}
        className="mt-4 block w-full text-center text-xs underline opacity-60"
      >
        Start over
      </button>
    </div>
  ) : current ? (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider opacity-50">
        Step {stepIndex + 1} of {total}
      </p>
      <p className="mt-2 text-xl font-bold" style={{ fontFamily: cssFontStack(fontDisplay) }}>
        {current.icon ? <span className="mr-2">{current.icon}</span> : null}
        {current.question}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {current.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => choose(opt)}
            className="rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-[var(--kebu-accent)] hover:bg-[var(--kebu-accent)] hover:text-white"
            style={{ borderColor: "rgba(0,0,0,0.15)" }}
          >
            {opt}
          </button>
        ))}
      </div>
      {stepIndex > 0 ? (
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className="mt-4 text-xs underline opacity-60"
        >
          ← Back
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <section className="kebu-section mx-auto max-w-xl px-5 py-16">
      {heading ? (
        <h2
          className="text-center text-2xl font-bold"
          style={{ fontFamily: cssFontStack(fontDisplay) }}
        >
          {heading}
        </h2>
      ) : null}
      {subheading ? <p className="mt-2 text-center text-sm opacity-70">{subheading}</p> : null}
      <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%`, background: "var(--kebu-accent)" }}
        />
      </div>
      <div className="mt-8 rounded-2xl border p-6" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
        {motionExpressive ? (
          <AnimatePresence mode="wait">
            <fx.div
              key={isDone ? "done" : current?.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {stepContent}
            </fx.div>
          </AnimatePresence>
        ) : (
          stepContent
        )}
      </div>
    </section>
  );
}
