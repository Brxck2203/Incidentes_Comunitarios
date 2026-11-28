import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignReportCrew,
  closeTechnicalOrder,
  createReport,
  getReports,
  recordMunicipalDecision,
} from '../src/services/reportRepository.js';
import { consolidateReports } from '../src/services/consolidationService.js';
import { computeMunicipalStatistics } from '../src/services/statisticsMetrics.js';
import { mockIndexedDB } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto'], { type: 'image/jpeg' });

test('HU-27: calcula métricas de incidentes por estado, casos resueltos por categoría y tiempos por dependencia desde IndexedDB v2', async () => {
  mockIndexedDB([], 2);

  // 1. Reporte de baches admitido, asignado a Red Vial y cerrado como Atendido
  const bache = await createReport({
    photos: [photo()],
    position: { lat: 10.324, lng: -84.431 },
    category: 'Baches',
  });
  await recordMunicipalDecision(bache.ticket, {
    action: 'admit',
    responsible: 'Gestor Vial',
  });
  await assignReportCrew(bache.ticket, {
    department: 'Red Vial',
    crew: 'Cuadrilla de bacheo',
    instructions: 'Bacheo de urgencia.',
    deadline: '2099-12-31',
    responsible: 'Gestor Vial',
  });
  await closeTechnicalOrder(bache.ticket, {
    worker: 'Encargado Cuadrilla',
    note: 'Carpeta colocada.',
    photos: [photo()],
  });

  // 2. Dos reportes de basura consolidados en un solo caso maestro (abierto)
  const basura1 = await createReport({
    photos: [photo()],
    position: { lat: 10.33, lng: -84.44 },
    category: 'Basura clandestina',
  });
  const basura2 = await createReport({
    photos: [photo()],
    position: { lat: 10.3301, lng: -84.4401 },
    category: 'Basura clandestina',
  });
  await consolidateReports({
    tickets: [basura1.ticket, basura2.ticket],
    masterTicket: basura1.ticket,
    reason: 'Mismo botadero clandestino.',
    official: 'Gestor Ambiental',
  });

  // 3. Reporte desestimado
  const aceraDesestimada = await createReport({
    photos: [photo()],
    position: { lat: 10.35, lng: -84.45 },
    category: 'Aceras dañadas',
  });
  await recordMunicipalDecision(aceraDesestimada.ticket, {
    action: 'dismiss',
    cause: 'Competencia de otra entidad',
    justification: 'Corresponde a servidumbre privada.',
    responsible: 'Gestor Municipal',
  });

  const stored = await getReports();
  const allStats = computeMunicipalStatistics(stored);

  // 3 incidentes únicos (el secundario basura2 no duplica al maestro basura1)
  assert.equal(allStats.totals.totalIncidents, 3);
  assert.equal(allStats.totals.resolvedCount, 1);
  assert.equal(allStats.totals.activeCount, 1);
  assert.equal(allStats.totals.dismissedCount, 1);
  assert.equal(allStats.exclusions.consolidatedSecondariesSkipped, 1);

  const redVial = allStats.byDepartment.find((d) => d.department === 'Red Vial');
  assert.equal(redVial.resolvedCount, 1);
  assert.ok(redVial.averageHours !== null && redVial.averageHours >= 0);

  // Al filtrar por categoría Baches solo aparece el caso atendido
  const onlyBaches = computeMunicipalStatistics(stored, { category: 'Baches' });
  assert.equal(onlyBaches.totals.totalIncidents, 1);
  assert.equal(onlyBaches.totals.resolvedCount, 1);
});
