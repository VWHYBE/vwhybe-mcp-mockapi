import type { MockEndpoint, RequestHistoryEntry } from "@/types";

const DB_NAME = "mockapi-ui";
/** Must be >= any existing DB version in the browser to avoid VersionError. */
const DB_VERSION = 12;
const STORE_NAME = "endpoints";
const KEY = "list";
const HISTORY_KEY = "requestHistory";
const MAX_HISTORY = 20;

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

export const getEndpointsFromIndexedDB = async (): Promise<MockEndpoint[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY);
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
};

export const saveEndpointsToIndexedDB = async (
  endpoints: MockEndpoint[]
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(endpoints, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const getRequestHistoryFromIndexedDB =
  async (): Promise<RequestHistoryEntry[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HISTORY_KEY);
      req.onsuccess = () => {
        const raw = req.result;
        resolve(Array.isArray(raw) ? raw : []);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  };

export const saveRequestHistoryToIndexedDB = async (
  entries: RequestHistoryEntry[]
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(entries.slice(-MAX_HISTORY), HISTORY_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};
