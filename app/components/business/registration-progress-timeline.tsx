import { REGISTRATION_STEP_AUTOMATION, stepBlockedLabel } from "@/lib/kebu-id/registration-progress-meta";
import { KEBU } from "@/lib/kebu-brand";

type ProgressStep = {
  step_key: string;
  label: string;
  sort_order: number;
  is_complete: boolean;
  completed_at: string | null;
};

function stepIcon(step: ProgressStep, inProgressKey: string | null, blocked: boolean): string {
  if (step.is_complete) return "✓";
  if (blocked) return "—";
  if (step.step_key === inProgressKey) return "⏳";
  return "⬜";
}

function stepStyles(step: ProgressStep, inProgressKey: string | null, blocked: boolean) {
  if (step.is_complete) {
    return { background: KEBU.orange, color: KEBU.black, labelColor: KEBU.black };
  }
  if (blocked) {
    return { background: "#E8E6DF", color: KEBU.faint, labelColor: KEBU.faint };
  }
  if (step.step_key === inProgressKey) {
    return { background: KEBU.red, color: KEBU.white, labelColor: KEBU.black };
  }
  return { background: "#E8E6DF", color: KEBU.muted, labelColor: KEBU.muted };
}

export function RegistrationProgressTimeline({ steps }: { steps: ProgressStep[] }) {
  const ordered = [...steps].sort((a, b) => a.sort_order - b.sort_order);

  if (ordered.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#6B5B45" }}>
        Registration progress not available yet. Apply migrations 005–007 in Supabase.
      </p>
    );
  }

  const inProgressKey =
    ordered.find(
      (step) =>
        !step.is_complete && REGISTRATION_STEP_AUTOMATION[step.step_key] !== "blocked",
    )?.step_key ?? null;

  return (
    <ol className="space-y-3" aria-label="Business registration progress">
      {ordered.map((step) => {
        const blocked = REGISTRATION_STEP_AUTOMATION[step.step_key] === "blocked";
        const styles = stepStyles(step, inProgressKey, blocked);
        const blockedNote = stepBlockedLabel(step.step_key);
        const statusLabel = step.is_complete
          ? "Complete"
          : blocked
            ? "Not available yet"
            : step.step_key === inProgressKey
              ? "In progress"
              : "Pending";

        return (
          <li key={step.step_key} className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: styles.background, color: styles.color }}
              aria-hidden
            >
              {stepIcon(step, inProgressKey, blocked)}
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: styles.labelColor }}>
                {step.label}
              </p>
              {step.is_complete && step.completed_at ? (
                <p className="text-[11px]" style={{ color: "#8A8578" }}>
                  Completed {new Date(step.completed_at).toLocaleString()}
                </p>
              ) : (
                <p className="text-[11px]" style={{ color: "#8A8578" }}>
                  {blockedNote ?? statusLabel}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
