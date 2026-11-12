import { DeveloperCatalog } from "@/app/components/marketplace/catalog";
import { marketplaceEnabled } from "@/lib/marketplace/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/app/components/app-shell";
import { appKeys, builtinAccount, builtinsEnabled, type AppKey } from "@/lib/live/app-access";
import { liveBroadcastCount } from "@/lib/live/discovery";

const apps = [
  { key: "live-rooms", title: "Live Rooms", url: "/live", info: "Discover public broadcasts, watch live, or start a room of your own." },
  { key: "friends", title: "Friends", url: "/friends", info: "Create your own Friends profile, find people, and manage friend requests." },
] as const;

function AppIcon({ app }: { app: AppKey }) {
  return <span className={`grid size-12 shrink-0 place-items-center rounded-[14px] ${app === "live-rooms" ? "bg-[#fff0e6] text-[#8c3000]" : "bg-[#f0ede8] text-[#5c5348]"}`}>
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      {app === "live-rooms" ? <><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M8 8a5.66 5.66 0 0 0 0 8m8-8a5.66 5.66 0 0 1 0 8M5 5a9.9 9.9 0 0 0 0 14M19 5a9.9 9.9 0 0 1 0 14" /></>
      : <><circle cx="9" cy="8" r="3" /><path d="M3 19v-2a6 6 0 0 1 12 0v2m2-14a3 3 0 0 1 0 6m1 3a4 4 0 0 1 3 4v1" /></>}
    </svg>
  </span>;
}

async function change(form: FormData) {
  "use server";
  if (!builtinsEnabled()) notFound();
  const key = form.get("key") as AppKey;
  const action = form.get("action");
  if (!appKeys.includes(key) || (action !== "add" && action !== "remove")) return;
  const { db, user } = await builtinAccount();
  if (!user) redirect("/login?next=/app-store");
  const table = db.from("kebu_builtin_app_installs");
  const { error } = action === "add"
    ? await table.upsert({ app_key: key, user_id: user.id }, { onConflict: "user_id,app_key", ignoreDuplicates: true })
    : await table.delete().eq("user_id", user.id).eq("app_key", key);
  if (error) redirect("/app-store?error=save");
  revalidatePath("/app-store");
  redirect("/app-store");
}

export default async function AppStore({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!builtinsEnabled() && !marketplaceEnabled()) notFound();
  const { db, user } = await builtinAccount();
  const result = user && builtinsEnabled() ? await db.from("kebu_builtin_app_installs").select("app_key").eq("user_id", user.id) : null;
  const added = new Set(result?.data?.map(row => row.app_key));
  const failed = (await searchParams).error === "save";
  const liveCount = builtinsEnabled() ? await liveBroadcastCount() : null;
  return <AppShell title="KEBU App Store">
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-7 sm:py-10">
      <header className="rounded-[28px] border border-[#ff5500]/15 bg-[#fff8f2] p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Make KEBU yours</p>
        <h1 className="mt-2 text-4xl tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>KEBU App Store</h1>
        <p className="mt-3 text-muted">Add the apps you want to use. Keep them together in your KEBU.</p>
      </header>
      {(failed || result?.error) && <p role="alert">Could not load or save your apps. Please try again.</p>}
      {builtinsEnabled() && <><section aria-labelledby="my-apps" className="space-y-3">
        <h2 id="my-apps" className="text-xl font-bold">My apps</h2>
        <div className="flex flex-wrap gap-3">
          {apps.filter(app => added.has(app.key)).map(app =>
            <Link key={app.key} className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold" href={app.url}>Open {app.title}</Link>)}
          {!added.size && !result?.error && <p className="text-muted">Apps you add will appear here.</p>}
        </div>
      </section>
      <section aria-labelledby="browse-apps" className="space-y-3">
        <h2 id="browse-apps" className="text-xl font-bold">Browse apps</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map(app => <article key={app.key} className="flex flex-col gap-4 rounded-[20px] border border-black/10 bg-white p-5">
            <div className="flex items-start gap-3">
              <AppIcon app={app.key} />
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  {app.title}
                  {app.key === "live-rooms" && typeof liveCount === "number" && liveCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0e6] px-2 py-0.5 text-xs font-bold text-[#8c3000]">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-[#ff5500]" />
                      {liveCount} live now
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-sm text-[#5c5348]">{app.info}</p>
              </div>
            </div>
            {!user ? <Link href="/login?next=/app-store" className="underline">Sign in to add</Link>
              : <form action={change} className="mt-auto flex flex-wrap items-center gap-3">
                {added.has(app.key) && <Link href={app.url} className="inline-flex min-h-11 items-center rounded-full bg-[#ff5500] px-4 text-sm font-semibold text-[#0a0a0a] hover:bg-[#ff7733]">Open {app.title}</Link>}
                <input type="hidden" name="key" value={app.key} />
                <button name="action" value={added.has(app.key) ? "remove" : "add"} disabled={Boolean(result?.error)}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40 ${added.has(app.key) ? "border border-black/15 hover:bg-[#fff8f2]" : "bg-[#ff5500] text-[#0a0a0a] hover:bg-[#ff7733]"}`}>
                  {added.has(app.key) ? "Remove" : "Add"} {app.title}
                </button>
              </form>}
          </article>)}
        </div>
      </section></>}
      {marketplaceEnabled() && <DeveloperCatalog />}
    </main>
  </AppShell>;
}
