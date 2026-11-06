import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/app/components/app-shell";
import { PersonalPeoplePanel } from "@/app/components/people/personal-people-panel";
import { builtinAccess, builtinsEnabled } from "@/lib/live/app-access";

async function save(form: FormData) {
  "use server";
  if (!builtinsEnabled()) notFound();
  const { db, user, installed } = await builtinAccess("friends");
  if (!user || !installed) redirect("/app-store");
  const display_name = String(form.get("display_name") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim();
  const username = String(form.get("username") ?? "").trim().toLowerCase().replace(/^@/, "") || null;
  const discoverable = form.get("discoverable") === "on";
  if ((username && !/^[a-z0-9_]{3,24}$/.test(username)) || (discoverable && !username)) redirect("/friends?error=profile");
  if (display_name.length < 2 || display_name.length > 60 || bio.length > 240) redirect("/friends?error=profile");
  const { error } = await db.from("kebu_friends_profiles").upsert({ user_id: user.id, display_name, bio, username, discoverable });
  if (error) redirect("/friends?error=profile");
  revalidatePath("/friends");
  redirect("/friends");
}

export default async function Friends({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!builtinsEnabled()) notFound();
  const { db, user, installed, error } = await builtinAccess("friends");
  if (!user) redirect("/login?next=/friends");
  if (!installed && !error) redirect("/app-store");
  const { data: profile, error: profileError } = await db.from("kebu_friends_profiles")
    .select("display_name,bio,username,discoverable").eq("user_id", user.id).maybeSingle();
  const failed = (await searchParams).error === "profile";
  return <AppShell title="Friends">
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <Link href="/app-store" className="underline">KEBU App Store</Link>
      <h1 className="text-4xl font-bold">Friends</h1>
      {error ? <p role="alert">Could not verify your Friends installation. Try again.</p> : <>
        <form action={save} className="grid max-w-xl gap-3 rounded-2xl border p-5">
          <h2 className="text-xl font-bold">My Friends profile</h2>
          <p className="text-sm text-muted">Set up a profile just for Friends. You decide whether people can find it by username.</p>
          {(failed || profileError) && <p role="alert">Could not load or save your profile. Please try again.</p>}
          <label className="grid gap-1">Display name<input className="rounded border p-2" name="display_name" required minLength={2} maxLength={60} defaultValue={profile?.display_name} /></label>
          <label className="grid gap-1">Bio<textarea className="rounded border p-2" name="bio" maxLength={240} defaultValue={profile?.bio} /></label>
          <label className="grid gap-1">Username<input className="rounded border p-2" name="username" maxLength={24} pattern="[a-z0-9_]{3,24}" defaultValue={profile?.username ?? ""} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="discoverable" defaultChecked={profile?.discoverable} /> Let people find my profile by username</label>
          <button className="w-fit rounded-full bg-black px-4 py-2 font-semibold text-white">Save profile</button>
        </form>
        <PersonalPeoplePanel friendsSearch />
      </>}
    </main>
  </AppShell>;
}
