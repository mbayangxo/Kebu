/**
 * Offline action queue — never claim "saved" until the server acknowledges.
 * Kinds: place_order · save_section · save_chrome · save_settings · event_register · sync_nav.
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
 * Overflow: hard cap at QUEUE_CAP items. save_section/save_chrome/save_settings
 * coalesce so the practical limit is unique resources being edited. Reaching the
 * cap throws "offline_queue_full" — never a silent drop.
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

/** Header or footer props for a project. */
export type OfflineSaveChromePayload = {
  projectId: string;
  part: "header" | "footer";
  props: Record<string, unknown>;
};

/**
 * Site settings — any combination of subdomain/SEO/theme may be included.
 * Coalesces so only the latest write per project is queued.
 */
export type OfflineSaveSettingsPayload = {
  projectId: string;
  subdomain?: string;
  seo?: Record<string, unknown>;
  theme?: Record<string, unknown>;
};

export type OfflineEventRegisterPayload = {
  publicId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  quantity: number;
  ticketTypeId?: string;
};

/**
 * A logical undo/redo batch — N section props updates that must all persist atomically.
 * Queued as a single item so the offline retry path never degrades into N independent
 * mutations that can partially succeed.
 */
export type OfflineSaveBatchSectionsPayload = {
  projectId: string;
  /** Ordered list of { id, props } matching the /sections/batch POST body. */
  updates: Array<{ id: string; props: Record<string, unknown> }>;
};

/**
 * Durable nav reconciliation after a page mutation returned navSyncStale: true.
 * Coalesces per project — only the latest pending sync is needed.
 */
export type OfflineSyncNavPayload = {
  projectId: string;
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
      kind: "save_chrome";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflineSaveChromePayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "save_settings";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflineSaveSettingsPayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "event_register";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflineEventRegisterPayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "save_batch_sections";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflineSaveBatchSectionsPayload;
      lastError?: string;
    }
  | {
      id: string;
      kind: "sync_nav";
      createdAt: string;
      status: OfflineItemStatus;
      payload: OfflineSyncNavPayload;
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
  if (item.kind === "save_chrome") {
    return `save_chrome:${item.payload.projectId}:${item.payload.part}`;
  }
  if (item.kind === "save_settings") {
    return `save_settings:${item.payload.projectId}`;
  }
  if (item.kind === "save_batch_sections") {
    // All updates in the same batch share a project-scoped resource key so they
    // serialise with any concurrent individual section saves for the same project.
    return `save_batch_sections:${item.payload.projectId}`;
  }
  if (item.kind === "sync_nav") {
    return `sync_nav:${item.payload.projectId}`;
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

/** Coalesce: one pending chrome save per part per project (latest props win). */
export function enqueueSaveChrome(payload: OfflineSaveChromePayload): OfflineQueueItem {
  const current = readQueue();
  const withoutDup = current.filter(
    (i) =>
      !(
        i.kind === "save_chrome" &&
        i.payload.projectId === payload.projectId &&
        i.payload.part === payload.part &&
        i.status !== "syncing"
      ),
  );
  if (withoutDup.length >= QUEUE_CAP) {
    throw new Error("offline_queue_full");
  }
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "save_chrome",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...withoutDup, item]);
  return item;
}

/**
 * Coalesce: one pending settings save per project.
 * Merges with any existing non-syncing queued save so the latest values win
 * without doubling the queue entry count.
 */
