import { describe, expect, it } from "vitest";
import { canManageRetailLocations, locationInput } from "@/lib/yanmay/retail-locations";

describe("retail locations", () => {
  const store = { code: " harlem-01 ", name: "Harlem", address: "QA address", timezone: "America/New_York" };

  it("normalizes the store code", () => {
    expect(locationInput.parse(store).code).toBe("HARLEM-01");
  });

  it.each(["+05:00", "New York", ""])("rejects invalid time zone %s", (timezone) => {
    expect(locationInput.safeParse({ ...store, timezone }).success).toBe(false);
  });

  it.each(["founder", "administrator", "store_manager"])("admits %s", (role) => {
    expect(canManageRetailLocations(role)).toBe(true);
  });

  it.each(["creative", "employee", "viewer", null])("denies %s", (role) => {
    expect(canManageRetailLocations(role)).toBe(false);
  });
});
