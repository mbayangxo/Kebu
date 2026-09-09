import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { ContactHelpForm } from "@/app/components/contact/contact-help-form";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Contact us — Kebu",
  description: "Get in touch with the Kebu team — help requests go to the ops portal.",
};

export default function ContactPage() {
  return (
    <KebuMarketingPageShell activeHref="/contact">
      <div className="max-w-[800px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
          Contact us
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "var(--font-fraunces)" }}>
          Talk to Kebu
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: KEBU.muted }}>
          Questions about your account, building a site, or partnering with Kebu? Send a help request — it
          lands in the Kebu Record admin portal for the team.
        </p>
        <ContactHelpForm />
      </div>
    </KebuMarketingPageShell>
  );
}
