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
import { buildIncidentHeatmap } from '../src/services/incidentHeatmap.js';
import { mockIndexedDB } from './helpers/mockIndexedDB.js';

const samplePhoto = () => new Blob(['evidencia'], { type: 'image/jpeg' });

test('HU-29: calcula zonas de concentración y filtra por categoría desde IndexedDB v2 incluyendo reincidencia histórica sin duplicar consolidados', async () => {
  mockIndexedDB([], 2);

  // Tres reportes de baches en la misma cuadra (uno atendido, dos consolidados)
  const bacheHistorico = await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.3241, lng: -84.4311 },
    category: 'Baches',
  });
  await recordMunicipalDecision(bacheHistorico.ticket, {
    action: 'admit',
    responsible: 'Gestor Municipal',
  });
  await assignReportCrew(bacheHistorico.ticket, {
    department: 'Red Vial',
    crew: 'Cuadrilla de bacheo',
    instructions: 'Bacheo asfáltico preventivo.',
    deadline: '2099-12-31',
    responsible: 'Gestor Municipal',
  });
  await closeTechnicalOrder(bacheHistorico.ticket, {
    worker: 'Encargado Vial',
    note: 'Reparación completada.',
    photos: [samplePhoto()],
  });

  const bacheMaestro = await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.3242, lng: -84.4312 },
    category: 'Baches',
  });
  const bacheSecundario = await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.3243, lng: -84.4313 },
    category: 'Baches',
  });
  await consolidateReports({
    tickets: [bacheMaestro.ticket, bacheSecundario.ticket],
    masterTicket: bacheMaestro.ticket,
    reason: 'Mismo hundimiento en la calzada.',
    official: 'Gestor Municipal',
  });

  // Un reporte de basura clandestina en otro punto y uno desestimado
  await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.3551, lng: -84.4551 },
    category: 'Basura clandestina',
  });
  const desestimado = await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.3241, lng: -84.4311 },
    category: 'Baches',
  });
  await recordMunicipalDecision(desestimado.ticket, {
    action: 'dismiss',
    cause: 'Fuera de jurisdicción cantonal',
    justification: 'Ruta nacional fuera de competencia municipal.',
    responsible: 'Gestor Municipal',
  });

  const storedReports = await getReports();
  const generalHeatmap = buildIncidentHeatmap(storedReports);

  assert.equal(generalHeatmap.mappedReportsCount, 4);
  assert.equal(generalHeatmap.excludedDismissedCount, 1);
  assert.equal(generalHeatmap.cells.length, 2);
  assert.equal(generalHeatmap.cells[0].count, 3);
  assert.equal(generalHeatmap.cells[0].historicalClosedCount, 1);
  assert.equal(generalHeatmap.cells[0].level.key, 'high');

  // Filtrado por categoría: solo basura clandestina
  const wasteHeatmap = buildIncidentHeatmap(storedReports, {
    category: 'Basura clandestina',
  });
  assert.equal(wasteHeatmap.mappedReportsCount, 1);
  assert.equal(wasteHeatmap.cells.length, 1);
  assert.deepEqual(wasteHeatmap.cells[0].byCategory, { 'Basura clandestina': 1 });

  // Restablecer vista general («todas»)
  const restoredHeatmap = buildIncidentHeatmap(storedReports, { category: '' });
  assert.equal(restoredHeatmap.mappedReportsCount, 4);
});
