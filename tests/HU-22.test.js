import test from 'node:test';
import assert from 'node:assert/strict';
import {
  complementReport,
  createReport,
  getReport,
  recordMunicipalDecision,
  resolveIncident,
  setReportSeverity,
} from '../src/services/reportRepository.js';
import { buildAuditHistory } from '../src/services/auditHistory.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto'], { type: 'image/png' });

test('HU-22: el historial de auditoría lista en orden cronológico completo todos los movimientos desde la recepción hasta el cierre sin permitir mutación', async () => {
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

  await resolveIncident(created.ticket);

  const stored = await getReport(created.ticket);
  const auditTrail = buildAuditHistory(stored);

  assert.equal(auditTrail.length, 6);
  assert.equal(auditTrail[0].newStatus, 'Registrado / Recibido');
  assert.equal(auditTrail[0].actor, 'Ciudadano reportante');

  assert.equal(auditTrail[2].actor, 'Inspector Carlos Vega');
  assert.equal(auditTrail[2].previousStatus, 'Registrado / Recibido');
  assert.equal(auditTrail[2].newStatus, 'En evaluación');

  assert.equal(auditTrail[4].actor, 'Jefa Técnica María Solano');
  assert.equal(auditTrail[4].previousStatus, 'En evaluación');
  assert.equal(auditTrail[4].newStatus, 'Admitido a trámite');

  assert.equal(auditTrail[5].previousStatus, 'Admitido a trámite');
  assert.equal(auditTrail[5].newStatus, 'Resuelto');

  // Verificar inmutabilidad del resultado de auditoría (RF-13)
  assert.throws(() => {
    auditTrail.push({ fake: true });
  }, TypeError);
  assert.throws(() => {
    auditTrail[0].actor = 'Modificado';
  }, TypeError);
});
