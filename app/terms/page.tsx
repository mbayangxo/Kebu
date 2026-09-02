import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = { title: "Terms — Kebu" };

export default function TermsPage() {
  return (
    <KebuMarketingPageShell activeHref="/terms">
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "var(--font-fraunces)" }}>
          Terms of use
        </h1>
        <div className="space-y-4 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          <p>
            By using Kebu you agree to use the platform lawfully and not to abuse other users&apos; data, publish illegal
            content, or attempt to break security or billing controls.
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>Your content</strong> remains yours. You grant Kebu a license to host,
            display, and back up content you publish through our services.
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>Kebu ID and Kebu Score</strong> are business tools — not government
            registration, not a bank credit score, and not a guarantee of funding or success.
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>Opportunity OS</strong> mixes verified public information with
            AI-generated analysis. You are responsible for validating anything before business or legal decisions.
          </p>
          <p>
            <strong style={{ color: KEBU.black }}>Availability:</strong> we strive for reliable hosting but do not
            guarantee uninterrupted service during beta and early production.
          </p>
          <p className="text-xs pt-4" style={{ color: KEBU.faint }}>
            Questions: see Contact us. These terms may be updated; continued use after notice constitutes acceptance.
          </p>
        </div>
      </div>
    </KebuMarketingPageShell>
  );
}
