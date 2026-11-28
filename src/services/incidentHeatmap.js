import { categories } from './reportRepository.js';
import { hasValidCoordinates } from './municipalConsole.js';
import { isActiveReport } from './reportPriority.js';

// Tamaño de celda por defecto (~220 metros en latitudes de Costa Rica) para agrupar puntos cercanos.
export const DEFAULT_GRID_STEP_DEGREES = 0.002;

export const HEATMAP_INTENSITY_LEVELS = [
  {
    key: 'low',
    label: 'Concentración baja',
    fillColor: '#f59e0b',
    strokeColor: '#b45309',
    fillOpacity: 0.38,
  },
  {
    key: 'medium',
    label: 'Concentración moderada',
    fillColor: '#ea580c',
    strokeColor: '#9a3412',
    fillOpacity: 0.52,
  },
  {
    key: 'high',
    label: 'Concentración alta',
    fillColor: '#dc2626',
    strokeColor: '#991b1b',
    fillOpacity: 0.66,
  },
  {
    key: 'critical',
    label: 'Zona crítica (alta reincidencia)',
    fillColor: '#7f1d1d',
    strokeColor: '#450a0a',
    fillOpacity: 0.8,
  },
];

const LEVEL_BY_KEY = Object.fromEntries(
  HEATMAP_INTENSITY_LEVELS.map((level) => [level.key, level]),
);

const DISMISSED_STATUS_TOKENS = ['desestimado', 'anulado', 'cancelado'];

/**
 * Determina si un expediente debe contabilizarse en el mapa de calor de reincidencia (HU-29).
 * Incluye reportes activos e históricos cerrados («Atendido», «Resuelto», «Cerrado / Archivado»),
 * pero excluye los desestimados, anulados o cancelados.
 */
export function isReportEligibleForHeatmap(report) {
  if (!report || typeof report !== 'object') return false;
  if (typeof report.ticket !== 'string' || !report.ticket.trim()) return false;
  if (report.municipalDecision?.action === 'dismiss') return false;

  const normalizedStatus = String(report.status ?? '').trim().toLocaleLowerCase();
  return !DISMISSED_STATUS_TOKENS.some((token) => normalizedStatus.includes(token));
}

/**
 * Resuelve la categoría aplicable de un reporte. Si es un ticket secundario consolidado sin
 * categoría propia clasificada, hereda la categoría de su expediente maestro si está disponible,
 * sin duplicar registros.
 */
export function resolveHeatmapCategory(report, reportsByTicket = {}) {
  const ownCategory = typeof report?.category === 'string' ? report.category.trim() : '';
  if (ownCategory) return ownCategory;

  const masterTicket =
    typeof report?.masterTicket === 'string' && report.masterTicket.trim()
      ? report.masterTicket.trim()
      : report?.consolidation?.role === 'secondary' &&
          typeof report?.consolidation?.masterTicket === 'string'
        ? report.consolidation.masterTicket.trim()
        : '';

  if (masterTicket && typeof reportsByTicket[masterTicket]?.category === 'string') {
    return reportsByTicket[masterTicket].category.trim();
  }
  return '';
}

function parseOptionalDateBoundary(value, label, endOfDay = false) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`${label} no tiene un formato de fecha válido.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const isoCandidate = `${trimmed}T${endOfDay ? '23:59:59.999Z' : '00:00:00.000Z'}`;
    const parsed = new Date(isoCandidate);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
      throw new Error(`${label} no tiene un formato de fecha válido.`);
    }
    return parsed.getTime();
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${label} no tiene un formato de fecha válido.`);
  }
  return timestamp;
}

/**
 * Clasifica la intensidad relativa de una celda. Se exige un denominador mínimo de 4 para
 * evitar que un único reporte aislado se etiquete como zona crítica.
 */
export function resolveIntensityLevel(count, maxCellCount) {
  const effectiveMax = Math.max(Number(maxCellCount) || 1, 4);
  const ratio = count / effectiveMax;
  if (ratio > 0.75) return LEVEL_BY_KEY.critical;
  if (ratio > 0.5) return LEVEL_BY_KEY.high;
  if (ratio > 0.25) return LEVEL_BY_KEY.medium;
  return LEVEL_BY_KEY.low;
}

/**
 * Construye las celdas geográficas de concentración para el mapa de calor (RF-17 / HU-29) en O(N).
 * Deja preparado el soporte opcional de `fromDate` y `toDate` para la integración futura de HU-30.
 */
