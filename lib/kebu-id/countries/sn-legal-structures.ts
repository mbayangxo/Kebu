import type { LegalStructure } from "./types";

/** Senegal legal structures — plain-language lessons for first-time founders. */
export const senegalLegalStructures: LegalStructure[] = [
  {
    code: "individual_enterprise",
    label: "Individual Enterprise",
    description: "Entreprise individuelle",
    simpleAnalogy: "A market table with your name on it — you are the business.",
    summary: "You and the business are one person — simplest way to start selling legally.",
    whoItsFor: "Solo freelancers, market sellers, tailors, consultants, and side hustles.",
    bestWhen:
      "You are testing an idea alone, have low risk, and want the fastest path to NINEA and a bank account.",
    examples: [
      "A tailor working alone from a shop in Parcelles",
      "A freelance graphic designer invoicing clients",
      "A woman selling cosmetics from home on Instagram",
    ],
    pros: [
      "Fastest and cheapest to register",
      "You keep full control and all profits",
      "Simple taxes for small revenue",
    ],
    cons: [
      "You are personally responsible for debts and lawsuits",
      "Harder to bring in partners or investors later",
      "Some big clients prefer a registered company (SARL/GIE)",
    ],
  },
  {
    code: "gie",
    label: "GIE",
    description: "Groupement d'intérêt économique",
    simpleAnalogy: "A savings group or farmers' association that also sells together — not one company, but one team.",
    summary: "A group of people working together on a shared economic activity — very common in Senegal.",
    whoItsFor: "Farmer groups, women's cooperatives, artisans, youth projects, and community businesses.",
    bestWhen:
      "You are 2+ people pooling skills, land, or equipment — especially agriculture, processing, or crafts.",
    examples: [
      "Women processing groundnuts together in Kaffrine",
      "A youth music collective sharing studio costs",
      "Farmers selling harvest as one group to a buyer",
    ],
    pros: [
      "Built for groups — members keep their own legal identity",
      "Access to GIE-friendly credit (BNDE, CNCAS, DER/FJ)",
      "Can bid on some public contracts as a group",
      "Lower barrier than a full company",
    ],
    cons: [
      "All members share responsibility for group decisions",
      "Not ideal if one person wants full ownership",
      "Governance rules (statutes) must be clear from day one",
    ],
  },
  {
    code: "suarl",
    label: "SUARL",
    description: "Société unipersonnelle à responsabilité limitée",
    simpleAnalogy: "Your own small company with a wall between your personal money and business debts.",
    summary: "A one-person company — your personal assets are mostly protected from business debts.",
    whoItsFor: "Solo founders who want a real company without partners.",
    bestWhen:
      "You are growing beyond a side hustle, need limited liability, or want to look established to clients.",
    examples: [
      "A solo founder running a digital agency",
      "An artist managing brand deals through a company",
      "A shop owner hiring 2–3 staff under their own company",
    ],
    pros: [
      "Limited liability — business debts stay with the company",
      "One owner, full control",
      "Easier to open business credit than as an individual",
    ],
    cons: [
      "More paperwork and annual obligations than individual enterprise",
      "Higher minimum capital expectations than a GIE",
      "Still harder to raise investment than a larger SARL/SA",
    ],
  },
  {
    code: "sarl",
    label: "SARL",
    description: "Société à responsabilité limitée",
    simpleAnalogy: "The standard small company — like most serious shops and agencies in Dakar.",
    summary: "The standard small company in Senegal — 2 to 100 partners with limited liability.",
    whoItsFor: "Shops, agencies, restaurants, growing SMEs, and businesses with 2+ founders.",
    bestWhen:
      "You have cofounders, want clear ownership shares, and plan to hire staff and scale.",
    examples: [
      "Two friends opening a restaurant in Almadies",
      "A fashion label with a designer and a business partner",
      "A construction SME with family shareholders",
    ],
    pros: [
      "Limited liability for all partners",
      "Clear ownership percentages (parts sociales)",
      "Trusted by banks, suppliers, and corporate clients",
      "Flexible — works for many industries",
    ],
    cons: [
      "Requires at least 2 partners (or use SUARL if alone)",
      "Statutes, RCCM, and annual accounts are required",
      "Slower and more expensive to set up than individual or GIE",
    ],
  },
  {
    code: "sa",
    label: "SA",
    description: "Société anonyme",
    simpleAnalogy: "A big corporation structure — for companies that need many investors or major scale.",
    summary: "A large corporation structure — for businesses that need many shareholders or public investment.",
    whoItsFor: "Established companies, franchises, manufacturers, and firms seeking major investment.",
    bestWhen:
      "You already have significant revenue, many investors, or a legal requirement for this structure.",
    examples: [
      "A manufacturing plant with outside investors",
      "A regional franchise operation",
      "A company preparing for major bank or export contracts",
    ],
    pros: [
      "Can raise capital from many shareholders",
      "Highest credibility with banks and large contracts",
      "Shares can be transferred (with rules)",
    ],
    cons: [
      "High minimum capital and strict governance",
      "Heavy compliance — board, audits, public filings",
      "Overkill for most young founders starting out",
    ],
  },
  {
    code: "cooperative",
    label: "Cooperative",
    description: "Société coopérative",
    simpleAnalogy: "Members own and benefit together — profits return to the group, not outside investors.",
    summary: "Members own and benefit together — profits often return to members, not outside investors.",
    whoItsFor: "Agricultural cooperatives, credit unions, producer groups, and community savings.",
    bestWhen:
      "Your community shares production, savings, or buying power and wants democratic control.",
    examples: [
      "A rice producers' cooperative in the Senegal River Valley",
      "A women's savings and credit group scaling to formal coop",
      "Artisans buying materials together at lower cost",
    ],
    pros: [
      "One member, one vote — democratic governance",
      "Strong fit for agriculture and rural groups",
      "Access to cooperative-specific programs",
    ],
    cons: [
      "Profits must follow cooperative rules, not arbitrary splits",
      "Slower decisions when many members vote",
      "Not suited to a single founder who wants full control",
    ],
  },
  {
    code: "association",
    label: "Association",
    description: "Association à but non lucratif",
    simpleAnalogy: "A club or NGO — for mission and community, not selling for personal profit.",
    summary: "A non-profit group for a mission — not for personal profit.",
    whoItsFor: "NGOs, clubs, cultural groups, sports leagues, and community projects.",
    bestWhen:
      "Your goal is social impact, education, or community service — not selling for personal gain.",
    examples: [
      "A youth coding club in a neighbourhood",
      "A sports federation or cultural association",
      "An NGO running training programs",
    ],
    pros: [
      "Right structure for grants and donations",
      "Clear non-profit status",
      "Good for youth and community programs",
    ],
    cons: [
      "Cannot distribute profits to founders like a business",
      "Wrong choice if you plan to sell products for personal income",
      "Some commercial activity needs a separate business entity",
    ],
  },
];
