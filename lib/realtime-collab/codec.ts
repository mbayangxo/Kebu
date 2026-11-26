/**
 * Pure, DOM/Yjs-free wire-format helpers for carrying Yjs binary updates and
 * awareness updates over a Supabase Realtime broadcast channel (JSON-only
 * payloads). Kept free of `yjs`/`y-protocols` types so it's unit-testable
 * without a Y.Doc; app/components/library/use-document-collab.ts wires this
 * to real Yjs update/awareness bytes.
 */

const CHUNK = 0x8000;

/** Uint8Array -> base64, chunked to avoid blowing the call stack on large arrays. */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type CollabUpdateMessage = { type: "update"; from: string; data: string };
export type CollabAwarenessMessage = { type: "awareness"; from: string; data: string };
export type CollabMessage = CollabUpdateMessage | CollabAwarenessMessage;

export function encodeUpdateMessage(from: string, update: Uint8Array): CollabUpdateMessage {
  return { type: "update", from, data: uint8ArrayToBase64(update) };
}

export function encodeAwarenessMessage(from: string, update: Uint8Array): CollabAwarenessMessage {
  return { type: "awareness", from, data: uint8ArrayToBase64(update) };
}

/** Validates an incoming broadcast payload before touching any Yjs document or awareness instance. */
export function parseCollabMessage(raw: unknown): CollabMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.from !== "string" || !r.from || typeof r.data !== "string" || !r.data) return null;
  if (r.type === "update") return { type: "update", from: r.from, data: r.data };
  if (r.type === "awareness") return { type: "awareness", from: r.from, data: r.data };
  return null;
}

export function decodeMessageData(message: CollabMessage): Uint8Array {
  return base64ToUint8Array(message.data);
}
