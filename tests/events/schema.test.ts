import { describe, expect, it } from "vitest";
import { createBusinessEventSchema, eventRegisterSchema, newEventPublicId } from "@/lib/events/schema";

describe("business events schema", () => {
  it("accepts RSVP event create payload", () => {
    const parsed = createBusinessEventSchema.safeParse({
      title: "DkLNS listening night",
      startsAt: "2026-10-01T20:00:00.000Z",
      mode: "rsvp",
      city: "Dakar",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts ticketed event with tickets", () => {
    const parsed = createBusinessEventSchema.safeParse({
      title: "May Lecor showcase",
      startsAt: "2026-11-01T19:00:00.000Z",
      mode: "ticketed",
      tickets: [{ name: "Door", priceXof: 5000 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.tickets).toHaveLength(1);
  });

  it("validates public registration", () => {
    const ok = eventRegisterSchema.safeParse({
      guestName: "Awa",
      guestPhone: "+221770000000",
      quantity: 2,
    });
    expect(ok.success).toBe(true);
    const bad = eventRegisterSchema.safeParse({ guestName: "", guestPhone: "1" });
    expect(bad.success).toBe(false);
  });

  it("generates opaque public ids", () => {
    const a = newEventPublicId();
    const b = newEventPublicId();
    expect(a.startsWith("evt_")).toBe(true);
    expect(a).not.toBe(b);
  });
});
