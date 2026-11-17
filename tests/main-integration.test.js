import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createReport, complementReport, confirmIncident, filterOwnReports, findPotentialDuplicates, getReport,
  getReports, isOwnReport, recordMunicipalDecision, resolveIncident, setReportSeverity, validatePhotos,
} from '../src/services/reportRepository.js';
import { priorityInfo, sortReceptionReports } from '../src/services/reportPriority.js';
import { subscribeToReportChanges } from '../src/services/reportNotifications.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto'], { type: 'image/png' });

test('Integración: conservar datos v1, completar reporte y detectar duplicidad a 50 m', async () => {
  const { state } = mockIndexedDB([original]);
  const created = await createReport({
    reporterId: 'author', audio: null, photos: [photo()], category: 'Baches',
    position: { lat: 10.0001, lng: -84, accuracy: 12 }, capturedAt: new Date().toISOString(),
  });
  assert.equal(state.version, 2);
  assert.deepEqual((await getReport(original.ticket)).history, original.history);
  assert.equal((await findPotentialDuplicates(created.position, 'Baches', created.ticket))[0].ticket, original.ticket);
  const updated = await complementReport(created.ticket, {
    position: { lat: 10.001, lng: -84 }, category: 'Aceras dañadas',
    description: 'Acera rota', transcription: '', references: 'Esquina',
  }, [photo()]);
  assert.equal(updated.ticket, created.ticket);
  assert.equal(updated.photos.length, 2);
  assert.equal((await getReport(created.ticket)).category, 'Aceras dañadas');
  assert.equal((await findPotentialDuplicates(updated.position, 'Baches')).length, 0);
});

test('Integración: respaldos, severidad, prioridad, cierre y avisos persistidos', async () => {
  mockIndexedDB([original]);
  const first = await confirmIncident(original.ticket, [photo()], 'neighbor-one');
  const second = await confirmIncident(original.ticket, [], 'neighbor-two');
  assert.equal(first.confirmations.length, 1);
  assert.equal(second.confirmations.length, 2);
  const critical = await setReportSeverity(original.ticket, 'Crítico');
  assert.equal(priorityInfo(critical).score, 420);
  const another = await createReport({
    audio: null, photos: [photo()], position: { lat: 10.001, lng: -84 },
    capturedAt: new Date().toISOString(), reporterId: 'author', category: 'Baches',
  });
  const sorted = sortReceptionReports(await getReports());
  assert.equal(sorted[0].ticket, original.ticket);
  assert.equal(sorted[1].ticket, another.ticket);
  const done = await resolveIncident(original.ticket);
  assert.equal(done.status, 'Resuelto');
  assert.equal(done.confirmations.length, 2);
  assert.ok(done.resolvedAt);
  assert.equal(sortReceptionReports(await getReports())[0].ticket, another.ticket);
  await assert.rejects(() => confirmIncident(original.ticket, [], 'neighbor-three'), /no admite confirmaciones/);
  await assert.rejects(() => resolveIncident(original.ticket), /ya está cerrado/);
});

test('Integración: errores de edición, ubicaciones y fotografías inválidas', async () => {
  mockIndexedDB([original]);
  const details = { position: { lat: 10, lng: -84 }, category: 'Baches', description: '', transcription: '', references: '' };
  await assert.rejects(() => complementReport('no-existe', details, []), /no existe/);
  await assert.rejects(() => confirmIncident('no-existe', [], 'a'), /no existe/);
  await assert.rejects(() => setReportSeverity('no-existe', 'Grave'), /no existe/);
  assert.throws(() => validatePhotos([new Blob(['abc'], { type: 'text/plain' })]), /JPG/);
  await assert.rejects(() => createReport({ audio: null, photos: [photo()], position: { lat: 100, lng: -84 } }), /ubicación/);
  assert.deepEqual(await getReport(original.ticket), original);
});

test('Integración: las escrituras notifican a vistas suscritas y la baja detiene avisos locales', async () => {
  mockIndexedDB([original]);
  const events = new EventTarget();
  window.addEventListener = events.addEventListener.bind(events);
  window.removeEventListener = events.removeEventListener.bind(events);
  window.dispatchEvent = events.dispatchEvent.bind(events);
  let notifications = 0;
  const unsubscribe = subscribeToReportChanges(() => { notifications += 1; });
  await setReportSeverity(original.ticket, 'Moderado');
  await confirmIncident(original.ticket, [], 'neighbor');
  await recordMunicipalDecision(original.ticket, { action: 'evaluation', responsible: 'Gestor local' });
  await resolveIncident(original.ticket);
  assert.equal(notifications, 4);
  unsubscribe();
  await createReport({ audio: null, photos: [photo()], position: { lat: 10, lng: -84 } });
  assert.equal(notifications, 4);
});

