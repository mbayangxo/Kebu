import { z } from "zod";

export const KEBU_INTENTS = [
  { id: "create", label: "Create", description: "Design, video, content and creative tools." },
  { id: "business", label: "Run my business", description: "Sell, get paid and understand customers." },
  { id: "build_online", label: "Build online", description: "Sites, stores, portfolios and landing pages." },
  { id: "communicate", label: "Communicate & grow", description: "Mail, messages, audience and people." },
  { id: "organize", label: "Work & organize", description: "Spaces, files, docs, calendar and tasks." },
  { id: "opportunities", label: "Find opportunities", description: "Search, Opportunity OS and research." },
  { id: "technology", label: "Build technology", description: "Developer tools, sites and apps." },
  { id: "explore", label: "Just explore Kebu", description: "Open a workspace and discover what you need." },
] as const;

export const KEBU_TOOLS = [
  { id: "browser", label: "Browser", href: "/browser", icon: "search", group: "Discover" },
  { id: "search", label: "Search", href: "/search", icon: "search", group: "Discover" },
  { id: "opportunities", label: "Opportunity OS", href: "/opportunity", icon: "opportunity", group: "Discover" },
  { id: "studio", label: "Studio", href: "/studio", icon: "studio", group: "Create" },
  { id: "sites", label: "Sites", href: "/my-sites", icon: "builder", group: "Create" },
  { id: "shop", label: "Shop", href: "/shop", icon: "commerce", group: "Business" },
  { id: "business", label: "Business", href: "/business", icon: "spaces", group: "Business" },
  { id: "mail", label: "Email", href: "/email", icon: "message", group: "Connect" },
  { id: "chat", label: "Chat", href: "/chat", icon: "message", group: "Connect" },
  { id: "library", label: "Library", href: "/library", icon: "library", group: "Work" },
  { id: "spaces", label: "Spaces", href: "/spaces", icon: "spaces", group: "Work" },
  { id: "rooms", label: "Rooms", href: "/rooms", icon: "spaces", group: "Work" },
  { id: "docs", label: "Docs", href: "/docs", icon: "work", group: "Work" },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: "work", group: "Work" },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: "calendar", group: "Work" },
  { id: "people", label: "People", href: "/people", icon: "people", group: "Connect" },
] as const;

export type KebuIntentId = (typeof KEBU_INTENTS)[number]["id"];
export type KebuToolId = (typeof KEBU_TOOLS)[number]["id"];

export const KEBU_PERSONAS = [
  "creator",
  "entrepreneur",
  "freelancer",
  "student",
  "team",
  "organization",
  "developer",
  "personal",
] as const;

export const kebuSetupSchema = z.object({
  intents: z.array(z.enum(KEBU_INTENTS.map((item) => item.id) as [KebuIntentId, ...KebuIntentId[]])).min(1).max(8),
  tools: z.array(z.enum(KEBU_TOOLS.map((item) => item.id) as [KebuToolId, ...KebuToolId[]])).min(1).max(20),
  persona: z.enum(KEBU_PERSONAS),
  workspaceName: z.string().trim().max(80).default(""),
  onboardingComplete: z.boolean().default(false),
  version: z.literal("v2").default("v2"),
});

export type KebuSetup = z.infer<typeof kebuSetupSchema>;

export const DEFAULT_KEBU_SETUP: KebuSetup = {
  intents: ["explore"],
  tools: ["search", "opportunities", "spaces"],
  persona: "personal",
  workspaceName: "",
  onboardingComplete: false,
  version: "v2",
};

export function parseKebuSetup(value: unknown): KebuSetup {
  const parsed = kebuSetupSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_KEBU_SETUP;
}

export function recommendedToolsForIntents(intents: readonly KebuIntentId[]): KebuToolId[] {
  const set = new Set<KebuToolId>();
  const add = (...ids: KebuToolId[]) => ids.forEach((id) => set.add(id));
  intents.forEach((intent) => {
    if (intent === "create") add("studio", "library");
    if (intent === "business") add("business", "shop", "mail");
    if (intent === "build_online") add("sites", "library");
    if (intent === "communicate") add("mail", "chat");
    if (intent === "organize") add("spaces", "rooms", "library", "docs", "tasks", "calendar", "chat");
    if (intent === "communicate") add("people");
    if (intent === "opportunities") add("opportunities", "search", "browser");
    if (intent === "technology") add("sites", "search", "browser");
    if (intent === "explore") add("browser", "search", "opportunities", "spaces");
  });
  return [...set];
}

export function toolById(id: KebuToolId) {
  return KEBU_TOOLS.find((tool) => tool.id === id);
}
