import { notifyReportChange } from './reportNotifications.js';
import { isActiveReport, severityLevels } from './reportPriority.js';

export const categories = ['Baches', 'Basura clandestina', 'Ramas/arbolado', 'Aceras dañadas'];

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('El navegador no permite guardar reportes.'));
    const request = indexedDB.open('reporte-ciudadano', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('reports', { keyPath: 'ticket' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento.'));
    request.onblocked = () => reject(new Error('Cierra otras pestañas de la aplicación e inténtalo de nuevo.'));
  });
}

async function transaction(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = database.transaction('reports', mode);
    } catch {
      database.close();
      reject(new Error('No se pudo iniciar la operación del reporte.'));
      return;
    }
    let result;
    let failure = null;
    let settled = false;
    tx.oncomplete = () => {
      database.close();
      settled = true;
      resolve(result);
    };
    tx.onabort = () => {
      database.close();
      if (settled) return;
      settled = true;
      reject(failure || new Error('No se pudo guardar o consultar el reporte. Revisa el espacio disponible e inténtalo de nuevo.'));
    };
    tx.onerror = () => {};
    const abort = (error) => {
      failure = error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'No se pudo actualizar el reporte.');
      try {
        tx.abort();
      } catch {
        database.close();
        if (!settled) {
          settled = true;
          reject(failure);
        }
      }
    };
    try {
      action(tx.objectStore('reports'), (value) => { result = value; }, abort);
    } catch (error) {
      abort(error);
    }
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

// A persistent anonymous browser ID; it is not an authentication system.
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

export async function createReport({ audio, photos, position, capturedAt, reporterId = null } = {}) {
  const normalizedPhotos = validatePhotos(photos);
  if (!audio?.size && !normalizedPhotos.length) throw new Error('Graba una nota de voz o adjunta una fotografía.');
  validatePosition(position);
  const createdAt = new Date().toISOString();
  const ticket = `RC-${crypto.randomUUID()}`;
  const report = {
    ticket, createdAt, capturedAt, updatedAt: createdAt, status: 'Registrado / Recibido',
    audio, photos: normalizedPhotos, position, originalPosition: position, description: '', transcription: '',
    category: '', references: '', receptionEvent: 'Nuevo reporte', reporterId, confirmations: [],
    history: [{ at: createdAt, action: 'Reporte registrado' }],
  };
  await transaction('readwrite', (store) => store.add(report));
  notifyReportChange({ type: 'created', ticket });
  return report;
}

export function complementReport(ticket, details, photos) {
  if (typeof ticket !== 'string' || !ticket.trim()) throw new Error('El ticket del reporte no es válido.');
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    throw new Error('Los datos de complementación no son válidos.');
  }
  const optionalText = (value, label, maxLength) => {
    if (value == null) return '';
    if (typeof value !== 'string') throw new Error(`${label} debe ser texto.`);
    if (value.length > maxLength) throw new Error(`${label} no puede superar ${maxLength} caracteres.`);
    const text = value.trim();
    return text;
  };
  const description = optionalText(details.description, 'La descripción', 5000);
  const transcription = optionalText(details.transcription, 'El complemento de la nota', 5000);
  const references = optionalText(details.references, 'Las señas o referencias', 2000);
  const category = details.category ?? '';
  if (typeof category !== 'string') throw new Error('Selecciona una categoría válida.');
  if (category && !categories.includes(category)) throw new Error('Selecciona una categoría válida.');
  validatePosition(details.position);
  if (photos != null && typeof photos[Symbol.iterator] !== 'function') {
    throw new Error('La selección de fotografías no es válida.');
  }
  const newPhotos = validatePhotos(photos);

  return transaction('readwrite', (store, done, abort) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      try {
        const current = request.result;
        if (!current) throw new Error('No se encontró el reporte para ese ticket.');
        const at = new Date().toISOString();
        const positionChanged = details.position.lat !== current.position?.lat
          || details.position.lng !== current.position?.lng;
        const report = {
          ...current,
          category,
          description,
          transcription,
          references,
          position: details.position,
          photos: [...(Array.isArray(current.photos) ? current.photos : []), ...newPhotos],
          updatedAt: at,
          receptionEvent: 'Información complementada',
          history: [
            ...(Array.isArray(current.history) ? current.history : []),
            { at, action: positionChanged
              ? 'Información complementada y ubicación confirmada'
              : 'Información complementada' },
          ],
        };
        const write = store.put(report);
        write.onsuccess = () => done(report);
      } catch (failure) {
        abort(failure);
      }
    };
  }).then((report) => {
    notifyReportChange({ type: 'updated', ticket });
    return report;
  });
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
        history: [...(Array.isArray(current.history) ? current.history : []), { at, action: `Severidad técnica asignada: ${severity || 'Sin clasificar'}` }],
      };
      store.put(report); done(report);
    };
  }).then((report) => {
    notifyReportChange({ type: 'updated', ticket });
    return report;
  });
}

export function confirmIncident(ticket, photos, reporterId) {
  if (typeof ticket !== 'string' || !ticket.trim()) throw new Error('El ticket del reporte no es válido.');
  if (typeof reporterId !== 'string' || !reporterId.trim()) throw new Error('No se pudo identificar al participante.');
  const newPhotos = validatePhotos(photos);
  return transaction('readwrite', (store, done, fail) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return fail('El reporte solicitado no existe.');
      if (!isActiveReport(current)) return fail('El reporte no admite confirmaciones porque ya está cerrado.');
      if (current.reporterId && current.reporterId === reporterId) return fail('No puedes confirmar tu propio reporte.');
      const confirmations = Array.isArray(current.confirmations) ? current.confirmations : [];
      if (confirmations.some((item) => item.reporterId === reporterId)) {
        return fail('Ya confirmaste anteriormente este reporte.');
      }
      const at = new Date().toISOString();
      const updated = {
        ...current,
        confirmations: [...confirmations, { reporterId, at, photos: newPhotos }],
        updatedAt: at,
        receptionEvent: 'Confirmación ciudadana',
        history: [...(Array.isArray(current.history) ? current.history : []), { at, action: 'Incidente confirmado por un vecino' }],
      };
      store.put(updated);
      done(updated);
    };
  }).then((report) => {
    notifyReportChange({ type: 'updated', ticket });
    return report;
  });
}

export function resolveIncident(ticket) {
  if (typeof ticket !== 'string' || !ticket.trim()) throw new Error('El ticket del reporte no es válido.');
  return transaction('readwrite', (store, done, fail) => {
    const request = store.get(ticket);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return fail('El reporte solicitado no existe.');
      if (!isActiveReport(current)) return fail('El reporte ya está cerrado.');
      const at = new Date().toISOString();
      const resolved = {
        ...current,
        status: 'Resuelto',
        resolvedAt: at,
        updatedAt: at,
        receptionEvent: 'Reporte resuelto',
        history: [...(Array.isArray(current.history) ? current.history : []), { at, action: 'Reporte marcado como resuelto' }],
      };
      store.put(resolved);
      done(resolved);
    };
  }).then((report) => {
    notifyReportChange({ type: 'updated', ticket });
    return report;
  });
}
