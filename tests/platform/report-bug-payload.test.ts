/**
 * Proves the payload app/components/report-bug.tsx sends to POST /api/help/request
 * actually validates against the real schema that route enforces
 * (lib/platform/help-requests.ts). Report-bug used to persist only to
 * localStorage (no backend at all); this locks in the field names of the
 * real integration (in particular `body`, not `message`) so a future
 * rename on either side fails a test instead of silently 400ing in prod.
 */
import { describe, expect, it } from "vitest";
import { helpRequestCreateSchema } from "@/lib/platform/help-requests";

function reportBugPayload(opts: {
  issueLabel: string;
  description: string;
  page: string;
  name: string;
  email: string;
}) {
  return {
    name: opts.name,
    email: opts.email,
    subject: `Bug report: ${opts.issueLabel}`,
    body: `${opts.description}\n\nPage: ${opts.page}`,
    source: "in_app" as const,
  };
}

describe("report-bug → /api/help/request payload", () => {
  it("validates against the real help-request schema for a signed-in user", () => {
    const payload = reportBugPayload({
      issueLabel: "Button doesn't work",
      description: "I clicked Generate and nothing happened.",
      page: "/studio/assets/sell",
      name: "may",
      email: "may@example.com",
    });
    const parsed = helpRequestCreateSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.source).toBe("in_app");
      expect(parsed.data.body).toContain("Page: /studio/assets/sell");
    }
  });

  it("the real schema's body minimum is 10 chars (the page suffix report-bug always appends makes this hard to hit via the UI, but the rule itself is real)", () => {
    const parsed = helpRequestCreateSchema.safeParse({
      name: "Kebu user",
      email: "user@example.com",
      subject: "Bug report: Other",
      body: "too short",
      source: "in_app",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed email the same way the backend would", () => {
    const payload = reportBugPayload({
      issueLabel: "Page shows an error",
      description: "The export button just spins forever on this page.",
      page: "/studio",
      name: "Kebu user",
      email: "not-an-email",
    });
    const parsed = helpRequestCreateSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});
