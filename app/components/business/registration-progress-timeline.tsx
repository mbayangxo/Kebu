type ProgressStep = {
  step_key: string;
  label: string;
  sort_order: number;
  is_complete: boolean;
  completed_at: string | null;
};

export function RegistrationProgressTimeline({ steps }: { steps: ProgressStep[] }) {
  const ordered = [...steps].sort((a, b) => a.sort_order - b.sort_order);

  if (ordered.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#6B5B45" }}>
        Registration progress not available yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3" aria-label="Registration progress">
      {ordered.map((step) => (
        <li key={step.step_key} className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: step.is_complete ? "#00C851" : "#E8E6DF",
              color: step.is_complete ? "#0F0D33" : "#6B5B45",
            }}
            aria-hidden
          >
            {step.is_complete ? "✓" : ""}
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: step.is_complete ? "#0F0D33" : "#6B5B45" }}>
              {step.label}
            </p>
            {step.is_complete && step.completed_at ? (
              <p className="text-[11px]" style={{ color: "#8A8578" }}>
                Completed {new Date(step.completed_at).toLocaleString()}
              </p>
            ) : (
              <p className="text-[11px]" style={{ color: "#8A8578" }}>
                Pending
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