export function buildIncidentHeatmap(reports = [], options = {}) {
  if (!Array.isArray(reports)) {
    throw new Error('La colección de reportes para el mapa de calor no es válida.');
  }

  const normalizedCategory =
    typeof options.category === 'string' ? options.category.trim() : '';
  if (normalizedCategory && !categories.includes(normalizedCategory)) {
    throw new Error('Selecciona una categoría válida para filtrar el mapa de calor.');
  }

  const gridStepDegrees =
    options.gridStepDegrees === undefined
      ? DEFAULT_GRID_STEP_DEGREES
      : Number(options.gridStepDegrees);
  if (!Number.isFinite(gridStepDegrees) || gridStepDegrees <= 0 || gridStepDegrees > 1) {
    throw new Error('El tamaño de cuadrícula del mapa de calor no es válido.');
  }

  // Parámetros opcionales de periodo listos para HU-30.
  const fromMs = parseOptionalDateBoundary(options.fromDate, 'La fecha inicial', false);
  const toMs = parseOptionalDateBoundary(options.toDate, 'La fecha final', true);
  if (fromMs !== null && toMs !== null && fromMs > toMs) {
    throw new Error('La fecha inicial no puede ser posterior a la fecha final.');
  }

  const reportsByTicket = {};
  for (const item of reports) {
    if (item && typeof item.ticket === 'string' && item.ticket.trim()) {
      reportsByTicket[item.ticket.trim()] = item;
    }
  }

  const seenTickets = new Set();
  const cellMap = new Map();
  let excludedDismissedCount = 0;
  let excludedInvalidCoordsCount = 0;
  let totalMatchingReports = 0;
  let mappedReportsCount = 0;

  for (const report of reports) {
    if (!report || typeof report !== 'object') continue;
    const ticket = typeof report.ticket === 'string' ? report.ticket.trim() : '';
    if (!ticket || seenTickets.has(ticket)) continue;
    seenTickets.add(ticket);

    if (!isReportEligibleForHeatmap(report)) {
      excludedDismissedCount += 1;
      continue;
    }

    if (fromMs !== null || toMs !== null) {
      const reportTime = Date.parse(report.createdAt || report.capturedAt || '');
      if (Number.isNaN(reportTime)) continue;
      if (fromMs !== null && reportTime < fromMs) continue;
      if (toMs !== null && reportTime > toMs) continue;
    }

    const effectiveCategory = resolveHeatmapCategory(report, reportsByTicket);
    if (normalizedCategory && effectiveCategory !== normalizedCategory) {
      continue;
    }

    totalMatchingReports += 1;

    if (!hasValidCoordinates(report.position)) {
      excludedInvalidCoordsCount += 1;
      continue;
    }

    mappedReportsCount += 1;
    const { lat, lng } = report.position;
    const row = Math.floor(lat / gridStepDegrees);
    const col = Math.floor(lng / gridStepDegrees);
    const cellKey = `${row}:${col}`;

    let bucket = cellMap.get(cellKey);
    if (!bucket) {
      const south = Number((row * gridStepDegrees).toFixed(6));
      const north = Number(((row + 1) * gridStepDegrees).toFixed(6));
      const west = Number((col * gridStepDegrees).toFixed(6));
      const east = Number(((col + 1) * gridStepDegrees).toFixed(6));
      bucket = {
        id: cellKey,
        bounds: [
          [south, west],
          [north, east],
        ],
        latSum: 0,
        lngSum: 0,
        count: 0,
        historicalClosedCount: 0,
        byCategory: {},
      };
      cellMap.set(cellKey, bucket);
    }

    bucket.count += 1;
    bucket.latSum += lat;
    bucket.lngSum += lng;
    if (!isActiveReport(report)) {
      bucket.historicalClosedCount += 1;
    }
    const categoryLabel = effectiveCategory || 'Sin clasificar';
    bucket.byCategory[categoryLabel] = (bucket.byCategory[categoryLabel] || 0) + 1;
  }

  let maxCellCount = 0;
  for (const bucket of cellMap.values()) {
    if (bucket.count > maxCellCount) {
      maxCellCount = bucket.count;
    }
  }

  const effectiveDenominator = Math.max(maxCellCount, 4);
  const cells = Array.from(cellMap.values())
    .map((bucket) => {
      const level = resolveIntensityLevel(bucket.count, maxCellCount);
      return {
        id: bucket.id,
        bounds: bucket.bounds,
        center: {
          lat: Number((bucket.latSum / bucket.count).toFixed(6)),
          lng: Number((bucket.lngSum / bucket.count).toFixed(6)),
        },
        count: bucket.count,
        historicalClosedCount: bucket.historicalClosedCount,
        byCategory: bucket.byCategory,
        intensityRatio: Number((bucket.count / effectiveDenominator).toFixed(4)),
        level,
      };
    })
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  return {
    cells,
    totalMatchingReports,
    mappedReportsCount,
    excludedInvalidCoordsCount,
    excludedDismissedCount,
    maxCellCount,
    category: normalizedCategory,
    fromDate: typeof options.fromDate === 'string' ? options.fromDate.trim() : '',
    toDate: typeof options.toDate === 'string' ? options.toDate.trim() : '',
  };
}
