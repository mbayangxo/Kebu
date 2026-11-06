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
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <Link className="underline" href="/app-store">KEBU App Store</Link>
      <h1 className="text-4xl font-bold">Live Rooms</h1>
      {error ? <p role="alert">Could not verify your Live Rooms installation. Try again.</p> : <LiveRooms />}
    </main>
  </AppShell>;
}
