import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = { title: "Privacy — Kebu" };

export default function PrivacyPage() {
  return (
    <KebuMarketingPageShell activeHref="/privacy">
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-16 lg:py-24 prose prose-sm max-w-none">
        <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "var(--font-fraunces)" }}>
          Privacy policy
        </h1>
        <p className="text-sm leading-relaxed mb-4" style={{ color: KEBU.muted }}>
          <strong>Last updated:</strong> 2026. This is a plain-language summary; a full legal review may follow as Kebu
          scales.
        </p>
        <section className="space-y-4 text-sm" style={{ color: KEBU.muted }}>
          <p>
            <strong style={{ color: KEBU.black }}>What we collect:</strong> account email, profile you provide, business
            and site content you create, usage needed to run hosting and analytics, and payment metadata when you pay for
            hosting (we do not store card PANs — payments go through approved providers).
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>Why:</strong> to authenticate you, host your site, calculate business
            readiness, personalize Opportunity OS when you opt in, and improve the product.
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>We do not sell</strong> your personal information to advertisers.
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>Your rights:</strong> access, export, and delete your account data
            (delete flows ship as a dedicated account slice). Contact support for requests.
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>Security:</strong> HTTPS in transit; encrypted storage for sensitive
            fields where applicable.
          </p>
        </section>
      </div>
    </KebuMarketingPageShell>
  );
}
