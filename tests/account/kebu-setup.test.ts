import { describe, expect, it } from "vitest";
import {
  DEFAULT_KEBU_SETUP,
  KEBU_TOOLS,
  parseKebuSetup,
  recommendedToolsForIntents,
} from "@/lib/account/kebu-setup";

describe("Kebu ecosystem setup", () => {
  it("falls back safely when persisted setup is malformed", () => {
    expect(parseKebuSetup({ nope: true })).toEqual(DEFAULT_KEBU_SETUP);
  });

  it("recommends a connected work suite for organizing", () => {
    const tools = recommendedToolsForIntents(["organize"]);
    expect(tools).toEqual(expect.arrayContaining(["spaces", "library", "docs", "tasks", "calendar", "chat"]));
  });

  it("keeps every registered tool addressable by setup", () => {
    const ids = new Set(KEBU_TOOLS.map((tool) => tool.id));
    expect(ids.has("chat")).toBe(true);
    expect(ids.has("people")).toBe(true);
    expect(ids.has("calendar")).toBe(true);
    expect(ids.has("sites")).toBe(true);
  });
});
