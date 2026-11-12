import { describe, expect, it, vi } from "vitest";
import { dropNativeFixtureDatabase } from "./native-postgres-cleanup";
describe("native test database deletion boundary", () => {
  it.each(["postgres", "Kebu", "_kebutest_publish_bad", "_kebutest_other_" + "a".repeat(32), '_kebutest_publish_";drop database postgres;--'])("rejects unsafe database identity %s before any query", async database => {
    const query = vi.fn();
    await expect(dropNativeFixtureDatabase({ query }, database)).rejects.toThrow("outside the generated native fixture namespace");
    expect(query).not.toHaveBeenCalled();
  });
});
