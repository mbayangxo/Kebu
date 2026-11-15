import { beforeEach, expect, it, vi } from "vitest";
import { createBusinessInvite } from "@/lib/business/team-invites";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

vi.mock("@/lib/email/send-campaign", () => ({ sendCampaignEmail: vi.fn() }));
vi.mock("@/lib/business/assert-manager", () => ({ appBaseUrl: () => "https://kebu.test" }));

beforeEach(() => vi.mocked(sendCampaignEmail).mockReset().mockResolvedValue(true));

it("renders an untrusted business name as text while preserving the real acceptance link", async () => {
  const chain = {
    select() { return this; }, eq() { return this; }, ilike() { return this; },
    limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    insert() { return this; },
    single: async () => ({ data: { id: "invite", token: "safe-token" }, error: null }),
  };
  const businessName = 'May & Co</strong><a href="https://evil.test">Sign in here</a>';
  const result = await createBusinessInvite({ from: () => chain } as never, {
    businessId: "business", email: "may@example.test", role: "employee",
    invitedBy: "owner", businessName,
  });
  expect(result).toMatchObject({ ok: true, emailed: true });
  const email = vi.mocked(sendCampaignEmail).mock.calls[0][0];
  expect(email.html).not.toContain('<a href="https://evil.test">');
  expect(email.html).toContain('May &amp; Co&lt;/strong&gt;&lt;a href=&quot;https://evil.test&quot;&gt;Sign in here&lt;/a&gt;');
  expect(email.html).toContain('<a href="https://kebu.test/invite/safe-token">Accept invite</a>');
  expect(email.text).toContain(businessName);
});
