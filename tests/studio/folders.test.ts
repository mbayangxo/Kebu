import { describe, expect, it } from "vitest";
import {
  countDesignsByFolder,
  createStudioFolderSchema,
  designsInFolderView,
  normalizeFolderName,
} from "@/lib/studio/folders";

describe("Studio folders (S17)", () => {
  it("validates and normalizes folder names", () => {
    expect(createStudioFolderSchema.parse({ name: "  Campaigns  " }).name).toBe("Campaigns");
    expect(normalizeFolderName("  Reach   ads ")).toBe("Reach ads");
    expect(() => createStudioFolderSchema.parse({ name: "" })).toThrow();
  });

  it("filters designs by folder view", () => {
    const rows = [
      { id: "1", folder_id: null },
      { id: "2", folder_id: "f1" },
      { id: "3", folder_id: "f1" },
      { id: "4", folder_id: "f2" },
    ];
    expect(designsInFolderView(rows, "all")).toHaveLength(4);
    expect(designsInFolderView(rows, "unfiled").map((d) => d.id)).toEqual(["1"]);
    expect(designsInFolderView(rows, "f1").map((d) => d.id)).toEqual(["2", "3"]);
    const counts = countDesignsByFolder(rows);
    expect(counts.get(null)).toBe(1);
    expect(counts.get("f1")).toBe(2);
  });
});
