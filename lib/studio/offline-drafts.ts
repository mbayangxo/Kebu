import type { CanvasDocument, StudioDesignType } from "@/lib/studio/canvas-document";
import type { StudioDesignRole } from "@/lib/studio/design-access";

const DB_NAME = "kebu-studio-offline";
const DB_VERSION = 2;
const STORE = "drafts";
const MEDIA_STORE = "media";

export type StudioOfflineDraft = {
  key: string;
  userId: string;
  designId: string;
  designTitle: string;
  canvas: CanvasDocument;
  designType: StudioDesignType;
  /** Preserve Personal Kebu vs Business Kebu while offline. */
  businessId?: string | null;
  /** Last server-verified design role; never upgrade a user to owner just because they are offline. */
  accessRole?: StudioDesignRole | null;
  serverUpdatedAt: string | null;
  savedAt: string;
  dirty: boolean;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline Studio storage."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("designId", "designId", { unique: false });
        store.createIndex("userId", "userId", { unique: false });
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        const media = db.createObjectStore(MEDIA_STORE, { keyPath: "key" });
        media.createIndex("designId", "designId", { unique: false });
        media.createIndex("userId", "userId", { unique: false });
        media.createIndex("cachedAt", "cachedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export function studioOfflineDraftKey(userId: string, designId: string) {
  return `${userId}:${designId}`;
}

export async function putStudioOfflineDraft(draft: Omit<StudioOfflineDraft, "key">) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save offline draft."));
      tx.objectStore(STORE).put({ ...draft, key: studioOfflineDraftKey(draft.userId, draft.designId) });
    });
  } finally {
    db.close();
  }
}

export async function getStudioOfflineDraft(userId: string, designId: string): Promise<StudioOfflineDraft | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("Could not read offline draft."));
      const request = tx.objectStore(STORE).get(studioOfflineDraftKey(userId, designId));
      request.onerror = () => reject(request.error ?? new Error("Could not read offline draft."));
      request.onsuccess = () => resolve((request.result as StudioOfflineDraft | undefined) ?? null);
    });
  } finally {
    db.close();
  }
}

export async function deleteStudioOfflineDraft(userId: string, designId: string) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not clear offline draft."));
      tx.objectStore(STORE).delete(studioOfflineDraftKey(userId, designId));
    });
  } finally {
    db.close();
  }
}

export function studioOfflineSupported() {
  return typeof window !== "undefined" && "indexedDB" in window;
}


export type StudioOfflineDesignMedia = {
  key: string;
  userId: string;
  designId: string;
  url: string;
  blob: Blob;
  cachedAt: string;
};

export function studioDesignOfflineMediaKey(userId: string, designId: string, url: string) {
  return `${userId}:${designId}:${url}`;
}

export async function cacheStudioDesignMedia(row: StudioOfflineDesignMedia) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not cache Studio media."));
      tx.objectStore(MEDIA_STORE).put(row);
    });
  } finally {
    db.close();
  }
}

export async function getCachedStudioDesignMedia(key: string): Promise<StudioOfflineDesignMedia | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readonly");
      const request = tx.objectStore(MEDIA_STORE).get(key);
      request.onerror = () => reject(request.error ?? new Error("Could not read cached Studio media."));
      request.onsuccess = () => resolve((request.result as StudioOfflineDesignMedia | undefined) ?? null);
    });
  } finally {
    db.close();
  }
}

export async function listCachedStudioDesignMedia(userId: string, designId: string): Promise<StudioOfflineDesignMedia[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readonly");
      const request = tx.objectStore(MEDIA_STORE).getAll();
      request.onerror = () => reject(request.error ?? new Error("Could not inspect cached Studio media."));
      request.onsuccess = () => resolve(
        ((request.result as StudioOfflineDesignMedia[] | undefined) ?? [])
          .filter((row) => row.userId === userId && row.designId === designId)
          .sort((a, b) => a.cachedAt.localeCompare(b.cachedAt)),
      );
    });
  } finally {
    db.close();
  }
}

export async function removeCachedStudioDesignMedia(key: string) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not remove cached Studio media."));
      tx.objectStore(MEDIA_STORE).delete(key);
    });
  } finally {
    db.close();
  }
}

export async function cacheRemoteStudioDesignMedia(
  userId: string,
  designId: string,
  url: string,
  maxFileBytes = 25 * 1024 * 1024,
) {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error("Could not cache Studio media.");
  const length = Number(response.headers.get("content-length") || "0");
  if (length > maxFileBytes) throw new Error("Studio media is too large for offline cache.");
  const blob = await response.blob();
  if (!blob.size || blob.size > maxFileBytes) throw new Error("Studio media is too large for offline cache.");
  const key = studioDesignOfflineMediaKey(userId, designId, url);
  await cacheStudioDesignMedia({
    key,
    userId,
    designId,
    url,
    blob,
    cachedAt: new Date().toISOString(),
  });
  return key;
}

export async function pruneStudioDesignMediaCache(
  userId: string,
  designId: string,
  maxBytes = 120 * 1024 * 1024,
) {
  const rows = await listCachedStudioDesignMedia(userId, designId);
  let bytesRemaining = rows.reduce((sum, row) => sum + row.blob.size, 0);
  let removed = 0;
  for (const row of rows) {
    if (bytesRemaining <= maxBytes) break;
    await removeCachedStudioDesignMedia(row.key);
    bytesRemaining -= row.blob.size;
    removed += 1;
  }
  return { removed, bytesRemaining: Math.max(0, bytesRemaining) };
}
