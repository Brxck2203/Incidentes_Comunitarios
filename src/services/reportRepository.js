import { nearbyMatches } from './reportDuplicates.js';

export const categories = ['Baches', 'Basura clandestina', 'Ramas/arbolado', 'Aceras dañadas'];

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('El navegador no permite guardar reportes.'));
    const request = indexedDB.open('reporte-ciudadano', 2);
    // Upgrade existing v1 reports in place; no previously registered case is deleted.
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains('reports')
        ? request.transaction.objectStore('reports')
        : database.createObjectStore('reports', { keyPath: 'ticket' });
      if (!store.indexNames.contains('category')) store.createIndex('category', 'category', { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento.'));
    request.onblocked = () => reject(new Error('Cierra otras pestañas de la aplicación e inténtalo de nuevo.'));
  });
}

async function transaction(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('reports', mode);
    let result;
    tx.oncomplete = () => { database.close(); resolve(result); };
    tx.onabort = () => { database.close(); reject(new Error('No se pudo guardar o consultar el reporte. Revisa el espacio disponible e inténtalo de nuevo.')); };
    tx.onerror = () => {};
    try { action(tx.objectStore('reports'), (value) => { result = value; }); }
    catch (error) { tx.abort(); reject(error); }
  });
}

export function getReports() {
  return transaction('readonly', (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done(request.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

export function getReport(ticket) {
  return transaction('readonly', (store, done) => {
    const request = store.get(ticket);
    request.onsuccess = () => done(request.result ?? null);
  });
}

export function validatePosition(position) {
  if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng)
    || Math.abs(position.lat) > 90 || Math.abs(position.lng) > 180) {
    throw new Error('La ubicación no es válida.');
  }
}

export function validatePhotos(files) {
  const photos = Array.from(files ?? []);
  if (photos.length > 8) throw new Error('Selecciona un máximo de ocho fotografías por carga.');
  for (const photo of photos) {
    if (!photo || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(photo.type)) {
      throw new Error('Utiliza fotografías JPG, PNG, WebP o AVIF.');
    }
    if (!Number.isFinite(photo.size) || photo.size <= 0 || photo.size > 10 * 1024 * 1024) {
      throw new Error('Cada fotografía debe ocupar entre 1 byte y 10 MB.');
    }
  }
  return photos;
}

export async function createReport({ audio, photos, position, capturedAt, category = '' }) {
  validatePosition(position);
  if (category && !categories.includes(category)) throw new Error('Selecciona una categoría válida.');
  if (!audio?.size && !photos.length) throw new Error('Graba una nota de voz o adjunta una fotografía.');
  const createdAt = new Date().toISOString();
  const ticket = `RC-${crypto.randomUUID()}`;
  const report = {
    ticket, createdAt, capturedAt, updatedAt: createdAt, status: 'Registrado / Recibido',
    audio, photos, position, originalPosition: position, description: '', transcription: '',
    category, references: '', receptionEvent: 'Nuevo reporte',
    history: [{ at: createdAt, action: 'Reporte registrado' }],
  };
  await transaction('readwrite', (store) => store.add(report));
  notifyReportCreated();
  return report;
}

export function complementReport(ticket, details, photos) {
  validatePosition(details.position);
  if (details.category && !categories.includes(details.category)) throw new Error('Selecciona una categoría válida.');
  return transaction('readwrite', (store, done) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) { request.transaction.abort(); return; }
      const at = new Date().toISOString();
      const report = { ...current,
        category: details.category, description: details.description.trim(),
        transcription: details.transcription.trim(), references: details.references.trim(),
        position: details.position, photos: [...current.photos, ...photos], updatedAt: at,
        receptionEvent: 'Información complementada',
        history: [...current.history, { at, action: 'Información complementada y ubicación confirmada' }],
      };
      store.put(report);
      done(report);
    };
  });
}

// HU-06: filter on an indexed category before performing an exact geographic comparison.
export function findPotentialDuplicates(position, category, excludeTicket = null) {
  validatePosition(position);
  if (!category) return Promise.resolve([]);
  if (!categories.includes(category)) return Promise.reject(new Error('Selecciona una categoría válida.'));
  return transaction('readonly', (store, done) => {
    const request = store.index('category').getAll(category);
    request.onsuccess = () => done(nearbyMatches(request.result, position, category, excludeTicket));
  });
}
