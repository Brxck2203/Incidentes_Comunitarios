import { isActiveReport } from './reportPriority.js';

export const municipalDecisionCauses = [
  'Fuera de jurisdicción cantonal',
  'Competencia de otra entidad',
  'Información inverosímil',
];

export const municipalDecisionStatuses = {
  received: 'Registrado / Recibido',
  evaluation: 'En evaluación',
  admitted: 'Admitido a trámite',
  dismissed: 'Desestimado',
};

const adjudicableStatuses = new Set([
  municipalDecisionStatuses.received.toLocaleLowerCase(),
  municipalDecisionStatuses.evaluation.toLocaleLowerCase(),
]);
const actions = new Set(['evaluation', 'admit', 'dismiss']);

export function isSecondaryReport(report) {
  return Boolean(report?.masterTicket
    || report?.consolidation?.role === 'secondary');
}

export function canStartMunicipalEvaluation(report) {
  return Boolean(report && !isSecondaryReport(report) && isActiveReport(report)
    && report.status?.toLocaleLowerCase() !== municipalDecisionStatuses.admitted.toLocaleLowerCase());
}

export function canAdjudicateMunicipalReport(report) {
  return Boolean(report && !isSecondaryReport(report)
    && adjudicableStatuses.has(report.status?.toLocaleLowerCase()));
}

export function applyMunicipalDecision(report, input, at = new Date().toISOString()) {
  if (!report || typeof report.ticket !== 'string' || !report.ticket.trim()) {
    throw new Error('El reporte no existe para ese ticket.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input) || !actions.has(input.action)) {
    throw new Error('La acción municipal no es válida.');
  }
  const responsible = typeof input.responsible === 'string' ? input.responsible.trim() : '';
  if (!responsible) throw new Error('Ingresa a la persona responsable del dictamen.');
  if (responsible.length > 120) throw new Error('El responsable no puede superar 120 caracteres.');
  if (isSecondaryReport(report)) {
    throw new Error('Las decisiones municipales se registran desde el expediente maestro.');
  }

  const statusByAction = {
    evaluation: municipalDecisionStatuses.evaluation,
    admit: municipalDecisionStatuses.admitted,
    dismiss: municipalDecisionStatuses.dismissed,
  };
  const status = statusByAction[input.action];
  if (report.status === status && report.municipalDecision?.action === input.action) {
    return { report, changed: false };
  }

  if (input.action === 'evaluation') {
    if (!canStartMunicipalEvaluation(report)) {
      throw new Error('El reporte no admite pasar a evaluación desde su estado actual.');
    }
  } else if (!canAdjudicateMunicipalReport(report)) {
    throw new Error('Solo los reportes recibidos o en evaluación pueden admitirse o desestimarse.');
  }

  let cause = '';
  let justification = '';
  if (input.action === 'dismiss') {
    cause = typeof input.cause === 'string' ? input.cause.trim() : '';
    if (!municipalDecisionCauses.includes(cause)) {
      throw new Error('Selecciona una causal de desestimación válida.');
    }
    justification = typeof input.justification === 'string' ? input.justification.trim() : '';
    if (!justification) throw new Error('La justificación de desestimación es obligatoria.');
    if (justification.length > 2000) throw new Error('La justificación no puede superar 2000 caracteres.');
  }

  const actionLabel = {
    evaluation: 'Expediente puesto en evaluación',
    admit: 'Expediente admitido a trámite',
    dismiss: 'Expediente desestimado',
  }[input.action];
  const publicResponse = input.action === 'dismiss'
    ? `El reporte ${report.ticket} fue desestimado. Causal: ${cause}. Justificación: ${justification}`
    : `El reporte ${report.ticket} fue actualizado a «${status}».`;
  const decision = {
    action: input.action,
    status,
    at,
    responsible,
    cause,
    justification,
    publicResponse,
  };
  const historyEntry = {
    at,
    action: `${actionLabel}.${cause ? ` Causal: ${cause}. Justificación: ${justification}` : ''}`,
    responsible,
    decision: input.action,
    ...(cause ? { cause } : {}),
    ...(justification ? { justification } : {}),
  };

  return {
    changed: true,
    report: {
      ...report,
      status,
      municipalDecision: decision,
      updatedAt: at,
      receptionEvent: actionLabel,
      history: [...(Array.isArray(report.history) ? report.history : []), historyEntry],
    },
  };
}

export function toPublicMunicipalDecision(decision) {
  if (!decision || typeof decision.publicResponse !== 'string') return null;
  return {
    action: decision.action,
    status: decision.status,
    at: decision.at,
    cause: decision.cause || '',
    justification: decision.justification || '',
    publicResponse: decision.publicResponse,
  };
}
