import type { NativeDirectoryHandle } from "./fs-access";

const DB_NAME = "firstStudio_localFolder_v1";
const STORE_NAME = "handles";
const CURRENT_KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export async function saveDirectoryHandle(
  handle: NativeDirectoryHandle,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, CURRENT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
  db.close();
}

export async function loadDirectoryHandle(): Promise<NativeDirectoryHandle | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return null;
  }
  try {
    const db = await openDb();
    const result = await new Promise<NativeDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(CURRENT_KEY);
        req.onsuccess = () =>
          resolve((req.result as NativeDirectoryHandle | undefined) ?? null);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
      },
    );
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(CURRENT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    });
    db.close();
  } catch {
    // Ignore storage cleanup errors
  }
}
