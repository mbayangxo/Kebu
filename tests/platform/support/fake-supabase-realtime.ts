/**
 * A from-scratch Supabase Realtime transport fixture for Playwright tests.
 *
 * There is no hosted Supabase (or local Realtime server) reachable from this
 * sandbox, so this intercepts the browser's WebSocket connection to
 * `.../realtime/v1/websocket` via `page.routeWebSocket` and speaks just enough
 * of the real `@supabase/realtime-js` wire protocol — Phoenix join/heartbeat
 * acks, presence_state/presence_diff, and the library's custom binary
 * broadcast push/deliver framing — for presence and broadcast to work across
 * pages that share one `RealtimeHub`. The exact byte layout below was read
 * directly from the installed `@supabase/realtime-js` source
 * (`src/lib/serializer.ts`), not guessed, since a one-byte-off decoder would
 * silently corrupt signaling. This never touches a real network; it is a
 * fixture, not a substitute for hosted Realtime acceptance.
 */
import type { Page } from "playwright/test";

type WebSocketRoute = Parameters<Parameters<Page["routeWebSocket"]>[1]>[0];

type Meta = { phx_ref: string; [key: string]: unknown };

type Socket = {
  route: WebSocketRoute;
  topic: string | null;
  joinRef: string | null;
  presenceKey: string | null;
};

type TopicState = {
  sockets: Map<number, Socket>;
  metas: Map<string, Meta[]>; // presence key -> metas
};

export type RealtimeHub = { topics: Map<string, TopicState>; nextSocketId: number };

export function createRealtimeHub(): RealtimeHub {
  return { topics: new Map(), nextSocketId: 1 };
}

function topicState(hub: RealtimeHub, topic: string): TopicState {
  let state = hub.topics.get(topic);
  if (!state) { state = { sockets: new Map(), metas: new Map() }; hub.topics.set(topic, state); }
  return state;
}

function textFrame(joinRef: string | null, ref: string | null, topic: string, event: string, payload: unknown): string {
  return JSON.stringify([joinRef, ref, topic, event, payload]);
}

// Mirrors Serializer#_decodeUserBroadcast's expected layout for kind=3 (client -> server push).
function decodeBroadcastPush(buffer: Buffer): { ref: string; joinRef: string; topic: string; userEvent: string; payload: unknown } {
  let offset = 0;
  const kind = buffer.readUInt8(offset++);
  if (kind !== 3) throw new Error(`Expected userBroadcastPush (kind 3), got ${kind}`);
  const joinRefLen = buffer.readUInt8(offset++);
  const refLen = buffer.readUInt8(offset++);
  const topicLen = buffer.readUInt8(offset++);
  const eventLen = buffer.readUInt8(offset++);
  const metaLen = buffer.readUInt8(offset++);
  const encoding = buffer.readUInt8(offset++);
  const joinRef = buffer.toString("utf8", offset, offset + joinRefLen); offset += joinRefLen;
  const ref = buffer.toString("utf8", offset, offset + refLen); offset += refLen;
  const topic = buffer.toString("utf8", offset, offset + topicLen); offset += topicLen;
  const userEvent = buffer.toString("utf8", offset, offset + eventLen); offset += eventLen;
  offset += metaLen; // metadata isn't used by this fixture
  const payloadBytes = buffer.subarray(offset);
  const payload = encoding === 1 ? JSON.parse(payloadBytes.toString("utf8")) : payloadBytes;
  return { ref, joinRef, topic, userEvent, payload };
}

// Mirrors Serializer#_decodeUserBroadcast's expected layout for kind=4 (server -> client deliver).
function encodeBroadcastDeliver(topic: string, userEvent: string, payload: unknown): Buffer {
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
  const topicBytes = Buffer.from(topic, "utf8");
  const eventBytes = Buffer.from(userEvent, "utf8");
  const header = Buffer.alloc(5);
  header.writeUInt8(4, 0); // kind: userBroadcast
  header.writeUInt8(topicBytes.length, 1);
  header.writeUInt8(eventBytes.length, 2);
  header.writeUInt8(0, 3); // no metadata
  header.writeUInt8(1, 4); // JSON encoding
  return Buffer.concat([header, topicBytes, eventBytes, payloadBytes]);
}

