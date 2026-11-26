import { describe, expect, it } from "vitest";
import {
  activePeerIds,
  DEFAULT_MESH_PARTICIPANTS,
  gridColumns,
  MAX_MESH_PARTICIPANTS,
  MESH_PARTICIPANT_OPTIONS,
  parseSignalMessage,
  shouldInitiateOffer,
} from "@/lib/rooms/call-mesh";

describe("shouldInitiateOffer", () => {
  it("picks exactly one side of each pair, deterministically", () => {
    expect(shouldInitiateOffer("a", "b")).toBe(true);
    expect(shouldInitiateOffer("b", "a")).toBe(false);
  });

  it("is consistent regardless of call order", () => {
    const ids = ["user-3", "user-1", "user-2"];
    for (const a of ids) for (const b of ids) {
      if (a === b) continue;
      expect(shouldInitiateOffer(a, b)).toBe(!shouldInitiateOffer(b, a));
    }
  });
});

describe("parseSignalMessage", () => {
  it("accepts a well-formed offer/answer", () => {
    expect(parseSignalMessage({ type: "offer", from: "a", to: "b", sdp: "v=0..." }))
      .toEqual({ type: "offer", from: "a", to: "b", sdp: "v=0..." });
    expect(parseSignalMessage({ type: "answer", from: "b", to: "a", sdp: "v=0..." })?.type).toBe("answer");
  });

  it("accepts a well-formed candidate and normalizes optional fields", () => {
    const msg = parseSignalMessage({
      type: "candidate", from: "a", to: "b",
      candidate: { candidate: "candidate:1 1 udp...", sdpMid: "0", sdpMLineIndex: 0 },
    });
    expect(msg).toEqual({
      type: "candidate", from: "a", to: "b",
      candidate: { candidate: "candidate:1 1 udp...", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: null },
    });
  });

  it("rejects malformed or attacker-shaped payloads instead of touching a peer connection", () => {
    expect(parseSignalMessage(null)).toBeNull();
    expect(parseSignalMessage("just a string")).toBeNull();
    expect(parseSignalMessage({ type: "offer", from: "a", to: "b" })).toBeNull(); // missing sdp
    expect(parseSignalMessage({ type: "offer", from: "", to: "b", sdp: "x" })).toBeNull(); // empty from
    expect(parseSignalMessage({ type: "bogus", from: "a", to: "b" })).toBeNull();
    expect(parseSignalMessage({ type: "candidate", from: "a", to: "b", candidate: "not-an-object" })).toBeNull();
    expect(parseSignalMessage({ type: "candidate", from: "a", to: "b", candidate: { candidate: 42 } })).toBeNull();
  });
});

describe("activePeerIds", () => {
  it("excludes the caller and de-duplicates across presence keys", () => {
    const state = {
      k1: [{ userId: "self" }],
      k2: [{ userId: "peer-a" }],
      k3: [{ userId: "peer-a" }],
      k4: [{ userId: "peer-b" }],
    };
    expect(activePeerIds(state, "self").sort()).toEqual(["peer-a", "peer-b"]);
  });

  it("drops malformed entries instead of producing a broken peer id", () => {
    const state = { k1: [{ userId: 42 } as unknown as { userId?: unknown }], k2: [{}] };
    expect(activePeerIds(state, "self")).toEqual([]);
  });
});

describe("gridColumns", () => {
  it("scales with tile count", () => {
    expect(gridColumns(1)).toBe(1);
    expect(gridColumns(2)).toBe(2);
    expect(gridColumns(4)).toBe(2);
    expect(gridColumns(5)).toBe(3);
    expect(gridColumns(6)).toBe(3);
    expect(gridColumns(8)).toBe(4);
  });
});

describe("mesh participant cap", () => {
  it("defaults to the hard ceiling (explicit product decision, not an oversight)", () => {
    // Full mesh costs real upload bandwidth per extra participant, but
    // Kebu's group/family/team calls mattering more than protecting every
    // connection from strain was an explicit, confirmed product decision -
    // smaller sizes stay available via MESH_PARTICIPANT_OPTIONS for whoever
    // wants one, without shrinking what happens when nobody asks.
    expect(DEFAULT_MESH_PARTICIPANTS).toBe(MAX_MESH_PARTICIPANTS);
  });

  it("offers only values within the database's own check constraint range, including smaller alternatives", () => {
    for (const opt of MESH_PARTICIPANT_OPTIONS) {
      expect(opt.value).toBeGreaterThanOrEqual(2);
      expect(opt.value).toBeLessThanOrEqual(MAX_MESH_PARTICIPANTS);
    }
    expect(MESH_PARTICIPANT_OPTIONS.map((o) => o.value)).toContain(DEFAULT_MESH_PARTICIPANTS);
    expect(MESH_PARTICIPANT_OPTIONS.map((o) => o.value)).toContain(MAX_MESH_PARTICIPANTS);
    expect(MESH_PARTICIPANT_OPTIONS.some((o) => o.value < MAX_MESH_PARTICIPANTS)).toBe(true);
  });
});

describe("screen sharing signals", () => {
  it("requires a boolean state and keeps initial sharing metadata in offers", () => {
    expect(parseSignalMessage({ type:"screen", from:"a", to:"b", enabled:true })).toEqual({ type:"screen", from:"a", to:"b", enabled:true });
    expect(parseSignalMessage({ type:"screen", from:"a", to:"b", enabled:"yes" })).toBeNull();
    expect(parseSignalMessage({ type:"offer", from:"a", to:"b", sdp:"test", screenSharing:true })).toMatchObject({ screenSharing:true });
    expect(parseSignalMessage({ type:"offer", from:"a", to:"b", sdp:"test", screenSharing:"yes" })).toBeNull();
  });
});
