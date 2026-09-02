import { describe, expect, it } from "vitest";
import { displayFirstName } from "@/lib/account/user-profile";

describe("displayFirstName", () => {
  it("uses first token of full name", () => {
    expect(displayFirstName("Aminata Diallo", "a@x.com")).toBe("Aminata");
  });

  it("falls back to email local part", () => {
    expect(displayFirstName(null, "goldendaffodilxo@gmail.com")).toBe("goldendaffodilxo");
  });

  it("uses there when empty", () => {
    expect(displayFirstName("", null)).toBe("there");
  });
});
