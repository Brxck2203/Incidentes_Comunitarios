import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIncidentHeatmap,
  isReportEligibleForHeatmap,
  resolveIntensityLevel,
} from './incidentHeatmap.js';

function makeReport(ticket, overrides = {}) {
  return {
    ticket,
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
    status: 'Registrado / Recibido',
    category: 'Baches',
    position: { lat: 10.3241, lng: -84.4311 },
    history: [{ at: '2026-11-10T10:00:00.000Z', action: 'Reporte registrado' }],
    ...overrides,
  };
}

test('buildIncidentHeatmap agrupa zonas con mayor acumulación y asigna niveles de color por concentración', () => {
  const reports = [
    // Zona crítica: 4 reportes en la misma celda (~10.3241, -84.4311)
    makeReport('RC-1', { position: { lat: 10.3241, lng: -84.4311 } }),
    makeReport('RC-2', { position: { lat: 10.3242, lng: -84.4312 }, status: 'En evaluación' }),
    makeReport('RC-3', { position: { lat: 10.3243, lng: -84.4313 }, status: 'Atendido' }),
    makeReport('RC-4', { position: { lat: 10.3244, lng: -84.4314 }, status: 'Resuelto' }),
    // Zona moderada: 2 reportes en otra celda (~10.3405, -84.4505)
    makeReport('RC-5', {
      position: { lat: 10.3405, lng: -84.4505 },
      category: 'Basura clandestina',
    }),
    makeReport('RC-6', {
      position: { lat: 10.3406, lng: -84.4506 },
      category: 'Basura clandestina',
    }),
    // Zona baja: 1 reporte aislado (~10.3605, -84.4705)
    makeReport('RC-7', {
      position: { lat: 10.3605, lng: -84.4705 },
      category: 'Aceras dañadas',
    }),
  ];

  const result = buildIncidentHeatmap(reports);

  assert.equal(result.mappedReportsCount, 7);
  assert.equal(result.cells.length, 3);
  assert.equal(result.maxCellCount, 4);

  // Las celdas vienen ordenadas de mayor a menor concentración
  assert.equal(result.cells[0].count, 4);
  assert.equal(result.cells[0].historicalClosedCount, 2);
  assert.equal(result.cells[0].level.key, 'critical');

  assert.equal(result.cells[1].count, 2);
  assert.equal(result.cells[1].level.key, 'medium');

  assert.equal(result.cells[2].count, 1);
  assert.equal(result.cells[2].level.key, 'low');
});

test('buildIncidentHeatmap filtra únicamente los puntos críticos de la categoría elegida y restablece todas con cadena vacía', () => {
  const reports = [
    makeReport('RC-10', { category: 'Baches', position: { lat: 10.3241, lng: -84.4311 } }),
    makeReport('RC-11', { category: 'Baches', position: { lat: 10.3242, lng: -84.4312 } }),
    makeReport('RC-12', {
      category: 'Basura clandestina',
      position: { lat: 10.3501, lng: -84.4401 },
    }),
    makeReport('RC-13', {
      category: 'Ramas/arbolado',
      position: { lat: 10.3701, lng: -84.4601 },
    }),
  ];

  const onlyPotholes = buildIncidentHeatmap(reports, { category: 'Baches' });
  assert.equal(onlyPotholes.mappedReportsCount, 2);
  assert.equal(onlyPotholes.cells.length, 1);
  assert.deepEqual(onlyPotholes.cells[0].byCategory, { Baches: 2 });

  const onlyWaste = buildIncidentHeatmap(reports, { category: 'Basura clandestina' });
  assert.equal(onlyWaste.mappedReportsCount, 1);
  assert.equal(onlyWaste.cells.length, 1);
  assert.deepEqual(onlyWaste.cells[0].byCategory, { 'Basura clandestina': 1 });

  const allRestored = buildIncidentHeatmap(reports, { category: '' });
  assert.equal(allRestored.mappedReportsCount, 4);
  assert.equal(allRestored.cells.length, 3);
});

