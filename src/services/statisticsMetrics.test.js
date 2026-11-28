import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMunicipalStatistics,
  formatDurationHours,
} from './statisticsMetrics.js';

function makeReport(ticket, overrides = {}) {
  return {
    ticket,
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-10T08:00:00.000Z',
    status: 'Registrado / Recibido',
    category: 'Baches',
    position: { lat: 10.324, lng: -84.431 },
    history: [{ at: '2026-11-10T08:00:00.000Z', action: 'Reporte registrado' }],
    ...overrides,
  };
}

test('computeMunicipalStatistics calcula incidentes por estado, resueltos por categoría y tiempo promedio exacto por dependencia', () => {
  const reports = [
    // Red Vial: 2 casos atendidos en 12 h y 24 h -> promedio 18 h
    makeReport('RC-1', {
      category: 'Baches',
      status: 'Atendido',
      assignment: { department: 'Red Vial', crew: 'Cuadrilla de bacheo' },
      technicalClosure: { at: '2026-11-10T20:00:00.000Z', note: 'Listo' },
    }),
    makeReport('RC-2', {
      category: 'Baches',
      status: 'Atendido',
      assignment: { department: 'Red Vial', crew: 'Cuadrilla de vías' },
      technicalClosure: { at: '2026-11-11T08:00:00.000Z', note: 'Listo' },
    }),
    // Gestión Ambiental: 1 caso resuelto en 6 h
    makeReport('RC-3', {
      category: 'Basura clandestina',
      status: 'Resuelto',
      resolvedAt: '2026-11-10T14:00:00.000Z',
    }),
    // En proceso (Asignado)
    makeReport('RC-4', {
      category: 'Ramas/arbolado',
      status: 'Asignado',
      assignment: { department: 'Parques y Ornato', crew: 'Cuadrilla de poda' },
    }),
    // Desestimado (cuenta en estados, pero no en promedio de resolución)
    makeReport('RC-5', {
      category: 'Aceras dañadas',
      status: 'Desestimado',
      municipalDecision: { action: 'dismiss' },
    }),
  ];

  const stats = computeMunicipalStatistics(reports);

  assert.equal(stats.totals.totalIncidents, 5);
  assert.equal(stats.totals.activeCount, 1);
  assert.equal(stats.totals.resolvedCount, 3);
  assert.equal(stats.totals.dismissedCount, 1);
  // Promedio global: (12 + 24 + 6) / 3 = 14 h
  assert.equal(stats.totals.overallAverageHours, 14);
  assert.equal(stats.totals.overallAverageLabel, '14 h');

  const redVial = stats.byDepartment.find((d) => d.department === 'Red Vial');
  assert.equal(redVial.resolvedCount, 2);
  assert.equal(redVial.averageHours, 18);
  assert.equal(redVial.averageLabel, '18 h');

  const ambiental = stats.byDepartment.find(
    (d) => d.department === 'Gestión Ambiental',
  );
  assert.equal(ambiental.resolvedCount, 1);
  assert.equal(ambiental.averageHours, 6);

  const parques = stats.byDepartment.find(
    (d) => d.department === 'Parques y Ornato',
  );
  assert.equal(parques.resolvedCount, 0);
  assert.equal(parques.averageHours, null);
  assert.equal(parques.averageLabel, 'Sin cierres');

  const bachesResolved = stats.resolvedByCategory.find((c) => c.category === 'Baches');
  assert.equal(bachesResolved.resolvedCount, 2);
});

