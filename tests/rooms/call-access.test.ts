import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { callIceServers, privateCallsEnabled } from "@/lib/rooms/call-access";

const env = (overrides: Record<string, string | undefined>): NodeJS.ProcessEnv => ({ NODE_ENV: "test", ...overrides });

describe("privateCallsEnabled", () => {
  it("is on by default, with an explicit kill switch", () => {
    expect(privateCallsEnabled(env({}))).toBe(true);
    expect(privateCallsEnabled(env({ KEBU_CALLS_DISABLED: "true" }))).toBe(false);
    expect(privateCallsEnabled(env({ KEBU_CALLS_DISABLED: "false" }))).toBe(true);
  });
});

describe("callIceServers", () => {
  it("falls back to a public STUN server when no STUN env var is configured", () => {
    expect(callIceServers(env({}), "user")).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
  });

  it("uses a configured STUN URL instead of the public fallback", () => {
    expect(callIceServers(env({ KEBU_ROOM_STUN_URL: "stun:relay.example.test:3478" }), "user"))
      .toEqual([{ urls: "stun:relay.example.test:3478" }]);
  });

  it("mints an expiring relay credential without TURN and never sends the shared secret", () => {
    const turnUrl = "turns:relay.example.test:5349";
    const turnSecret = "test-secret";
    const user = "example-user";
    const servers = callIceServers(env({ KEBU_ROOM_TURN_URL: turnUrl, KEBU_ROOM_TURN_SECRET: turnSecret }), user, 1000);
    expect(servers).toHaveLength(2);
    expect(servers[1]).toEqual({
      urls: turnUrl,
      username: "2101:example-user",
      credential: createHmac("sha1", turnSecret).update("2101:example-user").digest("base64"),
    });
    expect(JSON.stringify(servers)).not.toContain(turnSecret);
  });

  it("degrades gracefully to STUN-only when TURN env vars are incomplete", () => {
    expect(callIceServers(env({ KEBU_ROOM_TURN_URL: "turns:relay.example.test:5349" }), "user"))
      .toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
  });

  it("rejects a malformed TURN URL rather than passing it to the browser", () => {
    expect(callIceServers(env({ KEBU_ROOM_TURN_URL: "not-a-turn-url", KEBU_ROOM_TURN_SECRET: "secret" }), "user"))
      .toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
  });
});
