import { DEFAULT_OFFICIAL_NAME } from './consolidationService.js';
import { isSecondaryReport } from './municipalDecisions.js';
import { notifyReportChange } from './reportNotifications.js';
import { isActiveReport } from './reportPriority.js';

// TODO: reemplazar cuando se integre HU-15 (catálogo y asignación inicial de cuadrillas de RF-10)
export const ASSIGNED_STATUS = 'Asignado';

export const MUNICIPAL_CREW_CATALOG = [
  {
    crewId: 'rv-bacheo',
    crewName: 'Cuadrilla de Bacheo y Asfalto',
    department: 'Red Vial',
    category: 'Baches',
  },
  {
    crewId: 'rv-vialidad',
    crewName: 'Cuadrilla de Mantenimiento Vial',
    department: 'Red Vial',
    category: 'Baches',
  },
  {
    crewId: 'ga-recoleccion',
    crewName: 'Cuadrilla de Limpieza y Recolección',
    department: 'Gestión Ambiental',
    category: 'Basura clandestina',
  },
  {
    crewId: 'ga-saneamiento',
    crewName: 'Cuadrilla de Saneamiento Ambiental',
    department: 'Gestión Ambiental',
    category: 'Basura clandestina',
  },
  {
    crewId: 'po-arbolado',
    crewName: 'Cuadrilla de Poda y Arbolado',
    department: 'Parques y Ornato',
    category: 'Ramas/arbolado',
  },
  {
    crewId: 'po-zonas-verdes',
    crewName: 'Cuadrilla de Áreas Verdes',
    department: 'Parques y Ornato',
    category: 'Ramas/arbolado',
  },
  {
    crewId: 'mi-aceras',
    crewName: 'Cuadrilla de Obras y Aceras',
    department: 'Mantenimiento de Infraestructura',
    category: 'Aceras dañadas',
  },
  {
    crewId: 'mi-urbana',
    crewName: 'Cuadrilla de Infraestructura Urbana',
    department: 'Mantenimiento de Infraestructura',
    category: 'Aceras dañadas',
  },
];

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

/**
 * Obtiene la información normalizada de la asignación actual de un reporte,
 * contemplando los campos que pudiera haber dejado HU-15 o datos previos.
 */
export function getCurrentAssignment(report) {
  if (!report || typeof report !== 'object') return null;
  const raw = report.assignment || report.crewAssignment || null;
  const crewId = typeof raw?.crewId === 'string' && raw.crewId.trim()
    ? raw.crewId.trim()
    : (typeof report.assignedCrewId === 'string' ? report.assignedCrewId.trim() : '');
  const catalogMatch = crewId
    ? MUNICIPAL_CREW_CATALOG.find((item) => item.crewId === crewId)
    : null;
  const crewName = typeof raw?.crewName === 'string' && raw.crewName.trim()
    ? raw.crewName.trim()
    : (typeof raw?.crew === 'string' && raw.crew.trim()
        ? raw.crew.trim()
        : (typeof report.assignedCrew === 'string' && report.assignedCrew.trim()
            ? report.assignedCrew.trim()
            : (catalogMatch?.crewName || '')));
  const department = typeof raw?.department === 'string' && raw.department.trim()
    ? raw.department.trim()
    : (typeof report.assignedDepartment === 'string' && report.assignedDepartment.trim()
        ? report.assignedDepartment.trim()
        : (catalogMatch?.department || ''));

  if (!crewId && !crewName && !department) {
    return null;
  }

  return {
    crewId: crewId || catalogMatch?.crewId || '',
    crewName: crewName || 'Cuadrilla sin especificar',
    department: department || 'Dependencia sin especificar',
    instructions: typeof raw?.instructions === 'string' ? raw.instructions : '',
    deadline: raw?.deadline ?? null,
    assignedAt: raw?.assignedAt ?? report.updatedAt ?? null,
    assignedBy: typeof raw?.assignedBy === 'string' ? raw.assignedBy : '',
    reassignmentCount: Number.isFinite(raw?.reassignmentCount) ? raw.reassignmentCount : 0,
  };
}

