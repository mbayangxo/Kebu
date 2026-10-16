import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { createClient } from "@/lib/supabase/server";
import { KEBU } from "@/lib/kebu-brand";

export default async function LigueyHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/liguey");

  const { data: profile } = await supabase
    .from("worker_profiles")
    .select("headline, bio, skills, is_discoverable")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasStartedProfile = Boolean(profile && (profile.headline || profile.bio || profile.skills?.length));

  return (
    <AppShell title="Liguey">
      <div className="mx-auto max-w-[1000px] px-4 py-4 sm:px-6">
        <header className="border-b pb-4" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Kebu Liguey</p>
          <h1 className="mt-1 text-[30px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Work and recruitment</h1>
          <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-black/40">
            Build the profile people and employers see — including life experience, not only a formal employment record.
          </p>
        </header>

        <section className="py-8">
          <div className="flex items-center gap-4 border-y py-6" style={{ borderColor: KEBU.borders.default }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>
              <KebuIcon name="work" size={22} className="text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black">{hasStartedProfile ? "Your worker profile" : "Start your worker profile"}</p>
              <p className="mt-0.5 text-[10px]" style={{ color: KEBU.muted }}>
                {hasStartedProfile ? profile?.headline || "Profile started — add more detail." : "Skills, languages, experience and portfolio evidence."}
              </p>
            </div>
            <Link href="/liguey/profile" className="shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white">
              {hasStartedProfile ? "Edit profile" : "Get started"}
            </Link>
          </div>

          <div className="mt-6 rounded-[16px] border p-5" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>What&apos;s here today</p>
            <p className="mt-2 text-[11px] leading-relaxed text-black/60">
              Liguey&apos;s worker profile is live: durable skills/languages/experience, self-reported and clearly distinguished from anything verified, plus portfolio evidence linked from your Library. Real work listings, applications, employer review, and the SAFA connected journey are not built yet — this page will not show invented job listings in the meantime.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
