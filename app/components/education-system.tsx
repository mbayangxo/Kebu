"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { EDUCATION_MOMENTS, getRandomLesson, getRandomLessonForPage, type EducationMoment } from "@/lib/data/education-moments";

// ─── Context ─────────────────────────────────────────────────────────────────

interface EducationContextValue {
  showLesson: (id: string, onContinue?: () => void) => void;
  showRandom: (onContinue?: () => void) => void;
  showRandomForPage: (page: string, onContinue?: () => void) => void;
  withLesson: <T extends unknown[]>(id: string, fn: (...args: T) => void) => (...args: T) => void;
  withRandomLesson: <T extends unknown[]>(fn: (...args: T) => void) => (...args: T) => void;
}

const EducationContext = createContext<EducationContextValue | null>(null);

export function useEducation() {
  const ctx = useContext(EducationContext);
  if (!ctx) throw new Error("useEducation must be used inside EducationProvider");
  return ctx;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<EducationMoment["category"], string> = {
  legacy: "Our Legacy",
  taken: "What Was Taken",
  economic: "Economic Truth",
  confidence: "Your Power",
  winning: "Africans Winning",
};

const CATEGORY_COLORS: Record<EducationMoment["category"], string> = {
  legacy: "bg-deep-green/10 text-deep-green",
  taken: "bg-red-earth/15 text-red-earth",
  economic: "bg-gold/15 text-gold-dark",
  confidence: "bg-indigo/12 text-indigo",
  winning: "bg-light-green/15 text-mid-green",
};

function EducationModal({
  lesson,
  onClose,
  onContinue,
}: {
  lesson: EducationMoment;
  onClose: () => void;
  onContinue?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleContinue() {
    onClose();
    if (onContinue) onContinue();
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg bg-warm-ivory rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Pull handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Category badge */}
        <div className="px-6 pt-4 pb-0 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${CATEGORY_COLORS[lesson.category]}`}>
            {CATEGORY_LABELS[lesson.category]}
          </span>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pt-3 pb-2">
          {/* Hook */}
          <p className="font-display text-xl font-bold text-ink leading-snug mb-4">
            {lesson.hook}
          </p>

          {/* Body — first paragraph always visible, rest gated */}
          <div className="space-y-3">
            <p className="text-sm text-ink/80 leading-relaxed">{lesson.body[0]}</p>

            {!expanded && lesson.body.length > 1 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs font-semibold text-deep-green hover:text-gold transition-colors"
              >
                Keep reading ↓
              </button>
            )}

            {expanded && lesson.body.slice(1).map((para, i) => (
              <p key={i} className="text-sm text-ink/80 leading-relaxed">{para}</p>
            ))}
          </div>

          {/* Africans Today */}
          {(expanded || lesson.body.length === 1) && (
            <div className="mt-4 bg-deep-green/5 border border-deep-green/10 rounded-xl p-4">
              <p className="text-[10px] font-bold text-deep-green uppercase tracking-wider mb-1.5">
                Africans doing it today
              </p>
              <p className="text-xs text-ink/70 leading-relaxed">{lesson.africans_today}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0 bg-warm-ivory">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted hover:bg-border/30 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 py-2.5 rounded-xl bg-deep-green text-ivory text-sm font-bold hover:bg-deep-green/90 transition-colors"
          >
            {onContinue ? "Got it → Continue" : "Got it →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Learn FAB (positioned by FloatingActionStack in AppChrome) ───────────────

export function LearnFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Learn something about Africa"
      className="flex items-center gap-1.5 rounded-full bg-orange text-white text-xs font-bold px-4 py-2.5 shadow-lg hover:brightness-110 transition-all active:scale-95"
    >
      <span className="text-base leading-none" aria-hidden>
        📚
      </span>
      <span>Learn</span>
    </button>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EducationProvider({ children }: { children: React.ReactNode }) {
  const [activeLesson, setActiveLesson] = useState<EducationMoment | null>(null);
  const [pendingContinue, setPendingContinue] = useState<(() => void) | undefined>(undefined);

  const showLesson = useCallback((id: string, onContinue?: () => void) => {
    const lesson = EDUCATION_MOMENTS.find((m) => m.id === id);
    if (!lesson) return;
    setPendingContinue(() => onContinue);
    setActiveLesson(lesson);
  }, []);

  const showRandom = useCallback((onContinue?: () => void) => {
    setPendingContinue(() => onContinue);
    setActiveLesson(getRandomLesson());
  }, []);

  const showRandomForPage = useCallback((page: string, onContinue?: () => void) => {
    setPendingContinue(() => onContinue);
    setActiveLesson(getRandomLessonForPage(page));
  }, []);

  // Wrap a function: show a lesson first, then call the original fn when user hits "Continue"
  const withLesson = useCallback(
    <T extends unknown[]>(id: string, fn: (...args: T) => void) =>
      (...args: T) =>
        showLesson(id, () => fn(...args)),
    [showLesson]
  );

  const withRandomLesson = useCallback(
    <T extends unknown[]>(fn: (...args: T) => void) =>
      (...args: T) =>
        showRandom(() => fn(...args)),
    [showRandom]
  );

  function handleClose() {
    setActiveLesson(null);
    setPendingContinue(undefined);
  }

  return (
    <EducationContext.Provider value={{ showLesson, showRandom, showRandomForPage, withLesson, withRandomLesson }}>
      {children}

      {activeLesson && (
        <EducationModal
          lesson={activeLesson}
          onClose={handleClose}
          onContinue={pendingContinue}
        />
      )}
    </EducationContext.Provider>
  );
}