/**
 * Determina si un reporte cumple las condiciones para poder ser reasignado (HU-16):
 * debe existir, no ser secundario, estar activo y encontrarse en estado «Asignado».
 */
export function canReassignReport(report) {
  if (!report || typeof report !== 'object') return false;
  if (isSecondaryReport(report)) return false;
  if (!isActiveReport(report)) return false;
  return (report.status || '').trim().toLocaleLowerCase() === ASSIGNED_STATUS.toLocaleLowerCase();
}

/**
 * Devuelve las cuadrillas disponibles para reasignar un reporte, excluyendo la cuadrilla actual
 * y ordenando primero las que corresponden a la categoría del reporte (RF-10) seguidas de las
 * demás dependencias municipales (para corregir errores de canalización según HU-16).
 */
export function getAvailableCrewsForReassignment(report, catalog = MUNICIPAL_CREW_CATALOG) {
  const current = getCurrentAssignment(report);
  const currentCrewId = current?.crewId || '';
  const currentCrewName = (current?.crewName || '').trim().toLocaleLowerCase();
  const currentDepartment = (current?.department || '').trim().toLocaleLowerCase();
  const reportCategory = (report?.category || '').trim();

  const eligible = (Array.isArray(catalog) ? catalog : []).filter((item) => {
    if (!item || !item.crewId) return false;
    if (currentCrewId && item.crewId === currentCrewId) return false;
    if (
      !currentCrewId &&
      currentCrewName &&
      item.crewName.trim().toLocaleLowerCase() === currentCrewName &&
      (!currentDepartment || item.department.trim().toLocaleLowerCase() === currentDepartment)
    ) {
      return false;
    }
    return true;
  });

  return [...eligible].sort((a, b) => {
    const aMatchesCategory = reportCategory && a.category === reportCategory ? 0 : 1;
    const bMatchesCategory = reportCategory && b.category === reportCategory ? 0 : 1;
    if (aMatchesCategory !== bMatchesCategory) return aMatchesCategory - bMatchesCategory;
    return a.department.localeCompare(b.department, 'es') || a.crewName.localeCompare(b.crewName, 'es');
  });
}

/**
 * Aplica de forma pura la reasignación de cuadrilla o dependencia sobre un expediente en estado «Asignado»,
 * validando entradas y agregando el traslado a la bitácora sin borrar el historial anterior.
 */
