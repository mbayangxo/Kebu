/**
 * Offline action queue — never claim "saved" until the server acknowledges.
 * Kinds: place_order · save_section · event_register.
 *
 * Ordering guarantee: same-resource mutations never dispatch concurrently —
 * a syncing item for a resource blocks the next item for that resource until
 * the server acknowledges. Independent resources run in parallel (bounded at
 * MAX_CONCURRENT).
 *
 * Retryability:
 *   HTTP 4xx → "terminal" (visible to user, not retried — auth/validation error)
 *   HTTP 5xx / network → "failed" (retried on next flush)
 *
 * Overflow: hard cap at QUEUE_CAP items. save_section coalesces so the
 * practical limit is unique sections being edited. Reaching the cap throws
 * "offline_queue_full" — never a silent drop of the newest item.
 *
 * Stuck syncing: items left at "syncing" after a crash/reload are reset to
 * "queued" by resetStuckSyncingItems(), called once on app boot.
 */

export const OFFLINE_QUEUE_KEY = "kebu_offline_queue_v1";

const QUEUE_CAP = 200;
const MAX_CONCURRENT = 6;

export type OfflinePlaceOrderPayload = {
  subdomain: string;
  productId: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  customerNote: string;
  quantity: number;
  paymentPreference?: string;
  clientChannel?: string;
  customerEmail?: string;
  emailVerificationToken?: string;
  discountCode?: string;
};

export type OfflineSaveSectionPayload = {
  projectId: string;
  sectionId: string;
  props: Record<string, unknown>;
};

export type OfflineEventRegisterPayload = {
  publicId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  quantity: number;
  ticketTypeId?: string;
};

export type OfflineItemStatus = "queued" | "syncing" | "failed" | "terminal";

export type OfflineQueueItem =
  | {
      id: string;
      kind: "place_order";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflinePlaceOrderPayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "save_section";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflineSaveSectionPayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "event_register";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflineEventRegisterPayload;
      lastError?: string;
    };

/** In-memory fallback when localStorage is missing (SSR / node tests). */
let memoryQueue: OfflineQueueItem[] = [];

function readQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [...memoryQueue];
  }
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as OfflineQueueItem[]) : [];
  } catch {
    return [...memoryQueue];
  }
}

function writeQueue(items: OfflineQueueItem[]): void {
  memoryQueue = items;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* storage quota exceeded — items remain in memoryQueue */
  }
  try {
    window.dispatchEvent(new Event("kebu-offline-queue-changed"));
  } catch {
    /* ignore */
  }
}

export function listOfflineQueue(): OfflineQueueItem[] {
  return readQueue();
}

function newId(): string {
  return `oq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns the logical resource key for an item.
 * Items with the same key must not execute concurrently.
 */
function getResourceKey(item: OfflineQueueItem): string {
  if (item.kind === "save_section") {
    return `save_section:${item.payload.projectId}:${item.payload.sectionId}`;
  }
  // Orders and event registrations are each unique — no ordering constraint needed.
  return item.id;
}

/**
 * Reset items stuck at "syncing" after a browser crash or force-reload.
 * Call once during app boot before any flush.
 */
export function resetStuckSyncingItems(): void {
  const items = readQueue();
  const hasSyncing = items.some((i) => i.status === "syncing");
  if (!hasSyncing) return;
  writeQueue(
    items.map((i) =>
      i.status === "syncing" ? ({ ...i, status: "queued" } as OfflineQueueItem) : i,
    ),
  );
}

export function enqueuePlaceOrder(payload: OfflinePlaceOrderPayload): OfflineQueueItem {
  const current = readQueue();
  if (current.length >= QUEUE_CAP) {
    throw new Error("offline_queue_full");
  }
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "place_order",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...current, item]);
  return item;
}

/** Coalesce: one pending save per section (latest props win). */
export function enqueueSaveSection(payload: OfflineSaveSectionPayload): OfflineQueueItem {
  const current = readQueue();
  const withoutDup = current.filter(
    (i) =>
      !(
        i.kind === "save_section" &&
        i.payload.projectId === payload.projectId &&
        i.payload.sectionId === payload.sectionId &&
        i.status !== "syncing"
      ),
  );
  // After coalescing, check capacity against the deduped list.
  if (withoutDup.length >= QUEUE_CAP) {
    throw new Error("offline_queue_full");
  }
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "save_section",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...withoutDup, item]);
  return item;
}

export function enqueueEventRegister(payload: OfflineEventRegisterPayload): OfflineQueueItem {
  const current = readQueue();
  if (current.length >= QUEUE_CAP) {
    throw new Error("offline_queue_full");
  }
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "event_register",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...current, item]);
  return item;
}

export function removeOfflineQueueItem(id: string): void {
  writeQueue(readQueue().filter((i) => i.id !== id));
}

export function updateOfflineQueueItem(id: string, patch: Partial<OfflineQueueItem>): void {
  writeQueue(readQueue().map((i) => (i.id === id ? ({ ...i, ...patch } as OfflineQueueItem) : i)));
}

export type FlushResult = {
  synced: number;
  failed: number;
  remaining: number;
};

async function flushPlaceOrder(
  item: Extract<OfflineQueueItem, { kind: "place_order" }>,
): Promise<boolean> {
  const res = await fetch(`/api/public/sites/${encodeURIComponent(item.payload.subdomain)}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Kebu-Data-Mode": "offline",
      "X-Kebu-Offline-Sync": "1",
    },
    body: JSON.stringify({
      productId: item.payload.productId,
      customerName: item.payload.customerName,
      customerPhone: item.payload.customerPhone,
      customerNote: item.payload.customerNote,
      quantity: item.payload.quantity,
      paymentPreference: item.payload.paymentPreference ?? "whatsapp",
      clientChannel: item.payload.clientChannel,
      customerEmail: item.payload.customerEmail,
      emailVerificationToken: item.payload.emailVerificationToken,
      discountCode: item.payload.discountCode,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    const isTerminal = res.status >= 400 && res.status < 500;
    updateOfflineQueueItem(item.id, {
      status: isTerminal ? "terminal" : "failed",
      lastError: error,
    });
    return false;
  }
  removeOfflineQueueItem(item.id);
  return true;
}

