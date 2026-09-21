import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { createClient } from "@/lib/supabase/server";
import { KEBU } from "@/lib/kebu-brand";
import { PersonalPeoplePanel } from "@/app/components/people/personal-people-panel";

type Member = { business_id: string; user_id: string; role: string; status: string };
type Profile = { id: string; name: string | null; email: string | null; avatar_url: string | null };

type Props = { searchParams: Promise<{ scope?: string }> };\n\nexport default async function PeoplePage({ searchParams }: Props) {\n  const { scope } = await searchParams;\n  const businessScope = scope === "business";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/people");

  const { data: ownMemberships } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  const businessIds = (ownMemberships ?? []).map((row) => row.business_id);
  let members: Member[] = [];
  let businesses: Array<{ id: string; legal_name: string; trading_name: string | null }> = [];

  if (businessIds.length) {
    const [memberResult, businessResult] = await Promise.all([
      supabase.from("business_members").select("business_id, user_id, role, status").in("business_id", businessIds).eq("status", "active"),
      supabase.from("businesses").select("id, legal_name, trading_name").in("id", businessIds),
    ]);
    members = (memberResult.data ?? []) as Member[];
    businesses = businessResult.data ?? [];
  }

  const userIds = [...new Set(members.map((member) => member.user_id))];
  let profiles: Profile[] = [];
  if (userIds.length) {
    const { data } = await supabase.from("user_profiles").select("id, name, email, avatar_url").in("id", userIds);
    profiles = (data ?? []) as Profile[];
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const businessById = new Map(businesses.map((business) => [business.id, business.trading_name || business.legal_name]));

  return (
    <AppShell title="People">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-7">
        <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>{businessScope ? "Business People" : "Personal People"}</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>{businessScope ? "The people you work with." : "The people you choose."}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>{businessScope ? "Business members and roles stay separate from your personal friends." : "Friends across Kebu, separate from business staff and customer lists."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={businessScope ? "/people" : "/people?scope=business"} className="rounded-full border bg-white px-4 py-2.5 text-xs font-bold" style={{ borderColor: KEBU.borders.default }}>
              {businessScope ? "Personal People" : "Business People"}
            </Link>
            <Link href="/chat" className="rounded-full bg-black px-4 py-2.5 text-xs font-bold text-white">Open Chat</Link>
          </div>
        </header>

        <section className="py-6">
          {!businessScope ? (
            <PersonalPeoplePanel />
          ) : members.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const profile = profileById.get(member.user_id);
                const name = profile?.name || profile?.email || "Kebu member";
                const initial = name.charAt(0).toUpperCase();
                return (
                  <article key={member.business_id + ":" + member.user_id} className="rounded-[20px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
                    <div className="flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>{initial}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-black">{name}</p>
                        <p className="mt-0.5 truncate text-[9px] uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{member.role.replaceAll("_", " ")}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl bg-black/[.025] px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.orange }}>Space</p>
                      <p className="mt-0.5 truncate text-[11px] font-bold">{businessById.get(member.business_id) || "Business"}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed bg-white p-10 text-center" style={{ borderColor: KEBU.borders.default }}>
              <KebuIcon name="people" size={30} className="mx-auto" style={{ color: KEBU.faint }} />
              <p className="mt-3 text-sm font-black">No business teammates yet.</p>
              <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>When people join one of your business spaces, they will appear here.</p>
              <Link href="/business" className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white">Open Business</Link>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
