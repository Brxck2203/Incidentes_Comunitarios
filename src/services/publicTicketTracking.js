import { getConsolidatedTrackingForTicket, resolveReportTracking } from './consolidatedTracking.js';

// TODO: mostrar dictamen de desestimación y fotografía de cierre cuando se integre HU-20

const TICKET_CODE_PATTERN = /^RC-[A-Za-z0-9_-]{2,120}$/i;

/**
 * Valida que el código de ticket ingresado tenga un formato válido para consulta pública.
 */
export function validatePublicTicketCode(rawCode) {
  const code = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!code) {
    throw new Error('Ingresa un número de ticket para realizar la consulta.');
  }
  if (code.length > 128 || !TICKET_CODE_PATTERN.test(code)) {
    throw new Error('El formato del número de ticket no es válido. Utiliza un código con prefijo RC- (por ejemplo, RC-1001).');
  }
  return code;
}

/**
 * Normaliza el nombre de un estado oficial del repositorio al nombre de etapa de RF-12.
 */
export function normalizePublicStageName(rawStatus) {
  const value = typeof rawStatus === 'string' ? rawStatus.trim() : '';
  const lower = value.toLocaleLowerCase();

  if (!value) return 'Estado no disponible';
  if (lower.includes('registrado') || lower.includes('recibido')) return 'Registrado / Recibido';
  if (lower.includes('evaluación') || lower.includes('evaluacion')) return 'En evaluación';
  if (lower.includes('admitido')) return 'Admitido';
  if (lower.includes('asignado')) return 'Asignado';
  if (lower.includes('en atención') || lower.includes('en atencion')) return 'En atención';
  if (lower.includes('atendido') || lower.includes('resuelto')) return 'Atendido';
  if (lower.includes('desestimado') || lower.includes('rechazado')) return 'Desestimado';
  return value;
}

/**
 * Determina a qué etapa pública de RF-12 corresponde una entrada de bitácora y genera
 * una descripción pública libre de datos personales o nombres de funcionarios (RNF-05).
 */
export function mapHistoryEntryToPublicStage(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const action = typeof entry.action === 'string' ? entry.action.trim() : '';
  const lowerAction = action.toLocaleLowerCase();
  const explicitStage = entry.newStatus || entry.status || '';

  if (explicitStage) {
    const stage = normalizePublicStageName(explicitStage);
    return {
      at: entry.at || null,
      stage,
      summary: getStagePublicSummary(stage),
    };
  }

  if (lowerAction.includes('reporte registrado')) {
    return {
      at: entry.at || null,
      stage: 'Registrado / Recibido',
      summary: getStagePublicSummary('Registrado / Recibido'),
    };
  }
  if (lowerAction.includes('puesto en evaluación') || lowerAction.includes('puesto en evaluacion')) {
    return {
      at: entry.at || null,
      stage: 'En evaluación',
      summary: getStagePublicSummary('En evaluación'),
    };
  }
  if (lowerAction.includes('admitido')) {
    return {
      at: entry.at || null,
      stage: 'Admitido',
      summary: getStagePublicSummary('Admitido'),
    };
  }
  if (lowerAction.includes('reasignado') || lowerAction.includes('asignado')) {
    return {
      at: entry.at || null,
      stage: 'Asignado',
      summary: lowerAction.includes('reasignado')
        ? 'Expediente reasignado a cuadrilla municipal para su atención.'
        : getStagePublicSummary('Asignado'),
    };
  }
  if (lowerAction.includes('en atención') || lowerAction.includes('en atencion') || lowerAction.includes('inicio de atención')) {
    return {
      at: entry.at || null,
      stage: 'En atención',
      summary: getStagePublicSummary('En atención'),
    };
  }
  if (
    lowerAction.includes('marcado como resuelto') ||
    lowerAction.includes('marcado como atendido') ||
    lowerAction.includes('cierre técnico') ||
    lowerAction.includes('orden concluida')
  ) {
    return {
      at: entry.at || null,
      stage: 'Atendido',
      summary: getStagePublicSummary('Atendido'),
    };
  }
  if (lowerAction.includes('desestimado')) {
    return {
      at: entry.at || null,
      stage: 'Desestimado',
      summary: getStagePublicSummary('Desestimado'),
    };
  }
  if (
    lowerAction.includes('consolidado como reporte secundario') ||
    lowerAction.includes('solicitudes vecinales unificadas') ||
    lowerAction.includes('consolidación en caso maestro')
  ) {
    return {
      at: entry.at || null,
      stage: 'Atención conjunta',
      summary: 'Solicitud integrada a un expediente principal para atención conjunta.',
    };
  }

  return null;
}

function getStagePublicSummary(stage) {
  switch (stage) {
    case 'Registrado / Recibido':
      return 'Solicitud recibida y registrada en el sistema.';
    case 'En evaluación':
      return 'Solicitud en revisión técnica preliminar.';
    case 'Admitido':
      return 'Solicitud admitida a trámite municipal.';
    case 'Asignado':
      return 'Solicitud asignada a dependencia o cuadrilla operativa.';
    case 'En atención':
      return 'Cuadrilla municipal atendiendo el incidente en el sitio.';
    case 'Atendido':
      return 'Atención del incidente concluida.';
    case 'Desestimado':
      return 'Solicitud desestimada tras valoración preliminar.';
    default:
      return `Actualización de estado: ${stage}.`;
  }
}

