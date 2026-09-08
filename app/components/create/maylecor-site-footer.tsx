"use client";

import { MAYLECOR_SOCIAL_DEFAULTS } from "@/lib/create/maylecor-defaults";
import { MaylecorSocialBar } from "@/app/components/create/maylecor-social-bar";

type Social = { label: string; iconUrl: string; href: string };

export function MaylecorSiteFooter({
  brandLabel,
  accentColor = "#E9006B",
  socialLinks,
  siteBase = "",
}: {
  brandLabel: string;
  accentColor?: string;
  socialLinks?: Social[];
  siteBase?: string;
}) {
  const links = socialLinks?.length ? socialLinks : MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s }));
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-white/10 px-6 py-10 text-center"
      style={{ background: "#0a0a0a", color: "rgba(255,255,255,0.75)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: accentColor }}>
        {brandLabel}
      </p>
      <div className="mt-6">
        <MaylecorSocialBar links={links} accentColor={accentColor} variant="footer" />
      </div>
      <p className="mt-6 text-[10px] uppercase tracking-widest opacity-50">
        © {year} {brandLabel}
        {siteBase ? (
          <>
            {" "}
            ·{" "}
            <a href={siteBase || "/"} className="underline hover:opacity-80">
              Home
            </a>
          </>
        ) : null}
      </p>
      <p className="mt-2 text-[9px] opacity-40">Built on Kebu</p>
    </footer>
  );
}
