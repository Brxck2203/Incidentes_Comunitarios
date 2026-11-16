import { nearbyMatches } from './reportDuplicates.js';
import { isActiveReport } from './reportEndorsements.js';
import { severityLevels } from './reportPriority.js';
import { notifyReportCreated } from './reportNotifications.js';

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
    let reason;
    tx.oncomplete = () => { database.close(); resolve(result); };
    tx.onabort = () => { database.close(); reject(reason || new Error('No se pudo guardar o consultar el reporte. Revisa el espacio disponible e inténtalo de nuevo.')); };
    tx.onerror = () => {};
    const fail = (message) => { reason = new Error(message); tx.abort(); };
    try { action(tx.objectStore('reports'), (value) => { result = value; }, fail); }
    catch (error) { reason = error; tx.abort(); }
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

export async function createReport({ audio, photos, position, capturedAt, category = '', reporterId = null }) {
  const checkedPhotos = validatePhotos(photos);
  validatePosition(position);
  if (category && !categories.includes(category)) throw new Error('Selecciona una categoría válida.');
  if (!audio?.size && !checkedPhotos.length) throw new Error('Graba una nota de voz o adjunta una fotografía.');
  const createdAt = new Date().toISOString();
  const ticket = `RC-${crypto.randomUUID()}`;
  const report = {
    ticket, createdAt, capturedAt, updatedAt: createdAt, status: 'Registrado / Recibido',
    audio, photos: checkedPhotos, position, originalPosition: position, description: '', transcription: '',
    category, references: '', receptionEvent: 'Nuevo reporte', reporterId, confirmations: [], severity: '',
    history: [{ at: createdAt, action: 'Reporte registrado' }],
  };
  await transaction('readwrite', (store) => store.add(report));
  notifyReportCreated();
  return report;
}

export async function complementReport(ticket, details, photos) {
  validatePosition(details.position);
  const checkedPhotos = validatePhotos(photos);
  if (details.category && !categories.includes(details.category)) throw new Error('Selecciona una categoría válida.');
  const updated = await transaction('readwrite', (store, done, fail) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return fail('El reporte solicitado no existe.');
      const at = new Date().toISOString();
      const report = { ...current,
        category: details.category, description: details.description.trim(),
        transcription: details.transcription.trim(), references: details.references.trim(),
        position: details.position, photos: [...(current.photos || []), ...checkedPhotos], updatedAt: at,
        receptionEvent: 'Información complementada',
        history: [...current.history, { at, action: 'Información complementada y ubicación confirmada' }],
      };
      store.put(report);
      done(report);
    };
  });
  notifyReportCreated();
  return updated;
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

// This anonymous browser ID is for the local prototype only; it is not authentication.
export function getCurrentReporterId() {
  const key = 'reporte-ciudadano-participante';
  try {
    let id = localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  } catch {
    throw new Error('Para confirmar incidentes, habilita el almacenamiento del navegador.');
  }
}


// HU-10: a local browser identity may endorse an active report once and subscribe to resolution.
export async function confirmIncident(ticket, uploadedPhotos, reporterId) {
  const photos = validatePhotos(uploadedPhotos);
  if (!reporterId) throw new Error('No se pudo identificar este navegador.');
  const updated = await transaction('readwrite', (store, done, fail) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return fail('El reporte solicitado no existe.');
      if (!isActiveReport(current)) return fail('Este incidente ya no admite confirmaciones.');
      if (current.reporterId && current.reporterId === reporterId) return fail('No puedes confirmar tu propio reporte.');
      if ((current.confirmations || []).some((entry) => entry.reporterId === reporterId)) return fail('Ya confirmaste este incidente anteriormente.');
      const at = new Date().toISOString();
      const report = { ...current,
        confirmations: [...(current.confirmations || []), { reporterId, at, photos }],
        updatedAt: at, receptionEvent: 'Confirmación ciudadana recibida',
        history: [...current.history, { at, action: 'Incidente confirmado por otro vecino (suscripción a resolución)' }],
      };
      store.put(report);
      done(report);
    };
  });
  notifyReportCreated();
  return updated;
}

export function setReportSeverity(ticket, severity) {
  if (severity !== '' && !severityLevels.includes(severity)) throw new Error('Selecciona una severidad válida.');
  return transaction('readwrite', (store, done, fail) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return fail('El reporte solicitado no existe.');
      if (!isActiveReport(current)) return fail('No se puede cambiar la severidad de un incidente cerrado.');
      if ((current.severity || '') === severity) { done(current); return; }
      const at = new Date().toISOString();
      const report = { ...current, severity, updatedAt: at, receptionEvent: 'Severidad actualizada',
        history: [...current.history, { at, action: `Severidad técnica asignada: ${severity || 'Sin clasificar'}` }],
      };
      store.put(report);
      done(report);
    };
  }).then((updated) => {
    notifyReportCreated();
    return updated;
  });
}

// Minimal local status transition needed to demonstrate HU-10's resolution subscriptions.
export async function resolveIncident(ticket) {
  const updated = await transaction('readwrite', (store, done, fail) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return fail('El reporte solicitado no existe.');
      if (!isActiveReport(current)) return fail('Este reporte ya está cerrado.');
      const at = new Date().toISOString();
      const report = { ...current, status: 'Resuelto', resolvedAt: at, updatedAt: at,
        receptionEvent: 'Incidente resuelto',
        history: [...current.history, { at, action: 'Incidente marcado como resuelto' }],
      };
      store.put(report);
      done(report);
    };
  });
  notifyReportCreated();
  return updated;
}
