import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendInternetMail } from "@/lib/mail/provider";
import { registerMailDomain, verifyMailDomain, getMailDomain } from "@/lib/mail/provider-domains";

const ORIGINAL_KEY = process.env.RESEND_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = ORIGINAL_KEY;
});

describe("sendInternetMail", () => {
  it("refuses to fake success when the provider is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendInternetMail({ from: "a@kebu.africa", to: ["b@example.com"], subject: "Hi", text: "Hi" });
    expect(result).toEqual({ ok: false, provider: "resend", reason: "Internet mail provider is not configured.", retryable: false });
  });

  it("calls the real Resend API and returns the provider message id on success", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_123" }), { status: 200 }),
    );
    const result = await sendInternetMail({ from: "a@kebu.africa", to: ["b@example.com"], subject: "Hi", text: "Hi" });
    expect(result).toEqual({ ok: true, provider: "resend", providerMessageId: "msg_123" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer test-key" }) }),
    );
  });

  it("marks a 5xx provider response as retryable", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "down" }), { status: 503 }));
    const result = await sendInternetMail({ from: "a@kebu.africa", to: ["b@example.com"], subject: "Hi", text: "Hi" });
    expect(result).toEqual({ ok: false, provider: "resend", reason: "down", retryable: true });
  });

  it("marks a 4xx validation rejection as non-retryable", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "invalid from" }), { status: 422 }));
    const result = await sendInternetMail({ from: "a@kebu.africa", to: ["b@example.com"], subject: "Hi", text: "Hi" });
    expect(result).toEqual({ ok: false, provider: "resend", reason: "invalid from", retryable: false });
  });

  it("treats a network error as retryable", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNRESET"));
    const result = await sendInternetMail({ from: "a@kebu.africa", to: ["b@example.com"], subject: "Hi", text: "Hi" });
    expect(result).toEqual({ ok: false, provider: "resend", reason: "Mail provider network error.", retryable: true });
  });
});

describe("mail domain provider calls (Resend domains API)", () => {
  beforeEach(() => { process.env.RESEND_API_KEY = "test-key"; });

  it("registerMailDomain posts to /domains and returns the real DNS record set", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "dom_1", name: "mayabeauty.com", status: "pending", records: [{ type: "TXT", name: "@", value: "v=spf1" }] }), { status: 200 }),
    );
    const result = await registerMailDomain("mayabeauty.com");
    expect(result).toEqual({ id: "dom_1", name: "mayabeauty.com", status: "pending", records: [{ type: "TXT", name: "@", value: "v=spf1" }] });
    expect(fetchSpy).toHaveBeenCalledWith("https://api.resend.com/domains", expect.objectContaining({ method: "POST" }));
  });

  it("verifyMailDomain posts to /domains/:id/verify then re-fetches the domain", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "dom_1", name: "mayabeauty.com", status: "verified", records: [] }), { status: 200 }));
    const result = await verifyMailDomain("dom_1");
    expect(result.status).toBe("verified");
    expect(fetchSpy).toHaveBeenNthCalledWith(1, "https://api.resend.com/domains/dom_1/verify", expect.objectContaining({ method: "POST" }));
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "https://api.resend.com/domains/dom_1", expect.anything());
  });

  it("surfaces the provider's real rejection message rather than swallowing it", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "Domain already exists" }), { status: 409 }));
    await expect(registerMailDomain("taken.com")).rejects.toThrow("Domain already exists");
  });

  it("throws rather than silently succeeding when no API key is configured", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(getMailDomain("dom_1")).rejects.toThrow("Mail domain provider is not configured.");
  });
});