/** Routes this page's Realtime WebSocket through `hub` so it can see other pages' presence/broadcasts. */
export async function attachFakeRealtime(page: Page, hub: RealtimeHub): Promise<void> {
  await page.routeWebSocket(/realtime\/v1\/websocket/, (route) => {
    const socketId = hub.nextSocketId++;
    const socket: Socket = { route, topic: null, joinRef: null, presenceKey: null };

    const leaveTopic = () => {
      if (!socket.topic) return;
      const state = topicState(hub, socket.topic);
      state.sockets.delete(socketId);
      if (socket.presenceKey && state.metas.has(socket.presenceKey)) {
        const left = state.metas.get(socket.presenceKey)!;
        state.metas.delete(socket.presenceKey);
        for (const other of state.sockets.values()) {
          other.route.send(textFrame(null, null, socket.topic, "presence_diff", { joins: {}, leaves: { [socket.presenceKey]: { metas: left } } }));
        }
      }
    };

    route.onClose(() => leaveTopic());

    route.onMessage((message) => {
      if (Buffer.isBuffer(message)) {
        const { ref, topic, userEvent, payload } = decodeBroadcastPush(message);
        const state = topicState(hub, topic);
        const frame = encodeBroadcastDeliver(topic, userEvent, payload);
        for (const [otherId, other] of state.sockets) if (otherId !== socketId) other.route.send(frame);
        route.send(textFrame(socket.joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }));
        return;
      }

      const [joinRef, ref, topic, event, payload] = JSON.parse(message) as [string | null, string | null, string, string, Record<string, unknown>];
      if (event === "phx_join") {
        socket.topic = topic;
        socket.joinRef = joinRef;
        const presenceCfg = (payload?.config as Record<string, unknown> | undefined)?.presence as Record<string, unknown> | undefined;
        socket.presenceKey = typeof presenceCfg?.key === "string" && presenceCfg.key ? presenceCfg.key : null;
        const state = topicState(hub, topic);
        state.sockets.set(socketId, socket);
        route.send(textFrame(joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }));
        const initial: Record<string, { metas: Meta[] }> = {};
        for (const [key, metas] of state.metas) initial[key] = { metas };
        route.send(textFrame(joinRef, null, topic, "presence_state", initial));
        return;
      }
      if (event === "heartbeat") {
        route.send(textFrame(joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }));
        return;
      }
      if (event === "phx_leave") {
        leaveTopic();
        route.send(textFrame(joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }));
        return;
      }
      if (event === "presence") {
        const action = payload?.event;
        const state = topicState(hub, topic);
        if (action === "track" && socket.presenceKey) {
          const meta: Meta = { phx_ref: `${socketId}-${Date.now()}`, ...(payload.payload as Record<string, unknown>) };
          state.metas.set(socket.presenceKey, [meta]);
          for (const other of state.sockets.values()) {
            other.route.send(textFrame(null, null, topic, "presence_diff", { joins: { [socket.presenceKey]: { metas: [meta] } }, leaves: {} }));
          }
        } else if (action === "untrack" && socket.presenceKey) {
          const left = state.metas.get(socket.presenceKey) ?? [];
          state.metas.delete(socket.presenceKey);
          for (const other of state.sockets.values()) {
            other.route.send(textFrame(null, null, topic, "presence_diff", { joins: {}, leaves: { [socket.presenceKey]: { metas: left } } }));
          }
        }
        route.send(textFrame(joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }));
        return;
      }
      // Unknown/unused event (e.g. access_token) — ack so the client doesn't stall waiting on a reply.
      route.send(textFrame(joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }));
    });
  });
}
