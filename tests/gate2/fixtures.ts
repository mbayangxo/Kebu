/**
 * Phase 3B Gate 2 fixtures — synthetic QA identities, owner-seeded projects,
 * ground-truth reads and scoped cleanup.
 *
 * Fail-closed: every entry point asserts the QA Supabase project and a local
 * app host before doing anything. Production (tnygqgcqlnlsmjpygrca) is refused.
 *
 * Service role is used ONLY for: admin user create/delete, ground-truth reads,
 * and cleanup of rows this module created. Project/page/section seeding goes
 * through the owner's own RLS-scoped session.
 */
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const QA_REF = "skqnxyaeimvbyrmdfzvk";
const PROD_REF = "tnygqgcqlnlsmjpygrca";

export const QA_URL = process.env.SUPABASE_QA_URL ?? "";
const QA_ANON = process.env.SUPABASE_QA_ANON_KEY ?? "";
const QA_SVC = process.env.SUPABASE_QA_SERVICE_ROLE_KEY ?? "";
export const APP_URL = process.env.KEBU_E2E_BASE_URL ?? "";

function jwtRef(token: string): string | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.ref === "string" ? payload.ref : undefined;
  } catch {
    return undefined;
  }
}

/** Throws unless every credential and host is provably QA / local. */
export function assertQaOnly(): void {
  const problems: string[] = [];
  if (new URL(QA_URL || "http://invalid").hostname !== `${QA_REF}.supabase.co`) problems.push("SUPABASE_QA_URL is not the QA project");
  if (jwtRef(QA_ANON) !== QA_REF) problems.push("anon key is not for the QA project");
  if (jwtRef(QA_SVC) !== QA_REF) problems.push("service key is not for the QA project");
  for (const v of [QA_URL, QA_ANON, QA_SVC, APP_URL, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""]) {
    if (v.includes(PROD_REF)) problems.push("a credential references the production project");
  }
  const appHost = new URL(APP_URL || "http://invalid").hostname;
  if (appHost !== "localhost" && appHost !== "127.0.0.1") problems.push("KEBU_E2E_BASE_URL is not a local host");
  if (problems.length) throw new Error(`Gate 2 QA guard refused to run: ${problems.join("; ")}`);
}

let _svc: SupabaseClient | null = null;
/** Service-role client — test infrastructure only. */
export function svc(): SupabaseClient {
  assertQaOnly();
  _svc ??= createClient(QA_URL, QA_SVC, { auth: { persistSession: false, autoRefreshToken: false } });
  return _svc;
}

export type Identity = { userId: string; email: string; password: string; client: SupabaseClient };

const createdUserIds: string[] = [];
const createdProjectIds: string[] = [];

