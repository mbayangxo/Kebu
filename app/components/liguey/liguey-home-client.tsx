"use client";

import Link from "next/link";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { KEBU } from "@/lib/kebu-brand";
import { ligueyT, type LigueyKey } from "@/lib/liguey/liguey-i18n";

type Business = { id: string; legal_name: string; trading_name: string | null };
type Props = {
  hasStartedProfile: boolean;
  profileHeadline: string | null;
  hasApplications: boolean;
  managedBusinesses: Business[];
};

export function LigueyHomeClient({ hasStartedProfile, profileHeadline, hasApplications, managedBusinesses }: Props) {
  const { lang } = useLocale();
  const t = (key: LigueyKey) => ligueyT(lang, key);

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={{ borderColor: KEBU.borders.default }}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">{t("brand")}</p>
          <h1 className="mt-1 text-[30px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>{t("home_title")}</h1>
          <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-black/40">{t("home_intro")}</p>
        </div>
        <LanguageBar variant="builder" />
      </header>

      <section className="py-8">
        <div className="flex items-center gap-4 border-y py-6" style={{ borderColor: KEBU.borders.default }}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>
            <KebuIcon name="work" size={22} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black">{hasStartedProfile ? t("home_profile_edit") : t("home_profile_start")}</p>
            <p className="mt-0.5 text-[10px]" style={{ color: KEBU.muted }}>
              {hasStartedProfile ? profileHeadline || t("home_profile_hint_started") : t("home_profile_hint_start")}
            </p>
          </div>
          <Link href="/liguey/profile" className="shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white">
            {hasStartedProfile ? t("home_profile_cta_edit") : t("home_profile_cta_start")}
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-4 border-b py-4" style={{ borderColor: KEBU.borders.default }}>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black">{t("home_discover_title")}</p>
            <p className="mt-0.5 text-[10px]" style={{ color: KEBU.muted }}>{t("home_discover_hint")}</p>
          </div>
          <Link href="/liguey/discover" className="shrink-0 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>{t("home_discover_cta")}</Link>
        </div>

        <div className="mt-4 flex items-center gap-4 border-b py-4" style={{ borderColor: KEBU.borders.default }}>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black">{t("home_applications_title")}</p>
            <p className="mt-0.5 text-[10px]" style={{ color: KEBU.muted }}>{hasApplications ? t("home_applications_hint_some") : t("home_applications_hint_none")}</p>
          </div>
          <Link href="/liguey/applications" className="shrink-0 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>{t("home_applications_cta")}</Link>
        </div>

        {managedBusinesses.length > 0 ? (
          <div className="mt-4 border-b pb-4" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("home_managed_title")}</p>
            <div className="mt-2 space-y-2">
              {managedBusinesses.map((business) => (
                <div key={business.id} className="flex items-center gap-3 rounded-[10px] border p-2.5" style={{ borderColor: KEBU.borders.default }}>
                  <p className="min-w-0 flex-1 truncate text-[11px] font-semibold">{business.trading_name || business.legal_name}</p>
                  <Link href={`/business/${business.id}/liguey`} className="shrink-0 rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-white">{t("home_managed_cta")}</Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-[16px] border p-5" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("home_today_title")}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-black/60">{t("home_today_body")}</p>
        </div>
      </section>
    </div>
  );
}
