/**
 * Shared safety disclaimer for the "AI ENGINE" family of pages (capital-stack, afcfta,
 * bankability, budget-intel, regulatory, remittance, collective, succession) and the other
 * standalone tools that pipe a form into /api/ai and stream back raw model text (assistant,
 * brand, capital, goals, procurement).
 *
 * None of these pages currently disclose that the output is unsourced, generated text — tax
 * rates, treaty details, regulatory comparisons, and funding structures are presented as
 * definitive fact with no citations. This is the single required piece of copy on every one of
 * those pages: render it once above the input form (so it's seen before anyone reads output as
 * fact) — a second placement directly above the streamed result is recommended for any page
 * where the form and result can be far apart on the page.
 */
export function AiEngineDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50 text-amber-900 ${
        compact ? "px-3 py-2 text-[11px]" : "px-4 py-3 text-xs sm:text-sm"
      } leading-relaxed`}
      role="note"
    >
      <strong className="font-bold">AI-generated, not professional advice.</strong> This tool
      produces general information from a language model, not verified data — tax rates, laws,
      treaties, and figures can be wrong, outdated, or invented. Confirm anything you rely on with
      an official government source, a licensed lawyer, or a qualified accountant before acting on
      it. Kebu is not responsible for decisions made from this output.
    </div>
  );
}
