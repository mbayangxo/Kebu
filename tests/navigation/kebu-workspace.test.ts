import { describe, expect, it } from "vitest";
import {
  inferWorkspaceFromPath,
  isKebuWorkspace,
  workspaceHome,
  workspaceLabel,
} from "@/lib/navigation/kebu-workspace";

describe("kebu-workspace", () => {
  it("recognizes workspace ids", () => {
    expect(isKebuWorkspace("kebu")).toBe(true);
    expect(isKebuWorkspace("business")).toBe(true);
    expect(isKebuWorkspace("studio")).toBe(true);
    expect(isKebuWorkspace("cloud")).toBe(false);
  });

  it("maps workspace to home routes", () => {
    expect(workspaceHome("kebu")).toBe("/dashboard");
    expect(workspaceHome("business")).toBe("/business");
    expect(workspaceHome("studio")).toBe("/studio");
  });

  it("infers workspace from deep links", () => {
    expect(inferWorkspaceFromPath("/create/sites")).toBe("business");
    expect(inferWorkspaceFromPath("/b2b")).toBe("business");
    expect(inferWorkspaceFromPath("/studio/new")).toBe("studio");
    expect(inferWorkspaceFromPath("/opportunity/countries")).toBe("kebu");
    expect(inferWorkspaceFromPath("/pricing")).toBeNull();
  });

  it("labels workspaces for sidebar", () => {
    expect(workspaceLabel("kebu")).toBe("Explore");
    expect(workspaceLabel("business")).toBe("Business");
    expect(workspaceLabel("studio")).toBe("Studio");
  });
});
