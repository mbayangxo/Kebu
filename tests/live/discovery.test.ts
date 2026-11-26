import { describe, expect, it } from "vitest";
import { filterBroadcasts } from "@/app/live/live-rooms";

const rooms = [
  { id: "1", title: "Senegal Beats Live", expires_at: "2099-01-01T00:00:00Z" },
  { id: "2", title: "Cooking with Awa", expires_at: "2099-01-01T00:00:00Z" },
  { id: "3", title: "Dakar Market Tour", expires_at: "2099-01-01T00:00:00Z" },
];

describe("filterBroadcasts", () => {
  it("returns every room for an empty or whitespace-only query", () => {
    expect(filterBroadcasts(rooms, "")).toEqual(rooms);
    expect(filterBroadcasts(rooms, "   ")).toEqual(rooms);
  });

  it("matches a substring case-insensitively against the title", () => {
    expect(filterBroadcasts(rooms, "dakar")).toEqual([rooms[2]]);
    expect(filterBroadcasts(rooms, "LIVE")).toEqual([rooms[0]]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterBroadcasts(rooms, "nonexistent")).toEqual([]);
  });

  it("trims surrounding whitespace before matching", () => {
    expect(filterBroadcasts(rooms, "  awa  ")).toEqual([rooms[1]]);
  });
});