test('buildIncidentHeatmap excluye desestimados, no duplica consolidados y cuenta aparte reportes sin coordenadas válidas', () => {
  const master = makeReport('RC-100', {
    category: 'Aceras dañadas',
    isMaster: true,
    secondaryTickets: ['RC-101'],
    mergedEvidence: [{ sourceTicket: 'RC-101', position: { lat: 10.3242, lng: -84.4312 } }],
    position: { lat: 10.3241, lng: -84.4311 },
  });
  const secondaryWithoutOwnCategory = makeReport('RC-101', {
    category: '',
    masterTicket: 'RC-100',
    consolidation: { role: 'secondary', masterTicket: 'RC-100' },
    position: { lat: 10.3242, lng: -84.4312 },
  });
  const dismissed = makeReport('RC-102', {
    status: 'Desestimado',
    municipalDecision: { action: 'dismiss' },
    position: { lat: 10.3241, lng: -84.4311 },
  });
  const missingCoords = makeReport('RC-103', {
    category: 'Aceras dañadas',
    position: null,
  });
  const outOfRangeCoords = makeReport('RC-104', {
    category: 'Aceras dañadas',
    position: { lat: 145, lng: -220 },
  });

  assert.equal(isReportEligibleForHeatmap(dismissed), false);
  assert.equal(isReportEligibleForHeatmap(master), true);

  const filtered = buildIncidentHeatmap(
    [master, secondaryWithoutOwnCategory, dismissed, missingCoords, outOfRangeCoords],
    { category: 'Aceras dañadas' },
  );

  // Maestro (1) + secundario (1), sin volver a sumar secondaryTickets ni mergedEvidence = 2 en mapa
  assert.equal(filtered.mappedReportsCount, 2);
  assert.equal(filtered.excludedDismissedCount, 1);
  assert.equal(filtered.excludedInvalidCoordsCount, 2);
  assert.equal(filtered.totalMatchingReports, 4);
});

test('buildIncidentHeatmap maneja 0 reportes, valida entradas inválidas y deja listo el filtrado por fechas para HU-30', () => {
  const empty = buildIncidentHeatmap([]);
  assert.equal(empty.cells.length, 0);
  assert.equal(empty.mappedReportsCount, 0);
  assert.equal(empty.maxCellCount, 0);

  // Un solo reporte aislado nunca se etiqueta como zona crítica
  assert.equal(resolveIntensityLevel(1, 1).key, 'low');

  assert.throws(
    () => buildIncidentHeatmap([], { category: 'Categoría inventada' }),
    /categoría válida/i,
  );
  assert.throws(
    () => buildIncidentHeatmap([], { fromDate: '2026-11-20', toDate: '2026-11-10' }),
    /fecha inicial no puede ser posterior/i,
  );

  const periodFiltered = buildIncidentHeatmap(
    [
      makeReport('RC-200', { createdAt: '2026-10-05T12:00:00.000Z' }),
      makeReport('RC-201', { createdAt: '2026-11-15T12:00:00.000Z' }),
    ],
    { fromDate: '2026-11-01', toDate: '2026-11-30' },
  );
  assert.equal(periodFiltered.mappedReportsCount, 1);
});

test('buildIncidentHeatmap procesa 2500 reportes georreferenciados con rapidez cumpliendo RNF-03', () => {
  const bulkReports = Array.from({ length: 2500 }, (_, index) =>
    makeReport(`RC-BULK-${index}`, {
      position: {
        lat: 10.3 + (index % 50) * 0.0015,
        lng: -84.45 + Math.floor(index / 50) * 0.0015,
      },
    }),
  );

  const start = performance.now();
  const heatmap = buildIncidentHeatmap(bulkReports);
  const elapsedMs = performance.now() - start;

  assert.equal(heatmap.mappedReportsCount, 2500);
  assert.ok(heatmap.cells.length > 0);
  assert.ok(elapsedMs < 250, `Tiempo excesivo de agregación: ${elapsedMs.toFixed(2)} ms`);
});