test('Integración: la admisión conserva el expediente y confirma estado e historial después de guardar', async () => {
  const initial = {
    ...original,
    audio: { size: 44, type: 'audio/webm', id: 'preserved-audio' },
    photos: [photo()],
    severity: 'Grave',
    capturedAt: '2026-11-12T09:00:00.000Z',
  };
  mockIndexedDB([initial]);
  const admitted = await recordMunicipalDecision(original.ticket, {
    action: 'admit',
    responsible: 'Gestor local',
  });

  assert.equal(admitted.status, 'Admitido a trámite');
  assert.equal(admitted.municipalDecision.responsible, 'Gestor local');
  assert.equal(admitted.receptionEvent, 'Expediente admitido a trámite');
  assert.equal(admitted.history.length, initial.history.length + 1);
  assert.equal(admitted.audio, initial.audio);
  assert.equal(admitted.photos, initial.photos);
  assert.equal(admitted.severity, initial.severity);
  assert.equal(admitted.createdAt, initial.createdAt);
  assert.equal(admitted.capturedAt, initial.capturedAt);
  assert.equal(admitted.originalPosition, initial.originalPosition);
  assert.equal((await getReport(original.ticket)).municipalDecision.action, 'admit');
});

test('Integración: desestimación valida causal y justificación; los errores no alteran el expediente', async () => {
  mockIndexedDB([original]);
  const invalidCause = {
    action: 'dismiss',
    responsible: 'Gestor local',
    cause: 'Causal inventada',
    justification: 'Justificación suficiente',
  };
  const missingJustification = {
    ...invalidCause,
    cause: 'Competencia de otra entidad',
    justification: '   ',
  };
  await assert.rejects(() => recordMunicipalDecision(original.ticket, invalidCause), /causal/i);
  await assert.rejects(() => recordMunicipalDecision(original.ticket, missingJustification), /justificación/i);
  await assert.rejects(() => recordMunicipalDecision('RC-missing', {
    action: 'admit', responsible: 'Gestor local',
  }), /no existe/i);
  assert.equal((await getReport(original.ticket)).status, original.status);
  assert.equal((await getReport(original.ticket)).history.length, original.history.length);
});

test('Integración: dictámenes repetidos no duplican historial y secundarios o estados terminales los rechazan', async () => {
  mockIndexedDB([original]);
  const decision = { action: 'admit', responsible: 'Gestor local' };
  const first = await recordMunicipalDecision(original.ticket, decision);
  const repeated = await recordMunicipalDecision(original.ticket, decision);
  assert.equal(repeated.history.length, first.history.length);
  assert.equal(repeated.updatedAt, first.updatedAt);

  const secondary = { ...original, ticket: 'RC-secondary', masterTicket: original.ticket };
  mockIndexedDB([secondary]);
  await assert.rejects(() => recordMunicipalDecision(secondary.ticket, decision), /expediente maestro/i);
  await assert.rejects(() => resolveIncident(secondary.ticket), /expediente maestro/i);
  await assert.rejects(() => setReportSeverity(secondary.ticket, 'Grave'), /expediente maestro/i);

  mockIndexedDB([{ ...original, status: 'Desestimado' }]);
  await assert.rejects(() => recordMunicipalDecision(original.ticket, decision), /recibidos o en evaluación/i);
  await assert.rejects(() => resolveIncident(original.ticket), /cerrado/i);
  await assert.rejects(() => setReportSeverity(original.ticket, 'Crítico'), /cerrado/i);
});

test('Integración: una confirmación de un ticket secundario consulta el estado vigente del maestro', async () => {
  const secondary = { ...original, ticket: 'RC-secondary', masterTicket: 'RC-master' };
  const master = { ...original, ticket: 'RC-master', status: 'Desestimado' };
  mockIndexedDB([secondary, master]);
  await assert.rejects(() => confirmIncident(secondary.ticket, [], 'neighbor'), /maestro está cerrado/i);
  assert.equal((await getReport(secondary.ticket)).confirmations?.length ?? 0, 0);

  const orphanSecondary = { ...original, ticket: 'RC-orphan', consolidation: { role: 'secondary' } };
  mockIndexedDB([orphanSecondary]);
  await assert.rejects(() => confirmIncident(orphanSecondary.ticket, [], 'neighbor'), /maestro no está disponible/i);
  assert.equal((await getReport(orphanSecondary.ticket)).confirmations?.length ?? 0, 0);
});

test('RF-02: filterOwnReports devuelve únicamente los reportes propios del participante y registros v1 sin reporterId', async () => {
  mockIndexedDB([original]);
  const mine = await createReport({
    reporterId: 'citizen-A', audio: null, photos: [photo()], category: 'Baches',
    position: { lat: 10.001, lng: -84 }, capturedAt: new Date().toISOString(),
  });
  const neighborReport = await createReport({
    reporterId: 'citizen-B', audio: null, photos: [photo()], category: 'Aceras dañadas',
    position: { lat: 10.002, lng: -84 }, capturedAt: new Date().toISOString(),
  });
  const all = await getReports();
  const filteredForA = filterOwnReports(all, 'citizen-A');

  assert.equal(isOwnReport(mine, 'citizen-A'), true);
  assert.equal(isOwnReport(neighborReport, 'citizen-A'), false);
  assert.equal(isOwnReport(original, 'citizen-A'), true);
  assert.ok(filteredForA.some((item) => item.ticket === mine.ticket));
  assert.ok(filteredForA.some((item) => item.ticket === original.ticket));
  assert.ok(!filteredForA.some((item) => item.ticket === neighborReport.ticket));
});
