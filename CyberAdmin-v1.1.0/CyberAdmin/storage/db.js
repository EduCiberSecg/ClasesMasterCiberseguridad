// Capa de almacenamiento: IndexedDB (navegador) con respaldo en memoria (tests / entornos sin IndexedDB).
const DB_NAME = 'cyberadmin';
const DB_VERSION = 1;
export const STORES = ['incidents', 'alerts', 'audit', 'analyses', 'checklists', 'kv'];
const keyPathOf = (s) => (s === 'kv' ? 'key' : 'id');

const mem = Object.fromEntries(STORES.map((s) => [s, new Map()]));
const useMem = () => typeof indexedDB === 'undefined';
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: keyPathOf(s) });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const rq = fn(t.objectStore(store));
    t.oncomplete = () => resolve(rq ? rq.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transacción abortada'));
  });
}

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export async function put(store, value) {
  if (useMem()) { mem[store].set(value[keyPathOf(store)], clone(value)); return value; }
  await run(store, 'readwrite', (s) => s.put(value));
  return value;
}
export async function get(store, id) {
  if (useMem()) return clone(mem[store].get(id));
  return run(store, 'readonly', (s) => s.get(id));
}
export async function getAll(store) {
  if (useMem()) return [...mem[store].values()].map(clone);
  return run(store, 'readonly', (s) => s.getAll());
}
export async function del(store, id) {
  if (useMem()) { mem[store].delete(id); return; }
  await run(store, 'readwrite', (s) => s.delete(id));
}
export async function clear(store) {
  if (useMem()) { mem[store].clear(); return; }
  await run(store, 'readwrite', (s) => s.clear());
}
export async function clearAll() { for (const s of STORES) await clear(s); }

export async function kvGet(key, fallback = null) {
  const r = await get('kv', key);
  return r ? r.value : fallback;
}
export async function kvSet(key, value) { await put('kv', { key, value }); }

export function newId() {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
export async function nextCounter(name) {
  const n = (await kvGet('counter:' + name, 0)) + 1;
  await kvSet('counter:' + name, n);
  return n;
}
