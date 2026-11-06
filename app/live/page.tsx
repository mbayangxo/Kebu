import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { builtinAccess, builtinsEnabled } from "@/lib/live/app-access";
import { LiveRooms } from "./live-rooms";

export default async function LivePage() {
  if (!builtinsEnabled()) notFound();
  const { user, installed, error } = await builtinAccess("live-rooms");
  if (!user) redirect("/login?next=/live");
  if (!installed && !error) redirect("/app-store");
  return <AppShell title="Live Rooms">
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-7 sm:py-10">
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[#5c5348] hover:underline" href="/app-store">← KEBU App Store</Link>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-white p-4">Could not verify your Live Rooms installation. Try again.</p> : <LiveRooms />}
    </main>
  </AppShell>;
}
