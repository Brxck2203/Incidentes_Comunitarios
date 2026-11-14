import { getReports } from './reportRepository.js';

// TODO: reemplazar o unificar contrato cuando se integre HU-06 (Alerta ciudadana de duplicados)
// TODO: reemplazar o ajustar estados finales cuando se integren HU-12 y HU-13

export const DEFAULT_RADIUS_METERS = 50;
export const TIME_WINDOW_DAYS = 30;
export const TIME_WINDOW_MS = TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const CATEGORY_RADIUS_METERS = {
  'Baches': 50,
  'Basura clandestina': 50,
  'Ramas/arbolado': 50,
  'Aceras dañadas': 50,
};

export const RESOLVED_STATUSES = [
  'Resuelto',
  'Cerrado',
  'Desestimado',
  'Rechazado',
];

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula la distancia geodésica en metros entre dos coordenadas GPS mediante la fórmula de Haversine.
 */
export function calculateDistanceMeters(posA, posB) {
  if (
    !posA ||
    !posB ||
    !Number.isFinite(posA.lat) ||
    !Number.isFinite(posA.lng) ||
    !Number.isFinite(posB.lat) ||
    !Number.isFinite(posB.lng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const dLat = toRadians(posB.lat - posA.lat);
  const dLng = toRadians(posB.lng - posA.lng);
  const lat1 = toRadians(posA.lat);
  const lat2 = toRadians(posB.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const a =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Obtiene el radio máximo en metros configurado para una categoría, o el radio por defecto (50 m).
 */
export function getRadiusForCategory(category, customCategoryRadii = {}) {
  if (category && Number.isFinite(customCategoryRadii[category]) && customCategoryRadii[category] > 0) {
    return customCategoryRadii[category];
  }
  if (category && Number.isFinite(CATEGORY_RADIUS_METERS[category])) {
    return CATEGORY_RADIUS_METERS[category];
  }
  return DEFAULT_RADIUS_METERS;
}

/**
 * Indica si un reporte se considera aún sin resolver.
 */
export function isUnresolvedReport(report, resolvedStatuses = RESOLVED_STATUSES) {
  if (!report || typeof report.status !== 'string') return false;
  return !resolvedStatuses.includes(report.status.trim());
}

/**
 * Determina si el reporte candidato es anterior al reporte entrante evaluado.
 */
function isEarlierReport(candidate, target) {
  const candidateTime = Date.parse(candidate?.createdAt ?? '');
  const targetTime = Date.parse(target?.createdAt ?? '');
  if (!Number.isFinite(candidateTime) || !Number.isFinite(targetTime)) {
    return false;
  }
  if (candidateTime !== targetTime) {
    return candidateTime < targetTime;
  }
  return String(candidate.ticket ?? '') < String(target.ticket ?? '');
}

/**
 * Busca reportes preexistentes que coincidan en categoría, radio espacial y ventana temporal (RF-04).
 */
export function findDuplicateCandidates(targetReport, allReports = [], options = {}) {
  if (
    !targetReport ||
    !targetReport.ticket ||
    !targetReport.category ||
    !targetReport.position
  ) {
    return [];
  }

  const targetTime = Date.parse(targetReport.createdAt ?? '');
  if (!Number.isFinite(targetTime)) {
    return [];
  }

  const maxRadiusMeters = Number.isFinite(options.radiusMeters) && options.radiusMeters > 0
    ? options.radiusMeters
    : getRadiusForCategory(targetReport.category, options.categoryRadii);

  const timeWindowMs = Number.isFinite(options.timeWindowDays) && options.timeWindowDays > 0
    ? options.timeWindowDays * 24 * 60 * 60 * 1000
    : TIME_WINDOW_MS;

  const matches = [];

  for (const candidate of allReports) {
    if (!candidate || candidate.ticket === targetReport.ticket) continue;
    if (!candidate.category || candidate.category !== targetReport.category) continue;
    if (!isEarlierReport(candidate, targetReport)) continue;

    const candidateTime = Date.parse(candidate.createdAt);
    const timeDiffMs = targetTime - candidateTime;
    const withinTimeWindow = timeDiffMs >= 0 && timeDiffMs <= timeWindowMs;
    const unresolved = isUnresolvedReport(candidate, options.resolvedStatuses);

    if (!unresolved && !withinTimeWindow) continue;

    const distanceMeters = calculateDistanceMeters(targetReport.position, candidate.position);
    if (!Number.isFinite(distanceMeters) || distanceMeters > maxRadiusMeters) continue;

    matches.push({
      originalReport: candidate,
      distanceMeters: Math.round(distanceMeters),
      exactDistanceMeters: distanceMeters,
      timeDiffMs,
      maxRadiusMeters,
    });
  }

  // Ordenar dando prioridad al reporte original más antiguo y, en caso de empate, al más cercano
  matches.sort((a, b) => {
    const timeA = Date.parse(a.originalReport.createdAt);
    const timeB = Date.parse(b.originalReport.createdAt);
    if (timeA !== timeB) return timeA - timeB;
    return a.exactDistanceMeters - b.exactDistanceMeters;
  });

  return matches;
}

/**
 * Construye un mapa indexado por ticket con el resultado de detección de duplicados para toda una bandeja.
 */
export function buildDuplicateMap(allReports = [], options = {}) {
  const list = Array.isArray(allReports) ? allReports : [];
  const map = {};

  for (const report of list) {
    if (!report?.ticket) continue;
    const matches = findDuplicateCandidates(report, list, options);
    map[report.ticket] = {
      isSuspectedDuplicate: matches.length > 0,
      primaryMatch: matches[0] ?? null,
      matches,
    };
  }

  return map;
}

/**
 * Consulta el repositorio y evalúa las posibles coincidencias para un ticket específico.
 */
export async function detectDuplicatesForTicket(ticket, options = {}) {
  if (!ticket) {
    return { isSuspectedDuplicate: false, primaryMatch: null, matches: [] };
  }
  const allReports = await getReports();
  const targetReport = allReports.find((item) => item.ticket === ticket);
  if (!targetReport) {
    return { isSuspectedDuplicate: false, primaryMatch: null, matches: [] };
  }
  const matches = findDuplicateCandidates(targetReport, allReports, options);
  return {
    isSuspectedDuplicate: matches.length > 0,
    primaryMatch: matches[0] ?? null,
    matches,
  };
}
