import type { CanvasDocument, StudioDesignType } from "@/lib/studio/canvas-document";

const DB_NAME = "kebu-studio-offline";
const DB_VERSION = 1;
const STORE = "drafts";

export type StudioOfflineDraft = {
  key: string;
  userId: string;
  designId: string;
  canvas: CanvasDocument;
  designType: StudioDesignType;
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
