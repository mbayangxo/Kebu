import { SitePasswordGate } from "@/app/components/create/site-password-gate";
import { SiteLaunchClock } from "./site-launch-clock";

export const metadata = { robots: { index: false, follow: false } };

export default async function SiteStatusPage({ searchParams }: {
  searchParams: Promise<{ mode?: string; site?: string; title?: string; message?: string; launch?: string }>;
}) {
  const { mode, site, title, message, launch } = await searchParams;
  if (mode === "private" && site && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site)) {
    return <SitePasswordGate subdomain={site} shopName={title || "Private preview"} />;
  }
  const coming = mode === "coming_soon";
  const launchAt = typeof launch === "string" ? Date.parse(launch) : NaN;
  return (
    <main className="grid min-h-dvh place-items-center bg-[#faf8f5] px-6 py-20 text-[#16142b]">
      <div className="max-w-xl text-center">
        <p className="mb-5 text-sm font-semibold">{title}</p>
        <h1 className="text-4xl font-semibold tracking-tight">{coming ? "Coming soon" : "We’ll be back shortly"}</h1>
        {message && <p className="mt-5 leading-relaxed">{message}</p>}
        {coming && Number.isFinite(launchAt) && <SiteLaunchClock launchAt={launchAt} />}
      </div>
    </main>
  );
}