export function applyCrewReassignment(report, input, at = new Date().toISOString()) {
  if (!report || typeof report.ticket !== 'string' || !report.ticket.trim()) {
    throw new Error('El reporte no existe para ese ticket.');
  }
  if (isSecondaryReport(report)) {
    throw new Error('La reasignación de cuadrilla se registra desde el expediente maestro.');
  }
  if (!isActiveReport(report)) {
    throw new Error('No se puede reasignar un expediente cerrado o desestimado.');
  }
  if (!canReassignReport(report)) {
    throw new Error('Solo los expedientes en estado «Asignado» pueden reasignarse a otra cuadrilla o dependencia.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Los datos de reasignación no son válidos.');
  }

  const responsible = typeof input.responsible === 'string' && input.responsible.trim()
    ? input.responsible.trim()
    : '';
  if (!responsible) {
    throw new Error('Ingresa la persona funcionaria responsable de la reasignación.');
  }
  if (responsible.length > 120) {
    throw new Error('El nombre del responsable no puede superar 120 caracteres.');
  }

  const crewId = typeof input.crewId === 'string' ? input.crewId.trim() : '';
  if (!crewId) {
    throw new Error('Selecciona la nueva dependencia y cuadrilla responsable.');
  }

  const targetCrew = MUNICIPAL_CREW_CATALOG.find((item) => item.crewId === crewId);
  if (!targetCrew) {
    throw new Error('Selecciona una cuadrilla o dependencia válida del catálogo municipal.');
  }

  const currentAssignment = getCurrentAssignment(report);
  const isSameById = Boolean(currentAssignment?.crewId && currentAssignment.crewId === targetCrew.crewId);
  const isSameByName = Boolean(
    !currentAssignment?.crewId &&
    currentAssignment?.crewName &&
    currentAssignment.crewName.trim().toLocaleLowerCase() === targetCrew.crewName.toLocaleLowerCase() &&
    (!currentAssignment.department ||
      currentAssignment.department.trim().toLocaleLowerCase() === targetCrew.department.toLocaleLowerCase()),
  );
  if (isSameById || isSameByName) {
    throw new Error('Selecciona una cuadrilla o dependencia distinta de la que ya tiene asignada el expediente.');
  }

  const justification = typeof input.justification === 'string' ? input.justification.trim() : '';
  if (!justification) {
    throw new Error('El motivo de la reasignación es obligatorio.');
  }
  if (justification.length > 2000) {
    throw new Error('El motivo de la reasignación no puede superar 2000 caracteres.');
  }

  const previousLabel = currentAssignment
    ? `${currentAssignment.department} — ${currentAssignment.crewName}`
    : 'Asignación previa sin especificar';
  const nextLabel = `${targetCrew.department} — ${targetCrew.crewName}`;

  const updatedAssignment = {
    ...(report.assignment && typeof report.assignment === 'object' ? report.assignment : {}),
    crewId: targetCrew.crewId,
    crewName: targetCrew.crewName,
    department: targetCrew.department,
    category: targetCrew.category,
    instructions: currentAssignment?.instructions || '',
    deadline: currentAssignment?.deadline ?? null,
    assignedAt: currentAssignment?.assignedAt || at,
    assignedBy: currentAssignment?.assignedBy || responsible,
    reassignedAt: at,
    reassignedBy: responsible,
    reassignmentJustification: justification,
    previousDepartment: currentAssignment?.department || '',
    previousCrewId: currentAssignment?.crewId || '',
    previousCrewName: currentAssignment?.crewName || '',
    reassignmentCount: (currentAssignment?.reassignmentCount || 0) + 1,
  };

  // TODO: conectar con estructura de auditoría general cuando se integre HU-21
  const historyEntry = {
    at,
    type: 'crew-reassignment',
    responsible,
    role: 'Gestor municipal',
    previousStatus: report.status,
    newStatus: ASSIGNED_STATUS,
    previousDepartment: currentAssignment?.department || '',
    previousCrew: currentAssignment?.crewName || '',
    newDepartment: targetCrew.department,
    newCrew: targetCrew.crewName,
    justification,
    action: `Reasignado de «${previousLabel}» a «${nextLabel}» por ${responsible}. Motivo: ${justification}`,
  };

  const previousHistory = Array.isArray(report.history) ? report.history : [];

  return {
    ...report,
    status: ASSIGNED_STATUS,
    assignment: updatedAssignment,
    updatedAt: at,
    receptionEvent: `Reasignado a ${targetCrew.department}`,
    history: [...previousHistory, historyEntry],
  };
}

/**
 * Ejecuta la reasignación de cuadrilla dentro de una transacción readwrite en IndexedDB v2.
 */
export async function reassignReportCrew(ticket, input) {
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
      reject(new Error('No se pudo iniciar la operación de reasignación.'));
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
          new Error('No se pudo guardar la reasignación. Revisa el espacio disponible e inténtalo de nuevo.'),
      );
    };
    tx.onerror = () => {};

    const abort = (error) => {
      failure = error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'No se pudo reasignar el expediente.');
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
          const updated = applyCrewReassignment(current, {
            ...input,
            responsible: typeof input?.responsible === 'string' && input.responsible.trim()
              ? input.responsible.trim()
              : DEFAULT_OFFICIAL_NAME,
          });
          const write = store.put(updated);
          write.onsuccess = () => { result = updated; };
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
