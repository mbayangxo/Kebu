import { describe, expect, it } from "vitest";
import {
  base64ToUint8Array,
  decodeMessageData,
  encodeAwarenessMessage,
  encodeUpdateMessage,
  parseCollabMessage,
  uint8ArrayToBase64,
} from "@/lib/realtime-collab/codec";

describe("uint8ArrayToBase64 / base64ToUint8Array", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 128, 42]);
    expect(base64ToUint8Array(uint8ArrayToBase64(bytes))).toEqual(bytes);
  });

  it("round-trips an empty array", () => {
    expect(base64ToUint8Array(uint8ArrayToBase64(new Uint8Array()))).toEqual(new Uint8Array());
  });

  it("round-trips a large array across the chunking boundary", () => {
    const bytes = new Uint8Array(0x8000 * 3 + 17);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    expect(base64ToUint8Array(uint8ArrayToBase64(bytes))).toEqual(bytes);
  });
});

describe("encodeUpdateMessage / encodeAwarenessMessage / decodeMessageData", () => {
  it("encodes an update message that decodes back to the original bytes", () => {
    const update = new Uint8Array([9, 8, 7, 6]);
    const message = encodeUpdateMessage("user-1", update);
    expect(message).toEqual({ type: "update", from: "user-1", data: uint8ArrayToBase64(update) });
    expect(decodeMessageData(message)).toEqual(update);
  });

  it("encodes an awareness message that decodes back to the original bytes", () => {
    const update = new Uint8Array([1, 2, 3]);
    const message = encodeAwarenessMessage("user-2", update);
    expect(message.type).toBe("awareness");
    expect(decodeMessageData(message)).toEqual(update);
  });
});

describe("parseCollabMessage", () => {
  it("accepts a well-formed update message", () => {
    const raw = { type: "update", from: "user-1", data: "AAE=" };
    expect(parseCollabMessage(raw)).toEqual(raw);
  });

  it("accepts a well-formed awareness message", () => {
    const raw = { type: "awareness", from: "user-1", data: "AAE=" };
    expect(parseCollabMessage(raw)).toEqual(raw);
  });

  it.each([
    null,
    undefined,
    "a string",
    42,
    [],
    {},
    { type: "update", from: "", data: "AAE=" },
    { type: "update", from: "user-1", data: "" },
    { type: "update", data: "AAE=" },
    { type: "update", from: "user-1" },
    { type: "bogus", from: "user-1", data: "AAE=" },
    { from: "user-1", data: "AAE=" },
  ])("rejects malformed payload %j", (raw) => {
    expect(parseCollabMessage(raw)).toBeNull();
  });

  it("never throws on attacker-controlled input", () => {
    const hostile: unknown[] = [1, "x", { toString() { throw new Error("boom"); } }, { type: {}, from: {}, data: {} }];
    for (const raw of hostile) expect(() => parseCollabMessage(raw)).not.toThrow();
  });
});
