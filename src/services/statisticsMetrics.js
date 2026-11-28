import { categories } from './reportRepository.js';
import { municipalCrews } from './crewAssignment.js';
import { isSecondaryReport } from './municipalDecisions.js';
import { isActiveReport } from './reportPriority.js';

export const STATISTICAL_DEPARTMENTS = Object.keys(
  Object.fromEntries(
    Object.values(municipalCrews).map((entry) => [entry.department, true]),
  ),
);

const LIFECYCLE_STATUS_ORDER = [
  'Registrado / Recibido',
  'En evaluación',
  'Admitido a trámite',
  'Asignado',
  'En atención',
  'Atendido',
  'Resuelto',
  'Cerrado / Archivado',
  'Desestimado',
];

function parseDateBoundary(value, label, endOfDay = false) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`${label} no tiene un formato de fecha válido.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = `${trimmed}T${endOfDay ? '23:59:59.999Z' : '00:00:00.000Z'}`;
    const parsed = new Date(iso);
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

export function isDismissedForStats(report) {
  if (!report || typeof report !== 'object') return false;
  if (report.municipalDecision?.action === 'dismiss') return true;
  const status = String(report.status ?? '').trim().toLocaleLowerCase();
  return (
    status.includes('desestimado') ||
    status.includes('anulado') ||
    status.includes('cancelado')
  );
}

export function isResolvedForStats(report) {
  if (!report || typeof report !== 'object' || isDismissedForStats(report)) {
    return false;
  }
  const status = String(report.status ?? '').trim().toLocaleLowerCase();
  return (
    status === 'atendido' ||
    status === 'resuelto' ||
    status.startsWith('cerrado')
  );
}

export function resolveReportDepartment(report) {
  const explicitDept =
    typeof report?.assignment?.department === 'string'
      ? report.assignment.department.trim()
      : '';
  if (explicitDept && STATISTICAL_DEPARTMENTS.includes(explicitDept)) {
    return explicitDept;
  }
  const byCategory = municipalCrews[report?.category]?.department;
  return byCategory || '';
}

export function resolveClosureTimestamp(report) {
  return (
    report?.technicalClosure?.at ||
    report?.closure?.closedAt ||
    report?.attendedAt ||
    report?.resolvedAt ||
    null
  );
}

/**
 * Formatea una duración en horas de forma compacta y legible en pantallas móviles.
 */
export function formatDurationHours(hours) {
  if (hours == null || !Number.isFinite(hours) || hours < 0) {
    return 'Sin cierres';
  }
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} min`;
  }
  if (hours < 48) {
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  return remHours > 0 ? `${days} d ${remHours} h` : `${days} d`;
}

/**
 * Calcula en O(N) las métricas del tablero estadístico municipal (RF-16 / HU-27).
 * Entrega una estructura autodescriptiva lista para ser exportada en HU-28.
 */
