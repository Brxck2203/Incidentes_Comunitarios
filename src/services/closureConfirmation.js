import { isSecondaryReport } from './municipalDecisions.js';
import { notifyReportChange } from './reportNotifications.js';

// TODO: consumir estructura de cierre técnico de HU-18 cuando se integre
// TODO: integrar acción Reportar inconformidad / persistencia cuando se integre HU-26

export const DEFAULT_CLOSURE_CONFIRMATION_HOURS = 72;
export const ATTENDED_STATUS = 'Atendido';
export const ARCHIVED_CLOSURE_STATUS = 'Cerrado / Archivado';

const DEPARTMENT_BY_CATEGORY = {
  'Baches': 'Red Vial',
  'Basura clandestina': 'Gestión Ambiental',
  'Ramas/arbolado': 'Parques y Ornato',
  'Aceras dañadas': 'Mantenimiento de Infraestructura',
};

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('El navegador no permite guardar reportes.'));
    }
    const request = indexedDB.open('reporte-ciudadano', 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains('reports')
        ? request.transaction.objectStore('reports')
        : database.createObjectStore('reports', { keyPath: 'ticket' });
      if (!store.indexNames.contains('category')) {
        store.createIndex('category', 'category', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento.'));
    request.onblocked = () => reject(new Error('Cierra otras pestañas de la aplicación e inténtalo de nuevo.'));
  });
}

function resolveConfirmationHours(customHours) {
  if (Number.isFinite(customHours) && customHours > 0) {
    return customHours;
  }
  return DEFAULT_CLOSURE_CONFIRMATION_HOURS;
}

/**
 * Determina si un reporte cuenta con cierre técnico («Atendido», «Resuelto» o «Cerrado / Archivado»).
 */
export function hasTechnicalClosure(report) {
  if (!report || typeof report !== 'object') return false;
  const status = (report.status || '').trim().toLocaleLowerCase();
  return (
    status === 'atendido' ||
    status === 'resuelto' ||
    status === ARCHIVED_CLOSURE_STATUS.toLocaleLowerCase() ||
    Boolean(report.closureArchived)
  );
}

/**
 * Extrae y normaliza la constancia digital de cierre de un expediente (HU-25 / RF-15),
 * calculando el estado del plazo configurable de confirmación ciudadana.
 */
export function extractClosureCertificate(report, options = {}) {
  if (!hasTechnicalClosure(report)) return null;

  const confirmationWindowHours = resolveConfirmationHours(
    options.confirmationHours ?? report.closureConfirmationHours,
  );
  const nowIso = options.now || new Date().toISOString();
  const nowMs = Date.parse(nowIso);

  const rawClosure =
    (report.closure && typeof report.closure === 'object' ? report.closure : null) ||
    (report.technicalClosure && typeof report.technicalClosure === 'object' ? report.technicalClosure : null) ||
    (report.closureCertificate && typeof report.closureCertificate === 'object' ? report.closureCertificate : null) ||
    {};

  const closedAt =
    rawClosure.closedAt ||
    rawClosure.attendedAt ||
    report.attendedAt ||
    report.resolvedAt ||
    report.updatedAt ||
    report.createdAt ||
    null;

  const closedAtMs = closedAt ? Date.parse(closedAt) : Number.NaN;
  const windowMs = confirmationWindowHours * 60 * 60 * 1000;
  const deadlineMs = Number.isFinite(closedAtMs) ? closedAtMs + windowMs : Number.NaN;
  const confirmationDeadlineAt = Number.isFinite(deadlineMs)
    ? new Date(deadlineMs).toISOString()
    : null;

  const department =
    (typeof rawClosure.department === 'string' && rawClosure.department.trim()) ||
    (typeof report.assignment?.department === 'string' && report.assignment.department.trim()) ||
    DEPARTMENT_BY_CATEGORY[report.category] ||
    'Dependencia municipal de atención';

  const crewName =
    (typeof rawClosure.crewName === 'string' && rawClosure.crewName.trim()) ||
    (typeof report.assignment?.crewName === 'string' && report.assignment.crewName.trim()) ||
    '';

  const technicalNote =
    (typeof rawClosure.technicalNote === 'string' && rawClosure.technicalNote.trim()) ||
    (typeof rawClosure.note === 'string' && rawClosure.note.trim()) ||
    (typeof report.resolutionNote === 'string' && report.resolutionNote.trim()) ||
    'Trabajo de reparación y atención concluido por el personal municipal encargado.';

  const rawPhotos =
    (Array.isArray(rawClosure.photos) && rawClosure.photos) ||
    (Array.isArray(rawClosure.closurePhotos) && rawClosure.closurePhotos) ||
    (Array.isArray(report.closurePhotos) && report.closurePhotos) ||
    (Array.isArray(report.resolutionPhotos) && report.resolutionPhotos) ||
    [];

  const isConfirmedByCitizen = Boolean(
    report.closureArchived ||
      report.solutionConfirmedAt ||
      (report.status || '').trim().toLocaleLowerCase() === ARCHIVED_CLOSURE_STATUS.toLocaleLowerCase(),
  );

  const windowExpired =
    !isConfirmedByCitizen &&
    Number.isFinite(deadlineMs) &&
    Number.isFinite(nowMs) &&
    nowMs > deadlineMs;

  const withinConfirmationWindow =
    !isConfirmedByCitizen &&
    (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs) || nowMs <= deadlineMs);

  const remainingHours =
    Number.isFinite(deadlineMs) && Number.isFinite(nowMs)
      ? Math.max(0, Math.ceil((deadlineMs - nowMs) / (60 * 60 * 1000)))
      : confirmationWindowHours;

  return {
    ticket: report.ticket,
    closedAt,
    department,
    crewName,
    technicalNote,
    photos: rawPhotos,
    hasClosurePhoto: rawPhotos.length > 0,
    confirmationWindowHours,
    confirmationDeadlineAt,
    remainingHours,
    isConfirmedByCitizen,
    solutionConfirmedAt: report.solutionConfirmedAt || null,
    windowExpired,
    isArchived: isConfirmedByCitizen || windowExpired,
    canConfirmSolution: !isConfirmedByCitizen && withinConfirmationWindow,
  };
}

