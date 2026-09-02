// =============================================================
// 音频文件本地存储（IndexedDB）。
// 面试录音属于大文件，不放入 localStorage；
// 这里按 interviewId 保存 Blob，UI 只保存元数据引用。
// =============================================================

const DB_NAME = "job-os-audio";
const STORE = "files";

/** 内存兜底：IndexedDB 不可用（隐私模式等）时，仅本次会话可回放 */
const memoryFallback = new Map<string, Blob>();

let memoryMode = false;

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      memoryMode = true;
      resolve(null);
      return;
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      memoryMode = true;
      resolve(null);
    };
  });
}

export async function saveAudio(
  key: string,
  blob: Blob
): Promise<{ stored: boolean; mode: "idb" | "memory" }> {
  const db = await openDB();
  if (!db) {
    memoryFallback.set(key, blob);
    return { stored: true, mode: "memory" };
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve({ stored: true, mode: "idb" });
    tx.onerror = () => reject(new Error("音频保存失败"));
  });
}

export async function getAudio(key: string): Promise<Blob | null> {
  if (memoryFallback.has(key)) return memoryFallback.get(key) ?? null;
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function deleteAudio(key: string): Promise<void> {
  memoryFallback.delete(key);
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
