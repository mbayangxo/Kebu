import type { StudioComposition } from "@/lib/studio/composition";

const DB_NAME = "kebu-studio-video-offline";
const DB_VERSION = 2;
const STORE = "drafts";
const MEDIA_STORE = "media";

export type StudioVideoOfflineDraft = {
  key: string;
  userId: string;
  projectId: string;
  title: string;
  composition: StudioComposition;
  businessId: string | null;
  sourceDesignId?: string | null;
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
    request.onerror = () => reject(request.error ?? new Error("Could not open offline Studio video storage."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export function studioVideoOfflineDraftKey(userId: string, projectId: string) {
  return `${userId}:${projectId}`;
}

export async function putStudioVideoOfflineDraft(draft: Omit<StudioVideoOfflineDraft, "key">) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save offline Studio video draft."));
      tx.objectStore(STORE).put({ ...draft, key: studioVideoOfflineDraftKey(draft.userId, draft.projectId) });
    });
  } finally {
    db.close();
  }
}

export async function getStudioVideoOfflineDraft(userId: string, projectId: string): Promise<StudioVideoOfflineDraft | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("Could not read offline Studio video draft."));
      const request = tx.objectStore(STORE).get(studioVideoOfflineDraftKey(userId, projectId));
      request.onerror = () => reject(request.error ?? new Error("Could not read offline Studio video draft."));
      request.onsuccess = () => resolve((request.result as StudioVideoOfflineDraft | undefined) ?? null);
    });
  } finally {
    db.close();
  }
}

export function studioVideoOfflineSupported() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

export type StudioOfflineMedia={key:string;userId:string;projectId:string;url:string;blob:Blob;cachedAt:string};
export async function cacheStudioVideoMedia(row:StudioOfflineMedia){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,"readwrite");tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.objectStore(MEDIA_STORE).put(row)})}finally{db.close()}}
export async function getCachedStudioVideoMedia(key:string):Promise<StudioOfflineMedia|null>{const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,"readonly"),r=tx.objectStore(MEDIA_STORE).get(key);r.onsuccess=()=>resolve((r.result as StudioOfflineMedia|undefined)??null);r.onerror=()=>reject(r.error)})}finally{db.close()}}
export function studioOfflineMediaKey(userId:string,projectId:string,url:string){return `${userId}:${projectId}:${url}`}

export async function removeCachedStudioVideoMedia(key:string){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,"readwrite");tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.objectStore(MEDIA_STORE).delete(key)})}finally{db.close()}}
export async function resolveStudioMediaObjectUrl(userId:string,projectId:string,url:string){const row=await getCachedStudioVideoMedia(studioOfflineMediaKey(userId,projectId,url));return row?URL.createObjectURL(row.blob):url}
export async function cacheRemoteStudioMedia(userId:string,projectId:string,url:string){const res=await fetch(url,{credentials:"omit"});if(!res.ok)throw new Error("Could not cache Studio media.");const blob=await res.blob();if(blob.size>25*1024*1024)throw new Error("Media is too large for offline cache.");const key=studioOfflineMediaKey(userId,projectId,url);await cacheStudioVideoMedia({key,userId,projectId,url,blob,cachedAt:new Date().toISOString()});return key}
