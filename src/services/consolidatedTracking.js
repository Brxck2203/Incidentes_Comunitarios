import { getReport } from './reportRepository.js';
import { toPublicMunicipalDecision } from './municipalDecisions.js';

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
  const hasMasterRelation = Boolean(report.masterTicket || report.consolidation?.role === 'secondary');

  if (masterTicket === report.ticket) {
    return {
      ticket: report.ticket,
      isConsolidatedSecondary: true,
      masterTicket,
      masterAvailable: false,
      masterUnavailable: true,
      masterUnavailableReason: 'El ticket original no puede ser también su propio expediente maestro.',
      effectiveStatus: null,
      effectiveUpdatedAt: null,
      effectiveCategory: report.category,
      effectiveDecision: null,
      consolidatedAt: report.consolidation?.consolidatedAt ?? report.updatedAt,
      masterProgressHistory: [],
    };
  }

  if (!masterTicket) {
    if (hasMasterRelation) {
      return {
        ticket: report.ticket,
        isConsolidatedSecondary: true,
        masterTicket: null,
        masterAvailable: false,
        masterUnavailable: true,
        masterUnavailableReason: 'No se pudo determinar el ticket del expediente maestro.',
        effectiveStatus: null,
        effectiveUpdatedAt: null,
        effectiveCategory: report.category,
        effectiveDecision: null,
        consolidatedAt: report.consolidation?.consolidatedAt ?? report.updatedAt,
        masterProgressHistory: [],
      };
    }
    return {
      ticket: report.ticket,
      isConsolidatedSecondary: false,
      masterTicket: null,
      masterAvailable: false,
      masterUnavailable: false,
      masterUnavailableReason: '',
      effectiveStatus: report.status,
      effectiveUpdatedAt: report.updatedAt,
      effectiveCategory: report.category,
      effectiveDecision: toPublicMunicipalDecision(report.municipalDecision),
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
      masterUnavailableReason: 'No se encontró el expediente maestro.',
      effectiveStatus: null,
      effectiveUpdatedAt: null,
      effectiveCategory: report.category,
      effectiveDecision: null,
      consolidatedAt: report.consolidation?.consolidatedAt ?? report.updatedAt,
      masterProgressHistory: [],
    };
  }

  const rawMasterHistory = Array.isArray(masterReport.history) ? masterReport.history : [];
  const masterProgressHistory = rawMasterHistory
    .map(sanitizeMasterHistoryEntry)
    .filter(Boolean);

  const rawMasterClosure = masterReport.technicalClosure || masterReport.closure || null;
  const effectiveClosure = rawMasterClosure && typeof rawMasterClosure === 'object'
    ? {
        at: rawMasterClosure.at || rawMasterClosure.closedAt || rawMasterClosure.attendedAt || null,
        closedAt: rawMasterClosure.closedAt || rawMasterClosure.at || null,
        department: rawMasterClosure.department || masterReport.assignment?.department || '',
        crewName: rawMasterClosure.crewName || rawMasterClosure.crew || masterReport.assignment?.crewName || masterReport.assignment?.crew || '',
        note: rawMasterClosure.note || rawMasterClosure.technicalNote || '',
        photos: Array.isArray(rawMasterClosure.photos) ? rawMasterClosure.photos : [],
      }
    : null;

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
    effectiveDecision: toPublicMunicipalDecision(masterReport.municipalDecision),
    effectiveClosure,
    effectiveClosureArchived: Boolean(masterReport.closureArchived),
    effectiveSolutionConfirmedAt: masterReport.solutionConfirmedAt || null,
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
  let masterUnavailableReason = '';

  if (masterTicket && masterTicket !== report.ticket) {
    try {
      const masterReport = await getReport(masterTicket);
      if (masterReport) {
        reportsByTicket[masterTicket] = masterReport;
      } else {
        masterUnavailableReason = 'No se encontró el expediente maestro.';
      }
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : String(failure);
      masterUnavailableReason = `No se pudo leer el expediente maestro: ${reason}`;
    }
  }

  const resolvedTracking = resolveReportTracking(report, reportsByTicket);
  const tracking = resolvedTracking?.masterUnavailable
    ? {
        ...resolvedTracking,
        masterUnavailableReason: masterUnavailableReason || resolvedTracking.masterUnavailableReason,
      }
    : resolvedTracking;
  return { report, tracking };
}
