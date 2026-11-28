import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignReportCrew,
  closeTechnicalOrder,
  complementReport,
  createReport,
  getReport,
  recordMunicipalDecision,
  setReportSeverity,
} from '../src/services/reportRepository.js';
import { buildAuditHistory } from '../src/services/auditHistory.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto'], { type: 'image/png' });

test('HU-22: el historial de auditoría concilia auditLog (HU-21) y history (HU-15/HU-18) listando en orden cronológico todos los movimientos hasta el cierre', async () => {
  mockIndexedDB([original], 2);

  const created = await createReport({
    reporterId: 'author-audit',
    audio: null,
    photos: [photo()],
    category: 'Baches',
    position: { lat: 10.3238, lng: -84.4271, accuracy: 7 },
    capturedAt: '2026-11-18T08:00:00.000Z',
  });

  await complementReport(
    created.ticket,
    {
      category: 'Baches',
      description: 'Hundimiento en el carril derecho',
      transcription: '',
      references: 'Frente al supermercado',
      position: { lat: 10.3238, lng: -84.4271 },
    },
    [],
  );

  await recordMunicipalDecision(created.ticket, {
    action: 'evaluation',
    responsible: 'Inspector Carlos Vega',
  });

  await setReportSeverity(created.ticket, 'Grave');

  await recordMunicipalDecision(created.ticket, {
    action: 'admit',
    responsible: 'Jefa Técnica María Solano',
  });

  await assignReportCrew(created.ticket, {
    department: 'Red Vial',
    crew: 'Cuadrilla de bacheo',
    instructions: 'Compactar asfalto',
    deadline: '2027-01-20',
    responsible: 'Coordinador Vial',
  });

  await closeTechnicalOrder(created.ticket, {
    worker: 'Jefe de Cuadrilla Pedro Mora',
    note: 'Bache reparado en su totalidad.',
    photos: [photo()],
  });

  const stored = await getReport(created.ticket);
  const auditTrail = buildAuditHistory(stored);

  assert.equal(auditTrail.length, 7);
  assert.equal(auditTrail[0].newStatus, 'Registrado / Recibido');
  assert.equal(auditTrail[0].actor, 'Ciudadano reportante');

  assert.equal(auditTrail[2].actor, 'Inspector Carlos Vega');
  assert.equal(auditTrail[2].previousStatus, 'Registrado / Recibido');
  assert.equal(auditTrail[2].newStatus, 'En evaluación');

  assert.equal(auditTrail[4].actor, 'Jefa Técnica María Solano');
  assert.equal(auditTrail[4].previousStatus, 'En evaluación');
  assert.equal(auditTrail[4].newStatus, 'Admitido a trámite');

  assert.equal(auditTrail[5].actor, 'Coordinador Vial');
  assert.equal(auditTrail[5].previousStatus, 'Admitido a trámite');
  assert.equal(auditTrail[5].newStatus, 'Asignado');

  assert.equal(auditTrail[6].actor, 'Jefe de Cuadrilla Pedro Mora');
  assert.equal(auditTrail[6].previousStatus, 'Asignado');
  assert.equal(auditTrail[6].newStatus, 'Atendido');
  assert.match(auditTrail[6].observation, /Bache reparado en su totalidad/);

  // Verificar inmutabilidad del resultado de auditoría (RF-13)
  assert.throws(() => {
    auditTrail.push({ fake: true });
  }, TypeError);
  assert.throws(() => {
    auditTrail[0].actor = 'Modificado';
  }, TypeError);
});