test('computeMunicipalStatistics actualiza métricas al filtrar por rango de fechas y categoría', () => {
  const reports = [
    makeReport('RC-OCT', {
      createdAt: '2026-10-15T08:00:00.000Z',
      category: 'Baches',
      status: 'Atendido',
      assignment: { department: 'Red Vial' },
      technicalClosure: { at: '2026-10-16T08:00:00.000Z' }, // 24 h
    }),
    makeReport('RC-NOV-BACHE', {
      createdAt: '2026-11-12T08:00:00.000Z',
      category: 'Baches',
      status: 'Atendido',
      assignment: { department: 'Red Vial' },
      technicalClosure: { at: '2026-11-12T16:00:00.000Z' }, // 8 h
    }),
    makeReport('RC-NOV-BASURA', {
      createdAt: '2026-11-14T08:00:00.000Z',
      category: 'Basura clandestina',
      status: 'Registrado / Recibido',
    }),
  ];

  const novOnly = computeMunicipalStatistics(reports, {
    fromDate: '2026-11-01',
    toDate: '2026-11-30',
  });
  assert.equal(novOnly.totals.totalIncidents, 2);
  assert.equal(novOnly.totals.overallAverageHours, 8);

  const novBachesOnly = computeMunicipalStatistics(reports, {
    fromDate: '2026-11-01',
    toDate: '2026-11-30',
    category: 'Baches',
  });
  assert.equal(novBachesOnly.totals.totalIncidents, 1);
  assert.equal(novBachesOnly.totals.resolvedCount, 1);
  assert.equal(novBachesOnly.byStatus.length, 1);
  assert.equal(novBachesOnly.byStatus[0].status, 'Atendido');
});

test('computeMunicipalStatistics excluye secundarios consolidados y contabiliza aparte casos sin dependencia o sin fecha válida de cierre', () => {
  const reports = [
    makeReport('RC-MASTER', {
      category: 'Aceras dañadas',
      status: 'Atendido',
      isMaster: true,
      secondaryTickets: ['RC-SEC'],
      assignment: { department: 'Mantenimiento de Infraestructura' },
      technicalClosure: { at: '2026-11-10T18:00:00.000Z' }, // 10 h
    }),
    makeReport('RC-SEC', {
      category: 'Aceras dañadas',
      masterTicket: 'RC-MASTER',
      consolidation: { role: 'secondary', masterTicket: 'RC-MASTER' },
    }),
    makeReport('RC-NO-DEPT', {
      category: '',
      status: 'Resuelto',
      resolvedAt: '2026-11-10T12:00:00.000Z',
    }),
    makeReport('RC-NO-CLOSE-DATE', {
      category: 'Baches',
      status: 'Atendido',
      assignment: { department: 'Red Vial' },
    }),
  ];

  const stats = computeMunicipalStatistics(reports);
  assert.equal(stats.totals.totalIncidents, 3);
  assert.equal(stats.exclusions.consolidatedSecondariesSkipped, 1);
  assert.equal(stats.exclusions.excludedMissingDepartment, 1);
  assert.equal(stats.exclusions.excludedInvalidClosureDate, 1);
  assert.equal(stats.exclusions.totalExcludedFromAverage, 2);
  assert.equal(stats.totals.overallAverageHours, 10);
});

test('computeMunicipalStatistics maneja estado vacío, rechaza fechas invertidas y procesa 3000 reportes con fluidez (RNF-03)', () => {
  const empty = computeMunicipalStatistics([]);
  assert.equal(empty.totals.totalIncidents, 0);
  assert.equal(empty.totals.overallAverageHours, null);
  assert.equal(formatDurationHours(54), '2 d 6 h');

  assert.throws(
    () =>
      computeMunicipalStatistics([], {
        fromDate: '2026-11-25',
        toDate: '2026-11-10',
      }),
    /fecha inicial no puede ser posterior/i,
  );
  assert.throws(
    () => computeMunicipalStatistics([], { category: 'Inexistente' }),
    /categoría válida/i,
  );

  const many = Array.from({ length: 3000 }, (_, i) =>
    makeReport(`RC-PERF-${i}`, {
      status: i % 2 === 0 ? 'Atendido' : 'Registrado / Recibido',
      assignment: i % 2 === 0 ? { department: 'Red Vial' } : undefined,
      technicalClosure:
        i % 2 === 0 ? { at: '2026-11-11T08:00:00.000Z' } : undefined,
    }),
  );

  const start = performance.now();
  const bulkStats = computeMunicipalStatistics(many);
  const elapsedMs = performance.now() - start;

  assert.equal(bulkStats.totals.totalIncidents, 3000);
  assert.ok(elapsedMs < 250, `Cálculo lento: ${elapsedMs.toFixed(2)} ms`);
});
