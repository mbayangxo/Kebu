import { createHmac } from "node:crypto";
import { expect, it } from "vitest";
import { callIceServers, privateCallsEnabled } from "@/lib/rooms/call-qa";

it("fails closed for hosted production and previews not pinned to the designated QA project", () => {
  const flag = { NEXT_PUBLIC_KEBU_PRIVATE_CALLS: "true", NODE_ENV: "production" } as const;
  const qa = "https://skqnxyaeimvbyrmdfzvk.supabase.co";
  expect(privateCallsEnabled({ ...flag, VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: qa })).toBe(false);
  expect(privateCallsEnabled({ ...flag, VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: "https://another.supabase.co" })).toBe(false);
  expect(privateCallsEnabled({ ...flag, VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: qa })).toBe(true);
});

it("mints an expiring relay credential and never sends the shared secret", () => {
  const env = { NODE_ENV: "test", KEBU_ROOM_TURN_URL: "turns:relay.example.test:5349", KEBU_ROOM_TURN_SECRET: "test-secret" } as const;
  const user = "example-user";
  const [relay] = callIceServers(env, user, 1000);
  expect(relay).toEqual({ urls: env.KEBU_ROOM_TURN_URL, username: "2101:example-user", credential: createHmac("sha1", env.KEBU_ROOM_TURN_SECRET).update("2101:example-user").digest("base64") });
  expect(callIceServers({ ...env, KEBU_ROOM_TURN_SECRET: undefined }, user)).toEqual([]);
});
