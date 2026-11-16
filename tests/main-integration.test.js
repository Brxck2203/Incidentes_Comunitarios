import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createReport, complementReport, confirmIncident, findPotentialDuplicates, getReport,
  getReports, resolveIncident, setReportSeverity, validatePhotos,
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
  await resolveIncident(original.ticket);
  assert.equal(notifications, 3);
  unsubscribe();
  await createReport({ audio: null, photos: [photo()], position: { lat: 10, lng: -84 } });
  assert.equal(notifications, 3);
});
