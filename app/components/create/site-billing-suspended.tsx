import Link from "next/link";
import { SITE_HOSTING_BILLING_LABEL, SITE_HOSTING_DESCRIPTION } from "@/lib/billing/pricing";

/** Shown on the public URL when monthly hosting lapsed. */
export function SiteBillingSuspendedView({
  subdomain,
  projectId,
}: {
  subdomain: string;
  projectId: string;
}) {
  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ background: "#0F0D33", color: "#fff" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-60">Kebu hosting</p>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">This site is paused</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed opacity-80">
        <span className="font-semibold">{subdomain}</span> was on a paid plan that ended. You can
        republish on <strong>Kebu Free</strong> (subdomain) or renew <strong>Shop ({SITE_HOSTING_BILLING_LABEL})</strong>{" "}
        or another plan. {SITE_HOSTING_DESCRIPTION}
      </p>
      <Link
        href={`/create/${projectId}`}
        className="mt-8 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider"
        style={{ background: "#FF5500", color: "#fff" }}
      >
        Pay hosting &amp; restore site
      </Link>
    </main>
  );
}