/**
 * Aplica de forma pura la confirmación ciudadana de solución sobre un expediente atendido,
 * validando que esté dentro del plazo configurado y archivándolo definitivamente.
 */
export function applySolutionConfirmation(report, options = {}) {
  if (!report || typeof report.ticket !== 'string' || !report.ticket.trim()) {
    throw new Error('El reporte no existe para ese ticket.');
  }
  if (isSecondaryReport(report)) {
    throw new Error('La confirmación de cierre se registra sobre el expediente maestro.');
  }
  if (!hasTechnicalClosure(report)) {
    throw new Error('Solo los expedientes marcados como «Atendido» o resueltos pueden confirmarse para archivo definitivo.');
  }

  const certificate = extractClosureCertificate(report, options);
  if (certificate.isConfirmedByCitizen) {
    throw new Error('La solución de este expediente ya fue confirmada y archivada anteriormente.');
  }
  if (certificate.windowExpired) {
    throw new Error(
      `El plazo de ${certificate.confirmationWindowHours} horas para confirmar la solución ya expiró; el expediente quedó archivado automáticamente.`,
    );
  }

  const at = options.now || new Date().toISOString();
  const previousHistory = Array.isArray(report.history) ? report.history : [];

  const historyEntry = {
    at,
    type: 'citizen-closure-confirmation',
    responsible: 'Ciudadano reportante',
    role: 'Ciudadano',
    previousStatus: report.status,
    newStatus: ARCHIVED_CLOSURE_STATUS,
    action: 'Solución confirmada por el ciudadano; expediente archivado definitivamente.',
  };

  return {
    ...report,
    status: ARCHIVED_CLOSURE_STATUS,
    closureArchived: true,
    solutionConfirmedAt: at,
    updatedAt: at,
    receptionEvent: 'Solución confirmada y expediente archivado',
    history: [...previousHistory, historyEntry],
  };
}

/**
 * Persiste la confirmación ciudadana de solución en IndexedDB v2.
 * Si se invoca con un ticket secundario consolidado, aplica la confirmación sobre su expediente maestro.
 */
export async function confirmClosureSolution(ticket, options = {}) {
  if (typeof ticket !== 'string' || !ticket.trim() || ticket.length > 128) {
    throw new Error('El ticket del reporte no es válido.');
  }

  const database = await openDatabase();
  const updatedReport = await new Promise((resolve, reject) => {
    let tx;
    try {
      tx = database.transaction('reports', 'readwrite');
    } catch {
      database.close();
      reject(new Error('No se pudo iniciar la confirmación de cierre.'));
      return;
    }

    let result = null;
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
      reject(
        failure ||
          new Error('No se pudo guardar la confirmación de cierre. Inténtalo de nuevo.'),
      );
    };
    tx.onerror = () => {};

    const abort = (error) => {
      failure = error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'No se pudo confirmar la solución.');
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
      const store = tx.objectStore('reports');
      const request = store.get(ticket.trim());
      request.onsuccess = () => {
        try {
          const current = request.result;
          if (!current) {
            throw new Error('El reporte solicitado no existe.');
          }
          if (!isSecondaryReport(current)) {
            const updated = applySolutionConfirmation(current, options);
            const write = store.put(updated);
            write.onsuccess = () => { result = updated; };
            return;
          }
          const masterTicket = current.masterTicket || current.consolidation?.masterTicket;
          if (typeof masterTicket !== 'string' || !masterTicket.trim()) {
            throw new Error('No se pudo determinar el expediente maestro para confirmar el cierre.');
          }
          const masterReq = store.get(masterTicket.trim());
          masterReq.onsuccess = () => {
            try {
              if (!masterReq.result) {
                throw new Error('El expediente maestro no está disponible para confirmar el cierre.');
              }
              const updatedMaster = applySolutionConfirmation(masterReq.result, options);
              const writeMaster = store.put(updatedMaster);
              writeMaster.onsuccess = () => { result = updatedMaster; };
            } catch (err) {
              abort(err);
            }
          };
          masterReq.onerror = () => abort(new Error('No se pudo leer el expediente maestro.'));
        } catch (err) {
          abort(err);
        }
      };
      request.onerror = () => abort(new Error('No se pudo leer el reporte solicitado.'));
    } catch (err) {
      abort(err);
    }
  });

  notifyReportChange({ type: 'updated', ticket: updatedReport.ticket });
  return updatedReport;
}
