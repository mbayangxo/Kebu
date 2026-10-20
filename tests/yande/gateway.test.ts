import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
const createServiceClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient }));

function messageWithText(text: string) {
  return { model: "claude-sonnet-5-5", content: [{ type: "text", text }], usage: { input_tokens: 5, output_tokens: 5 } };
}
function toolUseMessage(input: unknown) {
  return { model: "claude-sonnet-5-5", stop_reason: "tool_use", content: [{ type: "tool_use", name: "submit_result", input }], usage: { input_tokens: 5, output_tokens: 5 } };
}

function mockInsert() {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  createServiceClient.mockReturnValue({ from: () => ({ insert }) });
  return insert;
}

beforeEach(() => {
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = "test-key";
  createServiceClient.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
});

describe("yandeChat", () => {
  it("refuses to fake a reply when Yande is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { yandeChat } = await import("@/lib/yande/gateway");
    await expect(yandeChat({ feature: "chat_assistant", userId: null, systemPrompt: "Help.", userMessage: "Hi" }))
      .rejects.toThrow("Yande is not configured on this server yet (missing AI key).");
  });

  it("returns a real reply and records a successful interaction", async () => {
    const insert = mockInsert();
    const create = vi.fn().mockResolvedValue(messageWithText("Here is how to start."));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeChat } = await import("@/lib/yande/gateway");
    const result = await yandeChat({ feature: "chat_assistant", userId: "user-1", systemPrompt: "Help with Kebu.", userMessage: "How do I start?" });
    expect(result.reply).toBe("Here is how to start.");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ system: expect.stringContaining("You are Yande") }));
    expect(create.mock.calls[0][0].system).toContain("Help with Kebu.");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ feature: "chat_assistant", mode: "chat", outcome: "ok", user_id: "user-1" }));
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("records a failed interaction and surfaces the real error, never a fake reply", async () => {
    const insert = mockInsert();
    const create = vi.fn().mockRejectedValue(new Error("rate limited"));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeChat } = await import("@/lib/yande/gateway");
    await expect(yandeChat({ feature: "chat_assistant", userId: "user-1", systemPrompt: "Help.", userMessage: "Hi" })).rejects.toThrow("rate limited");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error", error_message: "rate limited" }));
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("honors a model/thinking override for callers tuned on a specific model, without being forced onto YANDE_MODEL", async () => {
    mockInsert();
    const create = vi.fn().mockResolvedValue(messageWithText("Structured site, as opus."));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeChat } = await import("@/lib/yande/gateway");
    await yandeChat({ feature: "builder_site_generate", userId: null, systemPrompt: "Design.", userMessage: "Build it.", model: "claude-opus-4-8", thinking: true, maxTokens: 8000 });
    expect(create.mock.calls[0][0]).toMatchObject({ model: "claude-opus-4-8", max_tokens: 8000, thinking: { type: "adaptive" } });
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("never lets a logging failure break the real response", async () => {
    createServiceClient.mockImplementation(() => { throw new Error("db down"); });
    const create = vi.fn().mockResolvedValue(messageWithText("Still works."));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeChat } = await import("@/lib/yande/gateway");
    const result = await yandeChat({ feature: "chat_assistant", userId: "user-1", systemPrompt: "Help.", userMessage: "Hi" });
    expect(result.reply).toBe("Still works.");
    vi.doUnmock("@anthropic-ai/sdk");
  });
});

describe("yandeStructured", () => {
  const schema = z.object({ summary: z.string() });

  it("forces tool-use and returns schema-validated output", async () => {
    mockInsert();
    const create = vi.fn().mockResolvedValue(toolUseMessage({ summary: "A real result." }));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeStructured } = await import("@/lib/yande/gateway");
    const result = await yandeStructured({ feature: "liguey_applicant_insight", userId: "user-1", systemPrompt: "Review.", schema, data: { a: 1 } });
    expect(result.output).toEqual({ summary: "A real result." });
    expect(create.mock.calls[0][0].tool_choice).toEqual({ type: "tool", name: "submit_result" });
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("fails closed when the model does not use the tool", async () => {
    mockInsert();
    const create = vi.fn().mockResolvedValue({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "no" }], usage: { input_tokens: 1, output_tokens: 1 } });
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeStructured } = await import("@/lib/yande/gateway");
    await expect(yandeStructured({ feature: "liguey_applicant_insight", userId: null, systemPrompt: "Review.", schema, data: {} })).rejects.toThrow("did not complete a structured result");
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("fails closed when the tool input does not match the schema, without fabricating a fallback", async () => {
    mockInsert();
    const create = vi.fn().mockResolvedValue(toolUseMessage({ wrongField: 1 }));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeStructured } = await import("@/lib/yande/gateway");
    await expect(yandeStructured({ feature: "liguey_applicant_insight", userId: null, systemPrompt: "Review.", schema, data: {} })).rejects.toThrow();
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("rejects an oversized input before ever calling the model", async () => {
    mockInsert();
    const create = vi.fn();
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    const { yandeStructured } = await import("@/lib/yande/gateway");
    const huge = { blob: "x".repeat(70_000) };
    await expect(yandeStructured({ feature: "liguey_applicant_insight", userId: null, systemPrompt: "Review.", schema, data: huge })).rejects.toThrow(/too large/);
    expect(create).not.toHaveBeenCalled();
    vi.doUnmock("@anthropic-ai/sdk");
  });
});