export function computeMunicipalStatistics(reports = [], filters = {}) {
  if (!Array.isArray(reports)) {
    throw new Error('La colección de reportes para estadísticas no es válida.');
  }

  const normalizedCategory =
    typeof filters.category === 'string' ? filters.category.trim() : '';
  if (normalizedCategory && !categories.includes(normalizedCategory)) {
    throw new Error('Selecciona una categoría válida para filtrar las estadísticas.');
  }

  const fromMs = parseDateBoundary(filters.fromDate, 'La fecha inicial', false);
  const toMs = parseDateBoundary(filters.toDate, 'La fecha final', true);
  if (fromMs !== null && toMs !== null && fromMs > toMs) {
    throw new Error('La fecha inicial no puede ser posterior a la fecha final.');
  }

  const statusCounts = new Map();
  const departmentBuckets = new Map(
    STATISTICAL_DEPARTMENTS.map((dept) => [
      dept,
      {
        department: dept,
        resolvedCount: 0,
        measuredCount: 0,
        totalHours: 0,
      },
    ]),
  );
  const resolvedCategoryCounts = new Map(
    [...categories, 'Sin clasificar'].map((cat) => [cat, 0]),
  );

  const seenTickets = new Set();
  let totalIncidents = 0;
  let activeCount = 0;
  let resolvedCount = 0;
  let dismissedCount = 0;
  let consolidatedSecondariesSkipped = 0;
  let excludedMissingDepartment = 0;
  let excludedInvalidClosureDate = 0;
  let globalMeasuredCount = 0;
  let globalTotalHours = 0;

  for (const report of reports) {
    if (!report || typeof report !== 'object') continue;
    const ticket = typeof report.ticket === 'string' ? report.ticket.trim() : '';
    if (!ticket || seenTickets.has(ticket)) continue;
    seenTickets.add(ticket);

    // Evita duplicar órdenes unificadas bajo un expediente maestro (HU-08).
    if (isSecondaryReport(report)) {
      consolidatedSecondariesSkipped += 1;
      continue;
    }

    if (fromMs !== null || toMs !== null) {
      const createdMs = Date.parse(report.createdAt || report.capturedAt || '');
      if (Number.isNaN(createdMs)) continue;
      if (fromMs !== null && createdMs < fromMs) continue;
      if (toMs !== null && createdMs > toMs) continue;
    }

    const reportCategory = typeof report.category === 'string' ? report.category.trim() : '';
    if (normalizedCategory && reportCategory !== normalizedCategory) {
      continue;
    }

    totalIncidents += 1;
    const statusLabel =
      typeof report.status === 'string' && report.status.trim()
        ? report.status.trim()
        : 'Sin estado';
    statusCounts.set(statusLabel, (statusCounts.get(statusLabel) || 0) + 1);

    if (isDismissedForStats(report)) {
      dismissedCount += 1;
      continue;
    }

    if (isResolvedForStats(report)) {
      resolvedCount += 1;
      const catKey = reportCategory || 'Sin clasificar';
      resolvedCategoryCounts.set(catKey, (resolvedCategoryCounts.get(catKey) || 0) + 1);

      const department = resolveReportDepartment(report);
      if (!department || !departmentBuckets.has(department)) {
        excludedMissingDepartment += 1;
        continue;
      }

      const deptBucket = departmentBuckets.get(department);
      deptBucket.resolvedCount += 1;

      const createdMs = Date.parse(report.createdAt || report.capturedAt || '');
      const closedRaw = resolveClosureTimestamp(report);
      const closedMs = closedRaw ? Date.parse(closedRaw) : Number.NaN;

      if (
        !Number.isFinite(createdMs) ||
        !Number.isFinite(closedMs) ||
        closedMs < createdMs
      ) {
        excludedInvalidClosureDate += 1;
        continue;
      }

      const durationHours = (closedMs - createdMs) / (1000 * 60 * 60);
      deptBucket.measuredCount += 1;
      deptBucket.totalHours += durationHours;
      globalMeasuredCount += 1;
      globalTotalHours += durationHours;
      continue;
    }

    if (isActiveReport(report)) {
      activeCount += 1;
    }
  }

  const orderedStatuses = [
    ...LIFECYCLE_STATUS_ORDER.filter((st) => statusCounts.has(st)),
    ...Array.from(statusCounts.keys())
      .filter((st) => !LIFECYCLE_STATUS_ORDER.includes(st))
      .sort((a, b) => a.localeCompare(b)),
  ];

  const maxStatusCount = orderedStatuses.reduce(
    (max, st) => Math.max(max, statusCounts.get(st) || 0),
    0,
  );

  const byStatus = orderedStatuses.map((status) => {
    const count = statusCounts.get(status) || 0;
    return {
      status,
      count,
      percentage: totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0,
      barRatio: maxStatusCount > 0 ? Number((count / maxStatusCount).toFixed(4)) : 0,
    };
  });

  const departmentItems = Array.from(departmentBuckets.values()).map((bucket) => {
    const averageHours =
      bucket.measuredCount > 0
        ? Number((bucket.totalHours / bucket.measuredCount).toFixed(2))
        : null;
    return {
      department: bucket.department,
      resolvedCount: bucket.resolvedCount,
      measuredCount: bucket.measuredCount,
      averageHours,
      averageLabel: formatDurationHours(averageHours),
    };
  });

  const maxDepartmentHours = departmentItems.reduce(
    (max, item) =>
      item.averageHours != null ? Math.max(max, item.averageHours) : max,
    0,
  );

  const byDepartment = departmentItems.map((item) => ({
    ...item,
    barRatio:
      item.averageHours != null && maxDepartmentHours > 0
        ? Number((item.averageHours / maxDepartmentHours).toFixed(4))
        : 0,
  }));

  const maxCategoryResolved = Array.from(resolvedCategoryCounts.values()).reduce(
    (max, val) => Math.max(max, val),
    0,
  );

  const resolvedByCategory = Array.from(resolvedCategoryCounts.entries())
    .filter(([cat, count]) => cat !== 'Sin clasificar' || count > 0)
    .map(([categoryName, count]) => ({
      category: categoryName,
      resolvedCount: count,
      barRatio:
        maxCategoryResolved > 0 ? Number((count / maxCategoryResolved).toFixed(4)) : 0,
    }));

  const overallAverageHours =
    globalMeasuredCount > 0
      ? Number((globalTotalHours / globalMeasuredCount).toFixed(2))
      : null;

  return {
    filters: {
      fromDate: typeof filters.fromDate === 'string' ? filters.fromDate.trim() : '',
      toDate: typeof filters.toDate === 'string' ? filters.toDate.trim() : '',
      category: normalizedCategory,
    },
    totals: {
      totalIncidents,
      activeCount,
      resolvedCount,
      dismissedCount,
      overallAverageHours,
      overallAverageLabel: formatDurationHours(overallAverageHours),
    },
    byStatus,
    byDepartment,
    resolvedByCategory,
    exclusions: {
      consolidatedSecondariesSkipped,
      excludedMissingDepartment,
      excludedInvalidClosureDate,
      totalExcludedFromAverage:
        excludedMissingDepartment + excludedInvalidClosureDate,
    },
  };
}
