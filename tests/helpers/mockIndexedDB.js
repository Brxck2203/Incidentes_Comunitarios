// In-memory IndexedDB stand-in used for repository behavior tests, not a browser substitute.
import assert from 'node:assert/strict';
export function mockIndexedDB(preexisting = [], version = null) {
  const records = new Map(preexisting.map((item) => [item.ticket, item]));
  const state = { version: version === null ? (preexisting.length ? 1 : 0) : version, hasCategoryIndex: false };
  const indexNames = { contains: (name) => name === 'category' && state.hasCategoryIndex };
  const store = {
    indexNames,
    createIndex: (name) => { if (name === 'category') state.hasCategoryIndex = true; },
  };
  const db = {
    objectStoreNames: { contains: (name) => name === 'reports' && state.version >= 1 },
    close: () => {},
    createObjectStore: () => store,
    transaction(_name, _mode) {
      let pending = 0;
      let completeTimer;
      let aborted = false;
      const tx = {
        oncomplete: null, onabort: null, onerror: null,
        abort() {
          if (aborted) return;
          aborted = true;
          if (completeTimer) clearTimeout(completeTimer);
          setTimeout(() => tx.onabort?.(), 0);
        },
        objectStore() {
          const request = (action) => {
            const result = { onsuccess: null, onerror: null, transaction: tx };
            pending += 1;
            if (completeTimer) clearTimeout(completeTimer);
            setTimeout(() => {
              if (aborted) return;
              result.result = action();
              result.onsuccess?.();
              pending -= 1;
              if (pending === 0 && !aborted) completeTimer = setTimeout(() => tx.oncomplete?.(), 0);
            }, 0);
            return result;
          };
          return {
            get: (key) => request(() => records.get(key)),
            getAll: () => request(() => Array.from(records.values())),
            add: (value) => request(() => { if (records.has(value.ticket)) throw Error('duplicate key'); records.set(value.ticket, value); }),
            put: (value) => request(() => { records.set(value.ticket, value); }),
            index: (name) => {
              assert.equal(name, 'category'); assert.ok(state.hasCategoryIndex);
              return { getAll: (category) => request(() => Array.from(records.values()).filter((value) => value.category === category)) };
            },
          };
        },
      };
      return tx;
    },
  };
  globalThis.window = { indexedDB: { open: (_name, v) => {
    const req = { result: db, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
    setTimeout(() => {
      if (v > state.version) {
        req.transaction = { objectStore: () => store };
        req.onupgradeneeded?.(); state.version = v;
      }
      req.onsuccess?.();
    }, 0);
    return req;
  } } };
  globalThis.indexedDB = window.indexedDB;
  return { state, records };
}
export const original = {
  ticket: 'RC-old', createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z',
  status: 'Registrado / Recibido', category: 'Baches', position: { lat: 10, lng: -84 },
  originalPosition: { lat: 10, lng: -84, accuracy: 5 },
  description: '', transcription: '', references: '', audio: null, photos: [],
  history: [{ at: '2026-11-12T10:00:00.000Z', action: 'Reporte registrado' }],
};
