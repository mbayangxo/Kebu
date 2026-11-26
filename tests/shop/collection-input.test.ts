import { describe, expect, it } from "vitest";
import { collectionPatchSchema, collectionSchema } from "@/lib/shop/product-collections";

describe("shop collection input", () => {
  it("preserves omitted fields on a partial update", () => {
    expect(collectionPatchSchema.parse({ name: "Fruit" })).toEqual({ name: "Fruit" });
    expect(collectionPatchSchema.parse({ isActive: false, productIds: [] })).toEqual({
      isActive: false,
      productIds: [],
    });
  });

  it("sets content and visibility defaults when creating a collection", () => {
    expect(collectionSchema.parse({ name: " Fruit " })).toEqual({
      name: "Fruit",
      description: "",
      imageUrl: "",
      isActive: true,
    });
  });
});