export function enqueueSaveSettings(payload: OfflineSaveSettingsPayload): OfflineQueueItem {
  const current = readQueue();
  const existing = current.find(
    (i) =>
      i.kind === "save_settings" &&
      i.payload.projectId === payload.projectId &&
      i.status !== "syncing",
  );
  if (existing && existing.kind === "save_settings") {
    // Merge latest values into the existing queued item — latest write wins per field.
    const merged: OfflineSaveSettingsPayload = {
      ...existing.payload,
      ...payload,
      seo: payload.seo ?? existing.payload.seo,
      theme: payload.theme ?? existing.payload.theme,
      subdomain: payload.subdomain ?? existing.payload.subdomain,
    };
    const updated = { ...existing, payload: merged } as OfflineQueueItem;
    writeQueue(current.map((i) => (i.id === existing.id ? updated : i)));
    return updated;
  }
  const withoutDup = current.filter(
    (i) =>
      !(
        i.kind === "save_settings" &&
        i.payload.projectId === payload.projectId &&
        i.status !== "syncing"
      ),
  );
  if (withoutDup.length >= QUEUE_CAP) {
    throw new Error("offline_queue_full");
  }
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "save_settings",
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

/**
 * Queue a logical section-batch mutation (undo/redo) as a single durable item.
 * Never split into N individual save_section items — partial persistence of a
 * logical snapshot must not be possible through the offline-retry path.
 */
export function enqueueSaveBatchSections(
  payload: OfflineSaveBatchSectionsPayload,
): OfflineQueueItem {
  const current = readQueue();
  if (current.length >= QUEUE_CAP) {
    throw new Error("offline_queue_full");
  }
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "save_batch_sections",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...current, item]);
  return item;
}

/**
 * Enqueue a nav-sync for a project. Coalesces: one pending sync per project is
 * sufficient because the reconciliation is idempotent.
 */
export function enqueueSyncNav(payload: OfflineSyncNavPayload): OfflineQueueItem {
  const current = readQueue();
  const withoutDup = current.filter(
    (i) =>
      !(
        i.kind === "sync_nav" &&
        i.payload.projectId === payload.projectId &&
        i.status !== "syncing"
      ),
  );
  if (withoutDup.length >= QUEUE_CAP) {
    throw new Error("offline_queue_full");
  }
  const item: OfflineQueueItem = {
    id: newId(),
    kind: "sync_nav",
    createdAt: new Date().toISOString(),
    status: "queued",
    payload,
  };
  writeQueue([...withoutDup, item]);
  return item;
}

export function removeOfflineQueueItem(id: string): void {
  writeQueue(readQueue().filter((i) => i.id !== id));
}

export function updateOfflineQueueItem(id: string, patch: Partial<OfflineQueueItem>): void {
  writeQueue(readQueue().map((i) => (i.id === id ? ({ ...i, ...patch } as OfflineQueueItem) : i)));
}

/** Remove all terminal items from the queue. Returns the count discarded. */
export function discardTerminalItems(): number {
  const items = readQueue();
  const terminals = items.filter((i) => i.status === "terminal");
  if (terminals.length === 0) return 0;
  writeQueue(items.filter((i) => i.status !== "terminal"));
  return terminals.length;
}

/** Remove a single terminal item by id. No-op if not terminal. */
export function discardTerminalItem(id: string): void {
  const items = readQueue();
  const item = items.find((i) => i.id === id);
  if (item && item.status === "terminal") {
    writeQueue(items.filter((i) => i.id !== id));
  }
}

/** Return all currently-terminal items (for surfacing in the UI). */
export function getTerminalItems(): OfflineQueueItem[] {
  return readQueue().filter((i) => i.status === "terminal");
}

export type TerminalItem = {
  id: string;
  kind: OfflineQueueItem["kind"];
  lastError?: string;
  description: string;
  /** For save_section items: the section that failed to save. */
  sectionId?: string;
};

/** Human-readable description of a terminal item for the recovery UI. */
export function describeTerminalItem(item: OfflineQueueItem): string {
  if (item.kind === "save_section") return `Section save failed (auth/validation error)`;
  if (item.kind === "save_chrome") return `${item.payload.part === "header" ? "Header" : "Footer"} save failed (auth/validation error)`;
  if (item.kind === "save_settings") return "Site settings save failed (auth/validation error)";
  if (item.kind === "place_order") return `Order placement failed (auth/validation error)`;
  if (item.kind === "event_register") return `Event registration failed (auth/validation error)`;
  if (item.kind === "save_batch_sections") {
    const count = item.payload.updates.length;
    return `Undo/redo batch (${count} section${count !== 1 ? "s" : ""}) failed — the change was not applied`;
  }
  if (item.kind === "sync_nav") return "Navigation sync failed (auth/validation error)";
  return "Mutation failed";
}

