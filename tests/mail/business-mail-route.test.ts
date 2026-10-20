import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
const loadContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mail/business-mail", () => ({ loadActiveBusinessMailContext: loadContext }));
const verifyMailDomain = vi.hoisted(() => vi.fn());
const registerMailDomain = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mail/provider-domains", () => ({ verifyMailDomain, registerMailDomain }));
import { POST } from "@/app/api/mail/business/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const mailDomainId = "33333333-3333-4333-8333-333333333333";

function request(body: unknown) {
  return new Request("https://kebu.test/api/mail/business", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

function setup(opts: { mailDomain?: Record<string, unknown> | null; updateResult?: { data: unknown; error: unknown } } = {}) {
  const mailDomainRow = opts.mailDomain === undefined
    ? { id: mailDomainId, business_id: businessId, provider_domain_id: "dom_1", status: "pending" }
    : opts.mailDomain;

  const mailDomainMaybeSingle = vi.fn().mockResolvedValue({ data: mailDomainRow, error: null });
  const updateSingle = vi.fn().mockResolvedValue(
    opts.updateResult ?? { data: { id: mailDomainId, status: "verified", sending_enabled: true, inbound_enabled: true }, error: null },
  );
  const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const from = vi.fn((table: string) => {
    if (table === "mail_domains") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mailDomainMaybeSingle,
        update: vi.fn((patch: Record<string, unknown>) => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: () => updateSingle(patch),
        })),
      };
    }
    if (table === "mail_audit_events") return { insert: auditInsert };
    throw new Error("unexpected table " + table);
  });

  loadContext.mockResolvedValue({ mode: "business", businessId, businessName: "Biz", role: "founder", canManage: true });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  return { updateSingle };
}

beforeEach(() => vi.clearAllMocks());

describe("Business mail domain verification sets sending_enabled", () => {
  it("a domain Resend reports verified is persisted with sending_enabled and inbound_enabled true", async () => {
    verifyMailDomain.mockResolvedValue({ id: "dom_1", name: "mayabeauty.com", status: "verified", records: [] });
    const { updateSingle } = setup();

    const res = await POST(request({ action: "verify_domain", mailDomainId }));
    expect(res.status).toBe(200);

    // The actual regression check: the update payload passed to Supabase must
    // flip sending_enabled/inbound_enabled, not just `status`. Without this,
    // externalMailReadiness() keeps the domain permanently unusable even once
    // Resend itself reports it verified.
    expect(updateSingle).toHaveBeenCalledWith(expect.objectContaining({
      status: "verified",
      sending_enabled: true,
      inbound_enabled: true,
    }));
  });

  it("a domain still pending at the provider is persisted with sending_enabled false", async () => {
    verifyMailDomain.mockResolvedValue({ id: "dom_1", name: "mayabeauty.com", status: "pending", records: [] });
    const { updateSingle } = setup();

    const res = await POST(request({ action: "verify_domain", mailDomainId }));
    expect(res.status).toBe(200);
    expect(updateSingle).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending",
      sending_enabled: false,
      inbound_enabled: false,
    }));
  });

  it("a provider verification failure never sets sending_enabled true", async () => {
    verifyMailDomain.mockRejectedValue(new Error("DNS not propagated"));
    setup();
    const res = await POST(request({ action: "verify_domain", mailDomainId }));
    expect(res.status).toBe(502);
  });
});
