import { createHmac } from "node:crypto";

export function signMediaToken(key: string, secret: string, identity: string, grant: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    iss: key, sub: identity, nbf: now - 5, exp: now + 45, video: grant,
  })}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function joinGrant(id: string, host: boolean) {
  return {
    room: `kebu-live-${id}`, roomJoin: true, canSubscribe: true,
    canPublish: host, canPublishData: false,
    ...(host ? { canPublishSources: ["camera", "microphone"] } : {}),
  };
}
