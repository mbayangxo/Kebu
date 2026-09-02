import Link from "next/link";

/** Soft reminder — Kebu Business is separate from Builder; never blocks site creation. */
export function BuilderBusinessNudge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs leading-relaxed" style={{ color: "#5C5348" }}>
        Optional:{" "}
        <Link href="/business/register" className="font-semibold underline" style={{ color: "#FF5500" }}>
          Create a Kebu ID business
        </Link>{" "}
        when you want registration and Kebu Score — not required to publish.
      </p>
    );
  }

  return (
    <div
      className="mb-8 rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #FFF8F2, #FFFFFF)",
        border: "1px solid rgba(255,85,0,0.15)",
        boxShadow: "0 4px 24px rgba(255,85,0,0.06)",
      }}
    >
      <p className="font-semibold text-sm mb-1">Kebu Business is optional</p>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "#5C5348" }}>
        Build and publish your site first. Link a <strong>Kebu ID</strong> later for registration, documents, and
        readiness score.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/business/register"
          className="inline-block rounded-full px-5 py-2 text-sm font-semibold"
          style={{ background: "#0A0A0A", color: "#fff" }}
        >
          Create Kebu ID
        </Link>
        <Link
          href="/account"
          className="inline-block rounded-full px-5 py-2 text-sm font-semibold"
          style={{ border: "1px solid rgba(10,10,10,0.12)", color: "#0A0A0A" }}
        >
          View readiness score
        </Link>
      </div>
    </div>
  );
}