export type FlushResult = {
  synced: number;
  failed: number;
  remaining: number;
  /** Items that hit a terminal (4xx) error during this flush pass. */
  terminalItems: TerminalItem[];
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

async function flushSaveChrome(
  item: Extract<OfflineQueueItem, { kind: "save_chrome" }>,
): Promise<boolean> {
  const body =
    item.payload.part === "header"
      ? { header: item.payload.props }
      : { footer: item.payload.props };
  const res = await fetch(`/api/projects/${item.payload.projectId}/site-chrome`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Kebu-Data-Mode": "offline",
      "X-Kebu-Offline-Sync": "1",
    },
    body: JSON.stringify(body),
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

async function flushSaveSettings(
  item: Extract<OfflineQueueItem, { kind: "save_settings" }>,
): Promise<boolean> {
  const body: Record<string, unknown> = {};
  if (item.payload.subdomain !== undefined) body.subdomain = item.payload.subdomain;
  if (item.payload.seo !== undefined) body.seo = item.payload.seo;
  if (item.payload.theme !== undefined) body.theme = item.payload.theme;
  const res = await fetch(`/api/projects/${item.payload.projectId}/settings`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Kebu-Data-Mode": "offline",
      "X-Kebu-Offline-Sync": "1",
    },
    body: JSON.stringify(body),
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

async function flushSaveBatchSections(
  item: Extract<OfflineQueueItem, { kind: "save_batch_sections" }>,
): Promise<boolean> {
  const res = await fetch(
    `/api/projects/${item.payload.projectId}/sections/batch`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Kebu-Data-Mode": "offline",
        "X-Kebu-Offline-Sync": "1",
      },
      body: JSON.stringify({ updates: item.payload.updates }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
    // 4xx → terminal (auth/validation error — retrying would still fail).
    // The batch is marked terminal as a unit; it cannot degrade into N individual mutations.
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

async function flushSyncNav(
  item: Extract<OfflineQueueItem, { kind: "sync_nav" }>,
): Promise<boolean> {
  const res = await fetch(
    `/api/projects/${item.payload.projectId}/site-chrome/sync-nav`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Kebu-Data-Mode": "offline",
        "X-Kebu-Offline-Sync": "1",
      },
    },
  );
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
    if (item.kind === "save_chrome") return await flushSaveChrome(item);
    if (item.kind === "save_settings") return await flushSaveSettings(item);
    if (item.kind === "save_batch_sections") return await flushSaveBatchSections(item);
    if (item.kind === "sync_nav") return await flushSyncNav(item);
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
 * - terminalItems in the result lists any items that became terminal this
 *   flush pass so callers can surface them in the UI.
 */
export function flushOfflineQueue(): Promise<FlushResult> {
  if (activeFlush) return activeFlush;
  activeFlush = _runFlush().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

async function _runFlush(): Promise<FlushResult> {
  const terminalBefore = new Set(
    readQueue()
      .filter((i) => i.status === "terminal")
      .map((i) => i.id),
  );

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
    return { synced: 0, failed: 0, remaining: readQueue().length, terminalItems: [] };
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

  // Collect newly-terminal items (became terminal during this flush pass).
  const afterItems = readQueue();
  const newTerminals = afterItems.filter(
    (i) => i.status === "terminal" && !terminalBefore.has(i.id),
  );
  const terminalItems: TerminalItem[] = newTerminals.map((i) => ({
    id: i.id,
    kind: i.kind,
    lastError: i.lastError,
    description: describeTerminalItem(i),
    sectionId: i.kind === "save_section" ? i.payload.sectionId : undefined,
  }));

  return { synced, failed, remaining: readQueue().length, terminalItems };
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
