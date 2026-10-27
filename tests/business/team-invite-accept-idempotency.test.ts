import { describe, expect, it } from "vitest";
import { acceptBusinessInvite } from "@/lib/business/team-invites";

/**
 * Proves the fix for the real race team-invite-accept-race.native.local.test.ts
 * reproduces at the database layer: business_members(business_id, user_id)'s
 * existing unique constraint correctly rejects a concurrent second INSERT
 * with 23505 when two near-simultaneous accept calls for the same brand-new
 * invite both read "no existing member." Before the fix, acceptBusinessInvite
 * surfaced that 23505 as a raw 500 to whichever request lost the race, unlike
 * every other unique-violation call site in this codebase (lib/afrique-id/
 * ensure-afrique-id.ts, lib/kebu-id/create-registration.ts, several
 * app/api/mail/* routes), which all treat 23505 as the already-done case.
 * This exercises the real exported acceptBusinessInvite function against a
 * minimal fake client shaped exactly like the chain it calls -- not a
 * reimplementation of its logic.
 */

type Chain = {
  select: (cols: string) => Chain;
  eq: (col: string, val: unknown) => Chain;
  update: (payload: Record<string, unknown>) => Chain;
  insert: (payload: Record<string, unknown>) => Chain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  then: (resolve: (v: { data: unknown; error: unknown }) => void) => void;
};

function fakeClient(opts: {
  invite: Record<string, unknown>;
  existingMember: Record<string, unknown> | null;
  insertError: { code: string; message: string } | null;
}) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];

  function chain(table: string): Chain {
    let pendingOp = "";
    const resolved = (): { data: unknown; error: unknown } => {
      if (table === "business_invites" && pendingOp === "select") {
        return { data: opts.invite, error: null };
      }
      if (table === "business_members" && pendingOp === "select") {
        return { data: opts.existingMember, error: null };
      }
      if (table === "business_members" && pendingOp === "insert") {
        return { data: null, error: opts.insertError };
      }
      // business_invites update, business_audit_logs insert, any other write
      return { data: null, error: null };
    };
    const self: Chain = {
      select(cols) {
        pendingOp = "select";
        calls.push({ table, op: "select", args: [cols] });
        return self;
      },
      eq() {
        return self;
      },
      update(payload) {
        pendingOp = "update";
        calls.push({ table, op: "update", args: [payload] });
        return self;
      },
      insert(payload) {
        pendingOp = "insert";
        calls.push({ table, op: "insert", args: [payload] });
        return self;
      },
      async maybeSingle() {
        return resolved();
      },
      then(resolve) {
        resolve(resolved());
      },
    };
    return self;
  }

  return { from: (table: string) => chain(table), _calls: calls };
}

describe("acceptBusinessInvite — concurrent-accept idempotency", () => {
  const invite = {
    id: "inv-1",
    business_id: "biz-1",
    email: "worker@example.com",
    role: "employee",
    status: "pending",
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  };

  it("treats a 23505 on the membership insert as success, not a 500 — the real concurrent-accept race", async () => {
    const admin = fakeClient({
      invite,
      existingMember: null, // this request's SELECT ran before the other writer's INSERT committed
      insertError: { code: "23505", message: 'duplicate key value violates unique constraint "business_members_business_id_user_id_key"' },
    });

    // acceptBusinessInvite takes (userClient, adminClient, opts); only admin is read on this path.
    const result = await acceptBusinessInvite(admin as never, admin as never, {
      token: "tok-1",
      userId: "user-1",
      userEmail: invite.email,
    });

    expect(result).toEqual({ ok: true, businessId: invite.business_id, role: invite.role });
  });

  it("still surfaces a genuine, non-race insert error (e.g. role check) as a real failure", async () => {
    const admin = fakeClient({
      invite,
      existingMember: null,
      insertError: { code: "23514", message: 'new row for relation "business_members" violates check constraint "business_members_role_check"' },
    });

    const result = await acceptBusinessInvite(admin as never, admin as never, {
      token: "tok-1",
      userId: "user-1",
      userEmail: invite.email,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });
});
