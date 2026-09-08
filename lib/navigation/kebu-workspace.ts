import { safeAuthNextPath } from "@/lib/auth/safe-next";

/** Which Kebu product surface the user is working in — one account, connected data. */

export type KebuWorkspace = "kebu" | "business" | "studio";

export const KEBU_WORKSPACE_STORAGE_KEY = "kebu.workspace";

export const WORKSPACE_OPTIONS: {
  id: KebuWorkspace;
  title: string;
  subtitle: string;
  bullets: string[];
  homeHref: string;
}[] = [
  {
    id: "kebu",
    title: "Explore",
    subtitle: "Discover Africa, learn, personalize — no business required.",
    bullets: ["Opportunity OS", "Your dashboard", "Personalize & African ID"],
    homeHref: "/dashboard",
  },
  {
    id: "business",
    title: "My KEBU",
    subtitle: "Your space — sites, shop, aesthetics, studio.",
    bullets: ["My Space dashboard", "My Sites + Aesthetic store", "Kebu Shop · Studio · Alkebulan separate"],
    homeHref: "/business",
  },
  {
    id: "studio",
    title: "Kebu Studio",
    subtitle: "Design posters, flyers, video, and social graphics.",
    bullets: ["Create designs", "Linked to your business", "Export for WhatsApp & social"],
    homeHref: "/studio",
  },
];

export function workspaceHome(workspace: KebuWorkspace): string {
  return WORKSPACE_OPTIONS.find((w) => w.id === workspace)?.homeHref ?? "/dashboard";
}

export function isKebuWorkspace(value: string | null | undefined): value is KebuWorkspace {
  return value === "kebu" || value === "business" || value === "studio";
}

/** Guess workspace from URL so deep links still feel coherent. */
export function inferWorkspaceFromPath(pathname: string): KebuWorkspace | null {
  if (
    pathname.startsWith("/create") ||
    pathname.startsWith("/my-sites") ||
    pathname.startsWith("/business") ||
    pathname.startsWith("/b2b") ||
    pathname.startsWith("/ka-score") ||
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/shop")
  ) {
    return "business";
  }
  if (pathname.startsWith("/studio")) return "studio";
  if (
    pathname === "/dashboard" ||
    pathname === "/account" ||
    pathname === "/welcome" ||
    pathname.startsWith("/opportunity")
  ) {
    return "kebu";
  }
  return null;
}

export function readStoredWorkspace(): KebuWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEBU_WORKSPACE_STORAGE_KEY);
    return isKebuWorkspace(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeWorkspace(workspace: KebuWorkspace): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEBU_WORKSPACE_STORAGE_KEY, workspace);
  } catch {
    /* ignore quota */
  }
}

/** Client-only: where to send someone right after sign-in. */
export function postAuthDestination(rawNext: string | null | undefined): string {
  const hadExplicit = Boolean(rawNext?.trim());
  const next = safeAuthNextPath(rawNext);

  if (hadExplicit && next !== "/dashboard") return next;

  const ws = readStoredWorkspace();
  if (ws) return workspaceHome(ws);

  if (!hadExplicit || next === "/dashboard") return "/start";
  return `/start?next=${encodeURIComponent(next)}`;
}

export function workspaceLabel(workspace: KebuWorkspace): string {
  return WORKSPACE_OPTIONS.find((w) => w.id === workspace)?.title ?? "Explore";
}
