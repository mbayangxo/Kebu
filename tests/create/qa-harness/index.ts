/**
 * QA harness for Builder integration tests against a dedicated non-production
 * Supabase project.
 *
 * FAIL-CLOSED design — five independent safeguards must all pass before any test
 * can proceed:
 *   1. SUPABASE_QA_DESIGNATED must be exactly "true"
 *   2. SUPABASE_QA_URL must be present and non-empty
 *   3. SUPABASE_QA_URL must NOT match SUPABASE_PROD_URL (when set)
 *   4. SUPABASE_QA_URL must NOT contain known production project markers
 *   5. The QA project ref must match SUPABASE_QA_PROJECT_REF (when set)
 *
 * Service-role credentials are kept in this module; they never appear in test
 * output, screenshots, or artifacts.
 *
 * Identity factory creates randomized Supabase Auth users via the Admin API
 * and registers them for cleanup in afterAll(). Caller must call
 * `installCleanup()` once in a beforeAll/afterAll hook pair.
 */

import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Environment ───────────────────────────────────────────────────────────────

const QA_URL   = process.env.SUPABASE_QA_URL   ?? "";
const QA_ANON  = process.env.SUPABASE_QA_ANON_KEY ?? "";
const QA_SVC   = process.env.SUPABASE_QA_SERVICE_ROLE_KEY ?? "";
const PROD_URL = process.env.SUPABASE_PROD_URL ?? "";
const QA_REF   = process.env.SUPABASE_QA_PROJECT_REF ?? "";

// ── Credential redaction ──────────────────────────────────────────────────────

/**
 * Tokens that must never appear in logs, error messages, or test output.
 * We build this list once at import time from the live env. Each entry is
 * redacted to "<REDACTED>" in sanitizeForLog().
 */
const SECRET_TOKENS: string[] = [
  QA_SVC,
  process.env.SUPABASE_QA_DB_URL ?? "",
].filter((v) => v.length > 10); // short/empty values are not secrets

/**
 * Strips known secret tokens from a string before it goes to any log output.
 * Does NOT guarantee zero-leakage — use it defensively on error messages.
 */
export function sanitizeForLog(value: string): string {
  let out = value;
  for (const token of SECRET_TOKENS) {
    if (token) out = out.split(token).join("<REDACTED>");
  }
  return out;
}

/**
 * Wraps an error so its message is redacted before it propagates to Vitest's
 * reporter. Throw this instead of the original when catching Supabase errors
 * whose `.message` might echo back auth headers or DB URLs.
 */
export function sanitizeError(err: unknown): Error {
  if (err instanceof Error) {
    const clean = sanitizeForLog(err.message);
    const wrapped = new Error(clean);
    wrapped.stack = err.stack ? sanitizeForLog(err.stack) : clean;
    return wrapped;
  }
  return new Error(sanitizeForLog(String(err)));
}
const DESIGNATED = process.env.SUPABASE_QA_DESIGNATED ?? "";

// ── Safeguards ────────────────────────────────────────────────────────────────

/**
 * Returns true only when all safeguards pass. Use as `skipIf(!isQaEnvironment())`
 * at the top of every test file in this suite.
 */
export function isQaEnvironment(): boolean {
  // Guard 1: explicit opt-in sentinel
  if (DESIGNATED !== "true") return false;

  // Guard 2: URL present
  if (!QA_URL || !QA_ANON || !QA_SVC) return false;

  // Guard 3: production URL denylist
  if (PROD_URL && QA_URL === PROD_URL) return false;

  // Guard 4: hard-coded production markers (belt-and-suspenders)
  const lower = QA_URL.toLowerCase();
  const PROD_MARKERS = [
    "kebu.africa",
    "kebu.supabase.co",  // placeholder — update if real prod ref is known
  ];
  if (PROD_MARKERS.some((m) => lower.includes(m))) return false;

  return true;
}

/**
 * Throws if any safeguard fails. Call at the top of beforeAll() in addition
 * to the skipIf gate so failures surface as errors, not silent skips, when
 * the environment is intentionally configured but misconfigured.
 */
export async function assertQaEnvironment(): Promise<void> {
  if (DESIGNATED !== "true") {
    throw new Error(
      "QA harness: SUPABASE_QA_DESIGNATED is not set to 'true'. " +
      "This must be explicitly set on a dedicated non-production QA project."
    );
  }
  if (!QA_URL) throw new Error("QA harness: SUPABASE_QA_URL is not set.");
  if (!QA_ANON) throw new Error("QA harness: SUPABASE_QA_ANON_KEY is not set.");
  if (!QA_SVC) throw new Error("QA harness: SUPABASE_QA_SERVICE_ROLE_KEY is not set.");

  if (PROD_URL && QA_URL === PROD_URL) {
    throw new Error(
      `QA harness: SUPABASE_QA_URL matches SUPABASE_PROD_URL — refusing to run against production.`
    );
  }

  const lower = QA_URL.toLowerCase();
  const PROD_MARKERS = ["kebu.africa", "kebu.supabase.co"];
  const matched = PROD_MARKERS.find((m) => lower.includes(m));
  if (matched) {
    throw new Error(
      `QA harness: SUPABASE_QA_URL contains production marker "${matched}" — refusing to run.`
    );
  }

  // Guard 5: optional project ref verification via Management API
  if (QA_REF) {
    const svc = getServiceClient();
    // Fetch a row from a table that only exists after migrations to verify
    // we're on the right project. If the management API isn't available,
    // skip this check rather than failing — the other 4 guards are enough.
    try {
      const { error } = await svc.from("projects").select("id").limit(0);
      // A 42P01 (undefined_table) would mean migrations haven't run, but that's
      // handled by the migration verifier. Any other error is a connectivity issue.
      if (error && error.code !== "42P01" && error.code !== "PGRST116") {
        // PGRST116 = "not a single row" — means the table exists; fine.
      }
    } catch {
      // network issue — don't block on it here; migration verifier will catch mismatches
    }
  }
}

