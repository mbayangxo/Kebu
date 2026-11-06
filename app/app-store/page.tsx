import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/app/components/app-shell";
import { appKeys, builtinAccount, builtinsEnabled, type AppKey } from "@/lib/live/app-access";

const apps = [
  { key: "live-rooms", title: "Live Rooms", url: "/live", info: "Discover public broadcasts, watch live, or start a room of your own." },
  { key: "friends", title: "Friends", url: "/friends", info: "Create your own Friends profile, find people, and manage friend requests." },
] as const;

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
  if (!builtinsEnabled()) notFound();
  const { db, user } = await builtinAccount();
  const result = user ? await db.from("kebu_builtin_app_installs").select("app_key").eq("user_id", user.id) : null;
  const added = new Set(result?.data?.map(row => row.app_key));
  const failed = (await searchParams).error === "save";
  return <AppShell title="KEBU App Store">
    <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Make KEBU yours</p>
        <h1 className="mt-2 text-4xl font-bold">KEBU App Store</h1>
        <p className="mt-3 text-muted">Add the apps you want to use. They open here in KEBU.</p>
      </header>
      {(failed || result?.error) && <p role="alert">Could not load or save your apps. Please try again.</p>}
      <section aria-labelledby="my-apps" className="space-y-3">
        <h2 id="my-apps" className="text-xl font-bold">My apps</h2>
        <div className="flex flex-wrap gap-3">
          {apps.filter(app => added.has(app.key)).map(app =>
            <Link key={app.key} className="rounded-full border px-4 py-2 font-semibold" href={app.url}>Open {app.title}</Link>)}
          {!added.size && !result?.error && <p className="text-muted">Apps you add will appear here.</p>}
        </div>
      </section>
      <section aria-labelledby="browse-apps" className="space-y-3">
        <h2 id="browse-apps" className="text-xl font-bold">Browse apps</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map(app => <article key={app.key} className="space-y-4 rounded-2xl border p-5">
            <h3 className="text-lg font-semibold">{app.title}</h3><p className="text-muted">{app.info}</p>
            {!user ? <Link href="/login?next=/app-store" className="underline">Sign in to add</Link>
              : <form action={change}>
                <input type="hidden" name="key" value={app.key} />
                <button name="action" value={added.has(app.key) ? "remove" : "add"} disabled={Boolean(result?.error)}
                  className="rounded-full bg-black px-4 py-2 font-semibold text-white disabled:opacity-40">
                  {added.has(app.key) ? "Remove" : "Add"} {app.title}
                </button>
              </form>}
          </article>)}
        </div>
      </section>
    </main>
  </AppShell>;
}
