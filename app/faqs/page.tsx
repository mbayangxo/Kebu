import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = { title: "FAQs — Kebu" };

const FAQS = [
  {
    q: "Is Kebu free?",
    a: "Building and editing sites is free. You pay hosting when you publish a live site — see Pricing for current rates.",
  },
  {
    q: "What is the difference between Afrique ID and Kebu ID?",
    a: "Afrique ID is your personal account identity. Kebu ID is your business identity — site, store, and readiness score attach to the business, not you as a person.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes, when custom domain connect is set up in the builder. Your site also works on the Kebu app host without buying a domain.",
  },
  {
    q: "Is Opportunity content verified?",
    a: "We label verified public sources separately from AI-generated analysis. Always check the trust label on each card.",
  },
  {
    q: "Do you sell my data?",
    a: "No. We use your data to run the product you signed up for. See Privacy for details and your rights.",
  },
];

export default function FaqsPage() {
  return (
    <KebuMarketingPageShell activeHref="/faqs">
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-fraunces)" }}>
          FAQs
        </h1>
        <div className="space-y-8">
          {FAQS.map((item) => (
            <div key={item.q}>
              <h2 className="font-bold text-sm mb-2">{item.q}</h2>
              <p className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </KebuMarketingPageShell>
  );
}
