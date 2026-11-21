import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import JSZip from "jszip";
import { documentWordBytes } from "@/lib/kebu-code/document-export";

const mocks = vi.hoisted(() => ({ client: vi.fn(), generate: vi.fn(), available: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/api-guard", () => ({ aiRateLimit: () => null }));
vi.mock("@/lib/yande/gateway", () => ({ yandeConfigured: mocks.available, yandeStructured: mocks.generate }));
import { POST } from "@/app/api/code/documents/route";

const id = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const saved = { id, title: "Wholesale proposal", content: "# Existing", revision: 2, history: [{ revision: 1, content: "" }], updated_at: "2026-11-21" };
function setup({ user = { id: owner } as object | null, row = saved as typeof saved | null, raced = false } = {}) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: saved }),
    maybeSingle: vi.fn().mockResolvedValueOnce({ data: row })
      .mockResolvedValueOnce({ data: raced ? null : { ...saved, revision: 3 } }),
  };
  mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user } }) }, from: () => query });
  return query;
}
const action = (body: unknown, origin = "https://kebu.test") => POST(new NextRequest("https://kebu.test/api/code/documents", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
}));
const draft = { action: "draft", id, base: 2, brief: "Write a proposal", references: [{ name: "prices.csv", text: "Item,Price\nCoffee,12" }] };
beforeEach(() => { vi.resetAllMocks(); mocks.available.mockReturnValue(true); });

it("keeps provider output unsaved and passes supplied evidence and the saved revision", async () => {
  const q = setup();
  mocks.generate.mockResolvedValue({ output: { content: "# Proposal\nCoffee: 12", missing: ["Confirm delivery."] } });
  const response = await action(draft);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ base: 2, content: "# Proposal\nCoffee: 12", missing: ["Confirm delivery."] });
  expect(q.eq).toHaveBeenCalledWith("owner_id", owner);
  expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ references: draft.references, currentDocument: saved.content }),
  }));
  expect(q.update).not.toHaveBeenCalled();
});
it("protects ownership, origin, anonymous sessions and validates references before model access", async () => {
  setup({ user: null }); expect((await action(draft)).status).toBe(401);
  setup({ user: { id: owner, is_anonymous: true } }); expect((await action(draft)).status).toBe(401);
  setup({ row: null }); expect((await action(draft)).status).toBe(404);
  expect((await action(draft, "https://other.test")).status).toBe(403);
  setup(); expect((await action({ ...draft, references: [{ name: "prices.pdf", text: "test" }] })).status).toBe(400);
  expect((await action({ ...draft, references: [{ name: "prices.csv", text: "é".repeat(4001) }] })).status).toBe(400);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("reports provider failure without saving; manual editing remains available", async () => {
  const q = setup(); mocks.generate.mockRejectedValue(new Error("unavailable"));
  expect((await action(draft)).status).toBe(502);
  expect(q.update).not.toHaveBeenCalled();
  mocks.available.mockReturnValue(false);
  const write = setup();
  expect((await action({ action: "save", id, base: 2, content: "# Manual" })).status).toBe(200);
  expect(write.update).toHaveBeenCalledWith(expect.objectContaining({ content: "# Manual", revision: 3,
    history: [{ revision: 2, content: saved.content }, ...saved.history] }));
});
it("will not overwrite a concurrent edit or delete a newer copy", async () => {
  const q = setup({ raced: true });
  expect((await action({ action: "save", id, base: 2, content: "Edited" })).status).toBe(409);
  expect(q.eq).toHaveBeenCalledWith("revision", 2);
  const removing = setup({ raced: true });
  expect((await action({ action: "delete", id, base: 2 })).status).toBe(409);
  expect(removing.eq).toHaveBeenCalledWith("revision", 2);
  const restoring = setup();
  expect((await action({ action: "restore", id, base: 2, target: 1 })).status).toBe(200);
  expect(restoring.update).toHaveBeenCalledWith(expect.objectContaining({ content: "" }));
});
it("exports editable text in a Word package without interpreting markup as active content", async () => {
  const zip = await JSZip.loadAsync(await documentWordBytes("# Wholesale\nA & B\n<external>\n- Coffee"));
  expect(Object.keys(zip.files)).toContain("_rels/.rels");
  const document = await zip.file("word/document.xml")!.async("string");
  expect(document).toContain("<w:b/>");
  expect(document).toContain("A &amp; B");
  expect(document).toContain("&lt;external&gt;");
  expect(document).not.toContain("<external>");
  expect(document).toContain("• Coffee");
});
