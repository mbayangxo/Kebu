/**
 * Behavioral proof for the team-reply path added to lib/platform/help-requests.ts:
 * it actually calls the real mail send (mocked at the fetch boundary, the
 * same way tests/mail/provider.test.ts proves sendInternetMail itself), and
 * records email_sent honestly — true only when the send actually succeeded,
 * never faked.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createTeamHelpReply, createCustomerHelpReply } from "@/lib/platform/help-requests";

const ORIGINAL_KEY = process.env.RESEND_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = ORIGINAL_KEY;
});

type Row = Record<string, unknown>;

function makeMockSupabase(onInsert: (row: Row) => Row) {
  const api = {
    from(_table: string) {
      return {
        insert(row: Row) {
          return {
            select(_cols: string) {
              return {
                single: async () => ({ data: onInsert(row), error: null }),
              };
            },
          };
        },
        update(_row: Row) {
          return { eq: () => ({ in: async () => ({ data: null, error: null }) }) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return api;
}

describe("createTeamHelpReply", () => {
  it("sends a real email and records email_sent: true on success", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }),
    );
    const supabase = makeMockSupabase((row) => ({ id: "reply-1", ...row }));
    const result = await createTeamHelpReply(supabase, {
      helpRequestId: "req-1",
      authorName: "Kebu team",
      body: "We're looking into it.",
      recipientEmail: "customer@example.com",
      requestSubject: "Billing question",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emailSent).toBe(true);
    expect(result.reply.email_sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        body: expect.stringContaining("customer@example.com"),
      }),
    );
  });

  it("still records the reply, but honestly marks email_sent: false, when the provider isn't configured", async () => {
    delete process.env.RESEND_API_KEY;
    const supabase = makeMockSupabase((row) => ({ id: "reply-2", ...row }));
    const result = await createTeamHelpReply(supabase, {
      helpRequestId: "req-1",
      authorName: "Kebu team",
      body: "We're looking into it.",
      recipientEmail: "customer@example.com",
      requestSubject: "Billing question",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emailSent).toBe(false);
    expect(result.reply.email_sent).toBe(false);
  });
});

describe("createCustomerHelpReply", () => {
  it("inserts as author_type 'customer' tied to the real caller's id", async () => {
    let inserted: Row | null = null;
    const userScoped = {
      from(_table: string) {
        return {
          insert(row: Row) {
            inserted = row;
            return {
              select: () => ({ single: async () => ({ data: { id: "r1", ...row }, error: null }) }),
            };
          },
          update: () => ({ eq: () => ({ in: async () => ({ data: null, error: null }) }) }),
        };
      },
    } as unknown as SupabaseClient;

    const result = await createCustomerHelpReply(userScoped, {
      helpRequestId: "req-1",
      authorName: "A Customer",
      authorUserId: "user-123",
      body: "Still waiting",
    });
    expect(result.ok).toBe(true);
    expect(inserted).toMatchObject({ author_type: "customer", author_user_id: "user-123" });
  });
});
