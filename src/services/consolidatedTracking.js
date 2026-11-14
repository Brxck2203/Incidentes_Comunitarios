import { getReport } from './reportRepository.js';

// TODO: se alimenta de los vínculos masterTicket/consolidation creados al integrar HU-08
// TODO: refleja automáticamente los cambios de estado y resoluciones cuando se integren HU-11, HU-12 y HU-13

/**
 * Sanea una entrada de la bitácora del caso maestro para mostrar únicamente el avance operativo
 * del expediente principal sin exponer datos personales ni referencias privadas de terceros.
 */
export function sanitizeMasterHistoryEntry(entry) {
  if (!entry || typeof entry.action !== 'string') return null;

  let publicAction = entry.action;

  // Si la entrada menciona otros tickets secundarios o el nombre de un funcionario en la nota interna,
  // presentar un mensaje ciudadano claro sobre la atención conjunta.
  if (/Consolidación en caso maestro/i.test(publicAction)) {
    publicAction = 'Solicitudes vecinales unificadas bajo este expediente principal para atención conjunta.';
  }

  return {
    at: entry.at,
    action: publicAction,
  };
}

/**
 * Resuelve de forma pura el estado y avance vigentes de un reporte (individual o consolidado)
 * derivando siempre el estado de los reportes secundarios directamente desde el caso maestro.
 */
export function resolveReportTracking(report, reportsByTicket = {}) {
  if (!report || !report.ticket) return null;

  const masterTicket = typeof report.masterTicket === 'string' && report.masterTicket.trim()
    ? report.masterTicket.trim()
    : (report.consolidation?.role === 'secondary' && report.consolidation?.masterTicket
        ? String(report.consolidation.masterTicket).trim()
        : '');

  if (!masterTicket || masterTicket === report.ticket) {
    return {
      ticket: report.ticket,
      isConsolidatedSecondary: false,
      masterTicket: null,
      masterAvailable: false,
      masterUnavailable: false,
      effectiveStatus: report.status,
      effectiveUpdatedAt: report.updatedAt,
      effectiveCategory: report.category,
      consolidatedAt: null,
      masterProgressHistory: [],
    };
  }

  const masterReport = reportsByTicket[masterTicket] ?? null;

  if (!masterReport) {
    return {
      ticket: report.ticket,
      isConsolidatedSecondary: true,
      masterTicket,
      masterAvailable: false,
      masterUnavailable: true,
      effectiveStatus: report.status,
      effectiveUpdatedAt: report.updatedAt,
      effectiveCategory: report.category,
      consolidatedAt: report.consolidation?.consolidatedAt ?? report.updatedAt,
      masterProgressHistory: [],
    };
  }

  const rawMasterHistory = Array.isArray(masterReport.history) ? masterReport.history : [];
  const masterProgressHistory = rawMasterHistory
    .map(sanitizeMasterHistoryEntry)
    .filter(Boolean);

  return {
    ticket: report.ticket,
    isConsolidatedSecondary: true,
    masterTicket: masterReport.ticket,
    masterAvailable: true,
    masterUnavailable: false,
    // El estado visible para el ciudadano se deriva automáticamente del caso maestro vigente
    effectiveStatus: masterReport.status,
    effectiveUpdatedAt: masterReport.updatedAt,
    effectiveCategory: masterReport.category || report.category,
    consolidatedAt: report.consolidation?.consolidatedAt ?? report.updatedAt,
    masterProgressHistory,
  };
}

/**
 * Resuelve el seguimiento para una lista completa de reportes, garantizando que cualquier
 * actualización en un caso maestro se refleje de inmediato en todos los tickets unificados.
 */
export function resolveReportsListTracking(reports = []) {
  const list = Array.isArray(reports) ? reports : [];
  const reportsByTicket = {};

  for (const item of list) {
    if (item?.ticket) {
      reportsByTicket[item.ticket] = item;
    }
  }

  const trackingByTicket = {};
  for (const item of list) {
    if (item?.ticket) {
      trackingByTicket[item.ticket] = resolveReportTracking(item, reportsByTicket);
    }
  }

  return trackingByTicket;
}

/**
 * Consulta en vivo un reporte y, si está unificado bajo un caso maestro, obtiene los datos
 * vigentes del maestro para presentar su avance global actualizado.
 */
export async function getConsolidatedTrackingForTicket(ticket) {
  if (!ticket) {
    return { report: null, tracking: null };
  }

  const report = await getReport(ticket);
  if (!report) {
    return { report: null, tracking: null };
  }

  const masterTicket = typeof report.masterTicket === 'string' && report.masterTicket.trim()
    ? report.masterTicket.trim()
    : (report.consolidation?.role === 'secondary' && report.consolidation?.masterTicket
        ? String(report.consolidation.masterTicket).trim()
        : '');

  const reportsByTicket = { [report.ticket]: report };

  if (masterTicket && masterTicket !== report.ticket) {
    const masterReport = await getReport(masterTicket);
    if (masterReport) {
      reportsByTicket[masterTicket] = masterReport;
    }
  }

  const tracking = resolveReportTracking(report, reportsByTicket);
  return { report, tracking };
}
