/**
 * Offline Queue — IndexedDB-based action queue.
 * Stores actions when offline, replays on reconnect.
 */
const DB_NAME = "nextx-offline";
const DB_VERSION = 1;
const STORE_NAME = "actions";

export interface OfflineAction {
  id: string;
  type: "send_message" | "edit_message" | "delete_message" | "reaction" | "pin" | "read" | "draft";
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueAction(action: Omit<OfflineAction, "id" | "createdAt" | "retries">): Promise<string> {
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: OfflineAction = {
    ...action,
    id,
    createdAt: Date.now(),
    retries: 0,
  };
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(full);
    return id;
  } catch {
    return id;
  }
}

export async function getQueuedActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).index("createdAt").getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeAction(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    // ignore
  }
}

export async function clearQueue(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // ignore
  }
}

export async function getQueueSize(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
