import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStructuredSiteFromBrief, generateWebsiteWithAi } from "@/lib/create/ai-generate";
import { createWebsiteBriefSchema } from "@/lib/create/website-schema";
import { generateStudioCampaignWithAi, studioGenerateBriefSchema } from "@/lib/studio/ai-generate";
import { canvasDocumentSchema } from "@/lib/studio/canvas-document";

vi.mock("server-only", () => ({}));
const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/lib/opportunity/admin", () => ({
  createServiceClient: () => ({ from: (table: string) => {
    if (table !== "yande_interactions") throw new Error("Unexpected privileged table");
    return { insert };
  } }),
}));

// Real installed SDK and HTTP transport, with explicitly local provider replies.
// Usage storage is a recording fixture; this is not merchant/provider or hosted DB acceptance.
type ProviderReply = { text: string; stop?: string | null; status?: number };
type ProviderRequest = { model: string; system: string; thinking?: unknown; messages: { role: string; content: string }[] };
const requests: ProviderRequest[] = [];
const replies: ProviderReply[] = [];
let origin: string;
const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  requests.push(JSON.parse(Buffer.concat(chunks).toString()) as ProviderRequest);
  const reply = replies.shift();
  if (!reply || req.url !== "/v1/messages") {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "Missing isolated provider reply" } }));
    return;
  }
  res.writeHead(reply.status ?? 200, { "Content-Type": "application/json", "request-id": "local-generation-fixture" });
  res.end(JSON.stringify(reply.status ? { type: "error", error: { type: "api_error", message: "isolated provider diagnostic" } } : {
    id: "msg_local_fixture", type: "message", role: "assistant", model: requests.at(-1)!.model,
    content: [{ type: "text", text: reply.text }], stop_reason: reply.stop === undefined ? "end_turn" : reply.stop,
    stop_sequence: null, usage: { input_tokens: 17, output_tokens: 29 },
  }));
});
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
beforeEach(() => {
  requests.length = 0; replies.length = 0;
  insert.mockReset().mockResolvedValue({ error: null });
  vi.stubEnv("ANTHROPIC_API_KEY", "isolated-not-a-real-key");
  vi.stubEnv("ANTHROPIC_BASE_URL", origin);
  vi.stubEnv("KEBU_WEBSITE_AI_MODEL", "test-authorized-builder-model");
});
afterEach(() => vi.unstubAllEnvs());
const brief = () => createWebsiteBriefSchema.parse({ mode: "ai", businessName: "Test artist", category: "music", countryCode: "SN", locale: "en", description: "Artist portfolio using only supplied facts and approved photographs.", desiredPages: ["home", "music", "videos"] });
const studioBrief = () => studioGenerateBriefSchema.parse({ prompt: "Create a campaign for my Dakar skincare launch", businessName: "Test brand" });
const packText = JSON.stringify({ designs: [{ title: "Launch", designType: "instagram_post", headline: "Our launch", businessName: "Test brand" }] });

describe("Builder and Studio through the shared Yande transport", () => {
  it("sends the actual Builder request and records its authenticated owner", async () => {
    replies.push({ text: JSON.stringify(buildStructuredSiteFromBrief(brief())) });
    const result = await generateWebsiteWithAi(brief(), "authenticated-owner");
    expect(result).toMatchObject({ ok: true, usedAi: true, repaired: false });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ model: "test-authorized-builder-model", thinking: { type: "adaptive" } });
    expect(requests[0].system).toContain("one Kebu AI system");
    expect(requests[0].system).toContain("never as visitor-facing copy");
    expect(requests[0].messages[0].content).toContain("home, music, videos");
    expect(insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ user_id: "authenticated-owner", feature: "builder_website_generate", model: "test-authorized-builder-model", outcome: "ok", input_tokens: 17, output_tokens: 29 }));
  });

  it("preserves page validation and records both real requests in a repair attempt", async () => {
    const partial = buildStructuredSiteFromBrief(brief());
    partial.pages = partial.pages.filter(page => page.slug !== "videos");
    replies.push({ text: JSON.stringify(partial) }, { text: JSON.stringify(partial) });
    expect(await generateWebsiteWithAi(brief(), "owner")).toMatchObject({ ok: false, code: "AI_GENERATION_FAILED", status: 502 });
    expect(requests).toHaveLength(2);
    expect(requests[1].messages[0].content).toContain("Missing requested pages: videos");
    expect(insert).toHaveBeenCalledTimes(2);
    for (const [entry] of insert.mock.calls) expect(entry.user_id).toBe("owner");
  });

  it.each(["max_tokens", "model_context_window_exceeded", "refusal", "pause_turn", "tool_use", null])("rejects unfinished Builder assets even with valid JSON: %s", async stop => {
    replies.push({ text: JSON.stringify(buildStructuredSiteFromBrief(brief())), stop });
    const result = await generateWebsiteWithAi(brief(), "owner");
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(result).not.toHaveProperty("definition");
    expect(requests).toHaveLength(1);
    expect(insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ user_id: "owner", outcome: "error", input_tokens: 17, output_tokens: 29 }));
  });

  it("does not retry provider failure or expose its diagnostics to the buyer", async () => {
    replies.push({ status: 500, text: "" });
    const result = await generateWebsiteWithAi(brief(), "owner");
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(JSON.stringify(result)).not.toContain("isolated provider diagnostic");
    expect(requests).toHaveLength(1);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error", user_id: "owner" }));
  });

  it("keeps missing credentials honest without making an HTTP request", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "   ");
    expect(await generateWebsiteWithAi(brief(), "owner")).toMatchObject({ ok: false, status: 503, code: "AI_UNAVAILABLE" });
    expect(requests).toHaveLength(0); expect(insert).not.toHaveBeenCalled();
  });

  it("generates schema-valid editable Studio canvases and records the same owner", async () => {
    replies.push({ text: packText });
    const result = await generateStudioCampaignWithAi(studioBrief(), "studio-owner");
    expect(result).toMatchObject({ ok: true, usedAi: true });
    if (!result.ok) throw new Error(result.error);
    for (const design of result.designs) expect(canvasDocumentSchema.safeParse(design.canvas).success).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0].model).toBe("claude-sonnet-5-5");
    expect(requests[0].system).toContain("one Kebu AI system");
    expect(requests[0].messages).toHaveLength(1);
    expect(insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ user_id: "studio-owner", feature: "studio_campaign_generate", outcome: "ok" }));
  });

  it("never calls a truncated Studio pack an AI success", async () => {
    replies.push({ text: packText, stop: "max_tokens" });
    expect(await generateStudioCampaignWithAi(studioBrief(), "studio-owner")).toMatchObject({ ok: true, usedAi: false, fallback: true });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "studio-owner", outcome: "error", output_tokens: 29 }));
  });

  it("keeps the explicitly labelled local Studio engine available without credentials", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", " ");
    expect(await generateStudioCampaignWithAi(studioBrief(), "studio-owner")).toMatchObject({ ok: true, usedAi: false, fallback: true });
    expect(requests).toHaveLength(0); expect(insert).not.toHaveBeenCalled();
  });

  it("keeps the generated asset usable when usage logging is unavailable", async () => {
    insert.mockRejectedValueOnce(new Error("isolated database unavailable"));
    replies.push({ text: JSON.stringify(buildStructuredSiteFromBrief(brief())) });
    expect(await generateWebsiteWithAi(brief(), "owner")).toMatchObject({ ok: true, usedAi: true });
    expect(requests).toHaveLength(1);
  });
});
