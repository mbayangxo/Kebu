/**
 * Offline action queue — never claim “saved” until the server acknowledges.
 * Kinds: place_order · save_section · event_register.
 */

export const OFFLINE_QUEUE_KEY = "kebu_offline_queue_v1";

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

export type OfflineQueueItem =
  | {
      id: string;
      kind: "place_order";
      createdAt: string;
      status: "queued" | "syncing" | "failed";
      payload: OfflinePlaceOrderPayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "save_section";
      createdAt: string;
      status: "queued" | "syncing" | "failed";
      payload: OfflineSaveSectionPayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "event_register";
      createdAt: string;
      status: "queued" | "syncing" | "failed";
      payload: OfflineEventRegisterPayload;
      lastError?: string;
    };

/** In-memory fallback when localStorage is missing (SSR / tests). */
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
  const next = items.slice(0, 40);
  memoryQueue = next;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
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

export function enqueuePlaceOrder(payload: OfflinePlaceOrderPayload): OfflineQueueItem {
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "place_order",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...readQueue(), item]);
  return item;
}

/** Coalesce: one pending save per section (latest props win). */
export function enqueueSaveSection(payload: OfflineSaveSectionPayload): OfflineQueueItem {
  const withoutDup = readQueue().filter(
    (i) =>
      !(
        i.kind === "save_section" &&
        i.payload.projectId === payload.projectId &&
        i.payload.sectionId === payload.sectionId &&
        i.status !== "syncing"
      ),
  );
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
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "event_register",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...readQueue(), item]);
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

async function flushPlaceOrder(item: Extract<OfflineQueueItem, { kind: "place_order" }>): Promise<boolean> {
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
      discountCode: item.payload.discountCode,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    updateOfflineQueueItem(item.id, {
      status: "failed",
      lastError: typeof data.error === "string" ? data.error : `HTTP ${res.status}`,
    });
    return false;
  }
  removeOfflineQueueItem(item.id);
  return true;
}

async function flushSaveSection(item: Extract<OfflineQueueItem, { kind: "save_section" }>): Promise<boolean> {
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
    updateOfflineQueueItem(item.id, {
      status: "failed",
      lastError: typeof data.error === "string" ? data.error : `HTTP ${res.status}`,
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
    updateOfflineQueueItem(item.id, {
      status: "failed",
      lastError: typeof data.error === "string" ? data.error : `HTTP ${res.status}`,
    });
    return false;
  }
  removeOfflineQueueItem(item.id);
  return true;
}

/** Flush queued items. Caller must be online. Never marks success without HTTP ok. */
export async function flushOfflineQueue(): Promise<FlushResult> {
  const items = readQueue().filter((i) => i.status !== "syncing");
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    updateOfflineQueueItem(item.id, { status: "syncing", lastError: undefined });
    try {
      let ok = false;
      if (item.kind === "place_order") ok = await flushPlaceOrder(item);
      else if (item.kind === "save_section") ok = await flushSaveSection(item);
      else ok = await flushEventRegister(item);
      if (ok) synced += 1;
      else failed += 1;
    } catch (e) {
      failed += 1;
      updateOfflineQueueItem(item.id, {
        status: "failed",
        lastError: e instanceof Error ? e.message : "Network error",
      });
    }
  }

  return { synced, failed, remaining: readQueue().length };
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}
