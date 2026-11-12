import { describe, expect, it } from "vitest";
import { acceptBusinessInvite } from "@/lib/business/team-invites";

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
  winner?: Record<string, unknown>;
  insertError: { code: string; message: string } | null;
}) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];

  let reads = 0;
  function chain(table: string): Chain {
    let pendingOp = "";
    const resolved = (): { data: unknown; error: unknown } => {
      if (table === "business_invites" && pendingOp === "select") {
        return { data: opts.invite, error: null };
      }
      if (table === "business_members" && pendingOp === "select") {
        return { data: ++reads === 1 ? opts.existingMember : opts.winner ?? null, error: null };
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
      existingMember: null,
      winner: { id: "member-1", status: "active", role: invite.role },
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
  it("does not accept a uniqueness failure without an active membership for this account", async () => {
    const admin = fakeClient({ invite, existingMember: null, insertError: { code: "23505", message: "duplicate" } });
    const result = await acceptBusinessInvite(admin as never, admin as never, {
      token: "tok-1", userId: "user-1", userEmail: invite.email,
    });
    expect(result.ok).toBe(false);
    expect(admin._calls.some(call => call.op === "update")).toBe(false);
  });

  it("denies a different account without reading or writing memberships", async () => {
    const admin = fakeClient({ invite, existingMember: null, insertError: null });
    const result = await acceptBusinessInvite(admin as never, admin as never, {
      token: "tok-1", userId: "other", userEmail: "other@example.com",
    });
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(admin._calls).toEqual([{ table: "business_invites", op: "select", args: [expect.any(String)] }]);
  });

  it("returns the stored role without changing an existing active membership", async () => {
    const admin = fakeClient({
      invite, existingMember: { id: "member-1", status: "active", role: "manager" }, insertError: null,
    });
    const result = await acceptBusinessInvite(admin as never, admin as never, {
      token: "tok-1", userId: "user-1", userEmail: invite.email,
    });
    expect(result).toEqual({ ok: true, businessId: invite.business_id, role: "manager" });
    expect(admin._calls.filter(call => call.table === "business_members").map(call => call.op)).toEqual(["select"]);
  });

});
