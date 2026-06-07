import type { ExportSettings } from './settings';

export type HistoryItem = ExportSettings & {
  id: string;
  createdAt: number;
  blob: Blob;
};

const DB_NAME = 'transparent-video-gif-history';
const STORE_NAME = 'exports';
const VERSION = 1;

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openHistoryDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function listHistory(): Promise<HistoryItem[]> {
  const items = await withStore<HistoryItem[]>('readonly', (store) => store.getAll());
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  await withStore<IDBValidKey>('readwrite', (store) => store.put(item));
  const items = await listHistory();
  const staleItems = items.slice(3);

  for (const stale of staleItems) {
    await withStore<undefined>('readwrite', (store) => store.delete(stale.id));
  }
}

export async function clearHistory(): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.clear());
}