/**
 * Construye la línea de tiempo pública en orden cronológico solo con las etapas realmente registradas,
 * sin inventar etapas futuras y sin exponer datos del reportante ni nombres de funcionarios (RNF-05).
 */
export function buildPublicTimeline(report, tracking = null) {
  if (!report || typeof report !== 'object') return [];

  const ownHistory = Array.isArray(report.history) ? report.history : [];
  const masterHistory = Array.isArray(tracking?.masterProgressHistory)
    ? tracking.masterProgressHistory
    : [];

  const combinedRaw = [...ownHistory, ...masterHistory];
  const mapped = [];

  for (const entry of combinedRaw) {
    const publicStep = mapHistoryEntryToPublicStage(entry);
    if (!publicStep) continue;
    mapped.push(publicStep);
  }

  // Asegurar que la etapa inicial de registro esté presente si el reporte tiene createdAt
  if (
    report.createdAt &&
    !mapped.some((step) => step.stage === 'Registrado / Recibido')
  ) {
    mapped.unshift({
      at: report.createdAt,
      stage: 'Registrado / Recibido',
      summary: getStagePublicSummary('Registrado / Recibido'),
    });
  }

  // Si el estado efectivo actual corresponde a una etapa que no tenía entrada explícita en history,
  // incluirla al final con la fecha de última actualización real del expediente.
  const effectiveRawStatus = tracking?.isConsolidatedSecondary
    ? (tracking.masterUnavailable ? null : tracking.effectiveStatus)
    : report.status;

  if (effectiveRawStatus) {
    const currentStage = normalizePublicStageName(effectiveRawStatus);
    const hasCurrentStage = mapped.some((step) => step.stage === currentStage);
    if (!hasCurrentStage && currentStage !== 'Estado no disponible') {
      mapped.push({
        at: tracking?.effectiveUpdatedAt || report.updatedAt || report.createdAt || null,
        stage: currentStage,
        summary: getStagePublicSummary(currentStage),
      });
    }
  }

  // Ordenar cronológicamente de más antiguo a más reciente y eliminar duplicados idénticos
  mapped.sort((a, b) => String(a.at ?? '').localeCompare(String(b.at ?? '')));

  const deduplicated = [];
  const seenKeys = new Set();
  for (const step of mapped) {
    const key = `${step.stage}|${step.at ?? ''}|${step.summary}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduplicated.push(step);
  }

  return deduplicated;
}

/**
 * Construye de forma pura la vista pública saneada de un reporte (HU-19 / RNF-05).
 * No incluye reporterId, confirmations, position, originalPosition, audio, photos ni nombres de funcionarios.
 */
export function buildPublicTicketView(report, reportsByTicket = {}) {
  if (!report || !report.ticket) return null;

  const tracking = resolveReportTracking(report, reportsByTicket);
  const isJoint = Boolean(tracking?.isConsolidatedSecondary);
  const masterUnavailable = Boolean(tracking?.masterUnavailable);
  const rawEffectiveStatus = isJoint
    ? (masterUnavailable ? null : tracking.effectiveStatus)
    : report.status;

  const currentStage = masterUnavailable
    ? 'Estado del expediente maestro no disponible'
    : normalizePublicStageName(rawEffectiveStatus);

  const timeline = buildPublicTimeline(report, tracking);

  return {
    ticket: report.ticket,
    category: report.category || 'Sin clasificar',
    createdAt: report.createdAt || null,
    updatedAt: (isJoint && !masterUnavailable ? tracking?.effectiveUpdatedAt : report.updatedAt) || report.createdAt || null,
    currentStage,
    officialStatus: masterUnavailable ? 'Estado del maestro no disponible' : (rawEffectiveStatus || 'Estado no disponible'),
    isJointAttention: isJoint,
    masterTicket: isJoint ? (tracking?.masterTicket || null) : null,
    masterUnavailable,
    timeline,
  };
}

/**
 * Busca un ticket en IndexedDB por su código exacto (o normalizado en mayúsculas) y devuelve su vista pública.
 */
export async function lookupPublicTicket(rawTicket) {
  const code = validatePublicTicketCode(rawTicket);
  let { report, tracking } = await getConsolidatedTrackingForTicket(code);

  if (!report) {
    return null;
  }

  const isJoint = Boolean(tracking?.isConsolidatedSecondary);
  const masterUnavailable = Boolean(tracking?.masterUnavailable);
  const rawEffectiveStatus = isJoint
    ? (masterUnavailable ? null : tracking.effectiveStatus)
    : report.status;

  return {
    ticket: report.ticket,
    category: report.category || 'Sin clasificar',
    createdAt: report.createdAt || null,
    updatedAt: (isJoint && !masterUnavailable ? tracking?.effectiveUpdatedAt : report.updatedAt) || report.createdAt || null,
    currentStage: masterUnavailable
      ? 'Estado del expediente maestro no disponible'
      : normalizePublicStageName(rawEffectiveStatus),
    officialStatus: masterUnavailable ? 'Estado del maestro no disponible' : (rawEffectiveStatus || 'Estado no disponible'),
    isJointAttention: isJoint,
    masterTicket: isJoint ? (tracking?.masterTicket || null) : null,
    masterUnavailable,
    timeline: buildPublicTimeline(report, tracking),
  };
}