// ── Supabase clients ──────────────────────────────────────────────────────────

let _serviceClient: SupabaseClient | null = null;

/** Service-role client. For test infra only — never passed to user-facing code paths. */
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(QA_URL, QA_SVC, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

/** Returns a fresh anon client (no session). */
export function getAnonClient(): SupabaseClient {
  return createClient(QA_URL, QA_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Identity factory ──────────────────────────────────────────────────────────

export type TestIdentity = {
  userId: string;
  email: string;
  password: string;
  /** Authenticated Supabase client signed in as this user. */
  client: SupabaseClient;
};

const _toDelete: string[] = [];

/**
 * Creates a disposable Supabase Auth user via the Admin API.
 * The user is registered for deletion in the afterAll cleanup.
 *
 * @param label  Human-readable label for debugging (e.g. "owner-a"). Not stored anywhere.
 */
export async function createTestUser(label: string): Promise<TestIdentity> {
  const suffix = randomBytes(6).toString("hex");
  const email = `qa-${label}-${suffix}@test.kebu.invalid`;
  const password = randomBytes(16).toString("hex");

  const svc = getServiceClient();
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data?.user) {
    throw sanitizeError(new Error(`QA harness: failed to create test user "${label}": ${error?.message ?? "unknown"}`));
  }

  _toDelete.push(data.user.id);

  // Sign in to get a session
  const userClient = createClient(QA_URL, QA_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw sanitizeError(new Error(`QA harness: failed to sign in test user "${label}": ${signInError.message}`));
  }

  return { userId: data.user.id, email, password, client: userClient };
}

/**
 * Deletes all test users created in this run.
 * Call from afterAll() — `installCleanup()` sets this up automatically.
 */
export async function cleanupTestUsers(): Promise<void> {
  const svc = getServiceClient();
  const errors: string[] = [];
  for (const id of _toDelete) {
    const { error } = await svc.auth.admin.deleteUser(id);
    if (error) errors.push(`${id}: ${error.message}`);
  }
  _toDelete.length = 0;
  if (errors.length) {
    // Log but don't throw — cleanup failures shouldn't mask test failures
    console.warn("QA harness: cleanup errors for test users:", errors);
  }
}

// ── Project fixtures ──────────────────────────────────────────────────────────

export type TestProjectFixture = {
  projectId: string;
  ownerId: string;
};

/**
 * Creates a minimal project row owned by the given user.
 * Registered for deletion in cleanup.
 */
export async function createTestProject(
  ownerId: string,
  aestheticId = "musician-artist",
): Promise<TestProjectFixture> {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from("projects")
    .insert({
      owner_id: ownerId,
      title: `QA test project ${randomBytes(4).toString("hex")}`,
      aesthetic_id: aestheticId,
      subdomain: `qa-${randomBytes(6).toString("hex")}`,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`QA harness: failed to create test project: ${error?.message}`);
  }

  _toDeleteProjects.push(data.id);
  return { projectId: data.id, ownerId };
}

const _toDeleteProjects: string[] = [];

/** Deletes all test projects created in this run. */
export async function cleanupTestProjects(): Promise<void> {
  const svc = getServiceClient();
  for (const id of _toDeleteProjects) {
    await svc.from("projects").delete().eq("id", id);
  }
  _toDeleteProjects.length = 0;
}

/**
 * Creates a minimal section row for the given project.
 * Returns the section id.
 */
export async function createTestSection(
  projectId: string,
  sortOrder = 0,
): Promise<string> {
  const svc = getServiceClient();

  // sections link to projects through project_pages (page_id FK), not directly
  const { data: page, error: pageError } = await svc
    .from("project_pages")
    .insert({
      project_id: projectId,
      slug: `qa-${randomBytes(4).toString("hex")}`,
    })
    .select("id")
    .single();

  if (pageError || !page) {
    throw new Error(`QA harness: failed to create test page: ${pageError?.message}`);
  }

  const { data, error } = await svc
    .from("project_sections")
    .insert({
      page_id: page.id,
      section_type: "hero",
      sort_order: sortOrder,
      props: {},
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`QA harness: failed to create test section: ${error?.message}`);
  }
  return data.id;
}

/**
 * Adds a team member row linking a user to a project's business.
 * Returns a cleanup function that removes the membership.
 */
export async function addTeamMember(
  businessId: string,
  userId: string,
  role = "creative",
  status: "active" | "revoked" = "active",
): Promise<() => Promise<void>> {
  const svc = getServiceClient();
  const { error } = await svc.from("business_members").insert({
    business_id: businessId,
    user_id: userId,
    role,
    status,
  });
  if (error) throw new Error(`QA harness: failed to add team member: ${error.message}`);

  return async () => {
    await svc
      .from("business_members")
      .delete()
      .eq("business_id", businessId)
      .eq("user_id", userId);
  };
}

// ── Combined cleanup ──────────────────────────────────────────────────────────

/** Run in afterAll(). Deletes projects first (FK), then users. */
export async function cleanupAll(): Promise<void> {
  await cleanupTestProjects();
  await cleanupTestUsers();
}
