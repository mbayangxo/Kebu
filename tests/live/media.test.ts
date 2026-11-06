import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { joinGrant, signMediaToken } from "@/lib/live/media";

describe("public broadcast grants", () => {
  it("issues short-lived room-scoped audience grants without publish/admin permissions", () => {
    const room = "123";
    const [header, body, signature] = signMediaToken("key", "secret", "viewer", joinGrant(room, false)).split(".");
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    expect(claims.video).toEqual({
      room: "kebu-live-123", roomJoin: true, canSubscribe: true, canPublish: false, canPublishData: false,
    });
    expect(claims.sub).toBe("viewer");
    expect(claims.exp - claims.nbf).toBe(50);
    expect(signature).toBe(createHmac("sha256", "secret").update(`${header}.${body}`).digest("base64url"));
  });

  it("allows host camera and mic without adding project access or server-side media control", () => {
    const grant = joinGrant("123", true);
    expect(grant.canPublishSources).toEqual(["camera", "microphone"]);
    expect(grant.canPublish).toBe(true);
    expect(grant).not.toHaveProperty("roomAdmin");
  });
});
