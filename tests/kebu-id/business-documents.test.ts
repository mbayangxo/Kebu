import { describe, expect, it } from "vitest";
import {
  documentsComplete,
  sanitizeFileName,
  REQUIRED_REGISTRATION_DOCUMENT_TYPES,
} from "@/lib/kebu-id/business-documents";

describe("business documents", () => {
  it("sanitizes file names", () => {
    expect(sanitizeFileName("my id (1).pdf")).toBe("my_id__1_.pdf");
  });

  it("requires founder_id and business_plan", () => {
    expect(documentsComplete(["founder_id"])).toBe(false);
    expect(documentsComplete(["founder_id", "business_plan"])).toBe(true);
    expect(REQUIRED_REGISTRATION_DOCUMENT_TYPES).toHaveLength(2);
  });
});