export async function createIdentity(label: string): Promise<Identity> {
  const email = `qa-g2-${label}-${randomBytes(5).toString("hex")}@test.kebu.invalid`;
  const password = randomBytes(18).toString("hex");
  const { data, error } = await svc().auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createIdentity(${label}) failed: ${error?.message ?? "no user"}`);
  createdUserIds.push(data.user.id);

  const client = createClient(QA_URL, QA_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`sign-in for ${label} failed: ${signInError.message}`);
  return { userId: data.user.id, email, password, client };
}

export type SectionKey = "alpha" | "bravo" | "charlie" | "delta";

export const SECTION_SPECS: { key: SectionKey; type: string; label: string; marker: string; props: Record<string, unknown> }[] = [
  { key: "alpha",   type: "hero",     label: "Hero banner", marker: "ALPHA hero",     props: { subheading: "Gate 2 alpha" } },
  { key: "bravo",   type: "text",     label: "Text",        marker: "BRAVO text",     props: { body: "Gate 2 bravo body." } },
  { key: "charlie", type: "faq",      label: "FAQ",         marker: "CHARLIE faq",    props: { items: [{ question: "Gate 2?", answer: "Charlie." }] } },
  { key: "delta",   type: "features", label: "Features",    marker: "DELTA features", props: { items: [{ title: "Delta", body: "Gate 2 delta." }] } },
];

/** Heading text rendered for a section — unique per project owner via `prefix`. */
export function headingFor(prefix: string, key: SectionKey): string {
  return `${prefix}${SECTION_SPECS.find((s) => s.key === key)!.marker}`;
}

export type SeededProject = {
  prefix: string;
  projectId: string;
  pageId: string;
  subdomain: string;
  sectionIds: Record<SectionKey, string>;
};

/** Seeds project → home page → four distinct sections through the owner's RLS session. */
export async function seedProjectAsOwner(owner: Identity, titlePrefix: string, prefix: string): Promise<SeededProject> {
  const subdomain = `qa-g2-${randomBytes(5).toString("hex")}`;
  const { data: project, error: pErr } = await owner.client
    .from("projects")
    .insert({ owner_id: owner.userId, title: `${titlePrefix} ${subdomain}`, subdomain })
    .select("id")
    .single();
  if (pErr || !project) throw new Error(`seed project failed: ${pErr?.message}`);
  createdProjectIds.push(project.id);

  const { data: page, error: pgErr } = await owner.client
    .from("project_pages")
    .insert({ project_id: project.id, slug: "home", title: "Home", sort_order: 0 })
    .select("id")
    .single();
  if (pgErr || !page) throw new Error(`seed page failed: ${pgErr?.message}`);

  const sectionIds = {} as Record<SectionKey, string>;
  for (const [i, spec] of SECTION_SPECS.entries()) {
    const res = await owner.client
      .from("project_sections")
      .insert({ page_id: page.id, section_type: spec.type, sort_order: i, props: { heading: headingFor(prefix, spec.key), ...spec.props } })
      .select("id")
      .single();
    const sec = res.data;
    if (res.error || !sec) {
      throw new Error(`seed section ${spec.key} failed: ${JSON.stringify({ status: res.status, statusText: res.statusText, error: res.error, data: res.data })}`);
    }
    sectionIds[spec.key] = sec.id;
  }
  return { prefix, projectId: project.id, pageId: page.id, subdomain, sectionIds };
}

// ── Ground truth (service-role reads) ─────────────────────────────────────────

export type PersistedState = {
  deviceLayouts: Record<string, { sectionOrder?: string[]; hiddenSections?: string[] }> | null;
  desktopOrder: string[];
  props: Record<string, Record<string, unknown>>;
  project: { status: string | null; subdomain: string | null; updated_at: string };
};

export async function readPersisted(seed: SeededProject): Promise<PersistedState> {
  const db = svc();
  const { data: page, error: e1 } = await db.from("project_pages").select("device_layouts").eq("id", seed.pageId).single();
  if (e1) throw new Error(e1.message);
  const { data: sections, error: e2 } = await db
    .from("project_sections")
    .select("id, sort_order, props")
    .eq("page_id", seed.pageId)
    .order("sort_order", { ascending: true });
  if (e2) throw new Error(e2.message);
  const { data: project, error: e3 } = await db.from("projects").select("status, subdomain, updated_at").eq("id", seed.projectId).single();
  if (e3) throw new Error(e3.message);
  return {
    deviceLayouts: (page.device_layouts ?? null) as PersistedState["deviceLayouts"],
    desktopOrder: (sections ?? []).map((s) => s.id as string),
    props: Object.fromEntries((sections ?? []).map((s) => [s.id as string, (s.props ?? {}) as Record<string, unknown>])),
    project: project as PersistedState["project"],
  };
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

/** Deletes only rows this module created; cascades remove pages/sections/deployments/subscriptions/versions. */
export async function cleanupGate2(): Promise<{ projects: string[]; users: string[]; errors: string[] }> {
  const db = svc();
  const errors: string[] = [];
  const projects = [...createdProjectIds];
  const users = [...createdUserIds];
  for (const id of projects) {
    const { error } = await db.from("projects").delete().eq("id", id);
    if (error) errors.push(`project ${id}: ${error.message}`);
  }
  for (const id of users) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) errors.push(`user ${id}: ${error.message}`);
  }
  createdProjectIds.length = 0;
  createdUserIds.length = 0;
  return { projects, users, errors };
}
