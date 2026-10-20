import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, POST, PATCH, DELETE } from "@/app/api/mail/forwarding/route";

const userId = "11111111-1111-4111-8111-111111111111";
const mailboxId = "22222222-2222-4222-8222-222222222222";
const mailboxRow = {
  id: mailboxId, owner_user_id: userId, business_id: null, mailbox_type: "personal",
  address: "me@kebu.africa", display_name: "Me", is_active: true, mail_domain_id: null,
};

function request(method: string, url: string, body?: unknown) {
  return new Request(url, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}

function setup(opts: {
  mailbox?: typeof mailboxRow | null;
  ruleResult?: { data: unknown; error: unknown };
  upsertResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
} = {}) {
  const mailboxMaybeSingle = vi.fn().mockResolvedValue({ data: opts.mailbox === undefined ? mailboxRow : opts.mailbox, error: null });
  const ruleMaybeSingle = vi.fn().mockResolvedValue(opts.ruleResult ?? { data: null, error: null });
  const upsertSingle = vi.fn().mockResolvedValue(opts.upsertResult ?? { data: { mailbox_id: mailboxId, forward_to_address: "fwd@example.com", is_active: true }, error: null });
  const updateSingle = vi.fn().mockResolvedValue(opts.updateResult ?? { data: { mailbox_id: mailboxId, forward_to_address: "fwd@example.com", is_active: false }, error: null });
  const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null });

  const from = vi.fn((table: string) => {
    if (table === "mailboxes") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: mailboxMaybeSingle };
    if (table === "mail_forwarding_rules") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: ruleMaybeSingle,
        upsert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: upsertSingle })),
        update: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: updateSingle })),
        delete: vi.fn(() => ({ eq: deleteEq })),
      };
    }
    if (table === "mail_audit_events") return { insert: auditInsert };
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  return { from, auditInsert, deleteEq };
}

beforeEach(() => vi.clearAllMocks());

describe("Mail forwarding settings route", () => {
  it("GET returns null when no rule exists yet", async () => {
    setup();
    const res = await GET(request("GET", "https://kebu.test/api/mail/forwarding?mailboxId=" + mailboxId));
    expect(res.status).toBe(200);
    expect((await res.json()).rule).toBeNull();
  });

  it("GET rejects a mailbox the caller cannot access", async () => {
    setup({ mailbox: null });
    const res = await GET(request("GET", "https://kebu.test/api/mail/forwarding?mailboxId=" + mailboxId));
    expect(res.status).toBe(403);
  });

  it("POST creates a forwarding rule for an owned mailbox", async () => {
    setup();
    const res = await POST(request("POST", "https://kebu.test/api/mail/forwarding", { mailboxId, forwardToAddress: "fwd@example.com" }));
    expect(res.status).toBe(201);
    expect((await res.json()).rule.forward_to_address).toBe("fwd@example.com");
  });

  it("POST rejects a mailbox forwarding to itself", async () => {
    setup();
    const res = await POST(request("POST", "https://kebu.test/api/mail/forwarding", { mailboxId, forwardToAddress: "ME@KEBU.AFRICA" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/cannot forward to itself/i);
  });

  it("POST rejects an invalid email", async () => {
    setup();
    const res = await POST(request("POST", "https://kebu.test/api/mail/forwarding", { mailboxId, forwardToAddress: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("PATCH toggles an existing rule inactive", async () => {
    setup();
    const res = await PATCH(request("PATCH", "https://kebu.test/api/mail/forwarding", { mailboxId, isActive: false }));
    expect(res.status).toBe(200);
    expect((await res.json()).rule.is_active).toBe(false);
  });

  it("PATCH 404s when there is no rule to toggle", async () => {
    setup({ updateResult: { data: null, error: { message: "no rows" } } });
    const res = await PATCH(request("PATCH", "https://kebu.test/api/mail/forwarding", { mailboxId, isActive: true }));
    expect(res.status).toBe(404);
  });

  it("DELETE removes the rule and records an audit event", async () => {
    const { auditInsert } = setup();
    const res = await DELETE(request("DELETE", "https://kebu.test/api/mail/forwarding?mailboxId=" + mailboxId));
    expect(res.status).toBe(200);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ event_type: "mail.forwarding_removed" }));
  });

  it("a business employee without manage access is rejected", async () => {
    setup({ mailbox: null });
    const res = await POST(request("POST", "https://kebu.test/api/mail/forwarding", { mailboxId, forwardToAddress: "fwd@example.com" }));
    expect(res.status).toBe(403);
  });
});