async function flushSaveSection(
  item: Extract<OfflineQueueItem, { kind: "save_section" }>,
): Promise<boolean> {
  const res = await fetch(`/api/projects/${item.payload.projectId}/sections`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Kebu-Data-Mode": "offline",
      "X-Kebu-Offline-Sync": "1",
    },
    body: JSON.stringify({
      sectionId: item.payload.sectionId,
      props: item.payload.props,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    const isTerminal = res.status >= 400 && res.status < 500;
    updateOfflineQueueItem(item.id, {
      status: isTerminal ? "terminal" : "failed",
      lastError: error,
    });
    return false;
  }
  removeOfflineQueueItem(item.id);
  return true;
}

async function flushEventRegister(
  item: Extract<OfflineQueueItem, { kind: "event_register" }>,
): Promise<boolean> {
  const res = await fetch(`/api/public/events/${encodeURIComponent(item.payload.publicId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Kebu-Data-Mode": "offline",
      "X-Kebu-Offline-Sync": "1",
    },
    body: JSON.stringify({
      guestName: item.payload.guestName,
      guestPhone: item.payload.guestPhone,
      guestEmail: item.payload.guestEmail,
      quantity: item.payload.quantity,
      ticketTypeId: item.payload.ticketTypeId,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    const isTerminal = res.status >= 400 && res.status < 500;
    updateOfflineQueueItem(item.id, {
      status: isTerminal ? "terminal" : "failed",
      lastError: error,
    });
    return false;
  }
  removeOfflineQueueItem(item.id);
  return true;
}

async function dispatchItem(item: OfflineQueueItem): Promise<boolean> {
  try {
    if (item.kind === "place_order") return await flushPlaceOrder(item);
    if (item.kind === "save_section") return await flushSaveSection(item);
    return await flushEventRegister(item);
  } catch (e) {
    // Network failure or unexpected throw → retryable
    updateOfflineQueueItem(item.id, {
      status: "failed",
      lastError: e instanceof Error ? e.message : "Network error",
    });
    return false;
  }
}

/** Flush mutex — prevents two concurrent flush calls from interleaving. */
let activeFlush: Promise<FlushResult> | null = null;

/**
 * Flush queued (and retryable-failed) items.
 *
 * Safe scheduling:
 * - Items whose resource already has a syncing item are skipped this pass
 *   (they will be picked up by the next flush once the in-flight request
 *   completes, preserving the ordering guarantee).
 * - Independent resources run in parallel, bounded at MAX_CONCURRENT.
 * - Concurrent flush() calls coalesce: the second caller receives the same
 *   promise as the first.
 */
export function flushOfflineQueue(): Promise<FlushResult> {
  if (activeFlush) return activeFlush;
  activeFlush = _runFlush().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

async function _runFlush(): Promise<FlushResult> {
  const allItems = readQueue();

  // Resource keys that already have a syncing item — don't start new work for these.
  const syncingKeys = new Set(
    allItems.filter((i) => i.status === "syncing").map(getResourceKey),
  );

  // Candidates: queued or retryable-failed, resource not already in flight.
  const candidates = allItems.filter(
    (i) =>
      (i.status === "queued" || i.status === "failed") &&
      !syncingKeys.has(getResourceKey(i)),
  );

  if (candidates.length === 0) {
    return { synced: 0, failed: 0, remaining: readQueue().length };
  }

  // Mark as syncing atomically before any async work.
  candidates.forEach((item) =>
    updateOfflineQueueItem(item.id, { status: "syncing", lastError: undefined }),
  );

  let synced = 0;
  let failed = 0;

  // Process in bounded-concurrency batches.
  for (let i = 0; i < candidates.length; i += MAX_CONCURRENT) {
    const chunk = candidates.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.allSettled(chunk.map((item) => dispatchItem(item)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) synced += 1;
      else failed += 1;
    }
  }

  return { synced, failed, remaining: readQueue().length };
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

// ─── test helpers (only call from test files) ────────────────────────────────

/** Replaces the entire queue. Use only in tests. */
export function _setQueueForTesting(items: OfflineQueueItem[]): void {
  memoryQueue = items;
}

/** Resets the flush mutex. Use only in tests. */
export function _resetFlushStateForTesting(): void {
  activeFlush = null;
}
