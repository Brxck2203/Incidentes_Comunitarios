import test from 'node:test';
import assert from 'node:assert/strict';
import { isActiveReport, endorsementCount } from '../src/services/reportEndorsements.js';
import { confirmIncident, createReport, getReport, resolveIncident } from '../src/services/reportRepository.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

test('HU-10: existing reports can be confirmed once with photos and receive resolution locally', async () => {
  mockIndexedDB([original]);
  assert.equal(endorsementCount(original), 0);
  assert.ok(isActiveReport(original));
  const photo = new Blob(['photo'], { type: 'image/png' });
  const confirmed = await confirmIncident(original.ticket, [photo], 'neighbor');
  assert.equal(confirmed.confirmations.length, 1);
  assert.equal(confirmed.confirmations[0].photos[0].size, photo.size);
  await assert.rejects(() => confirmIncident(original.ticket, [], 'neighbor'), /anteriormente/);
  const resolved = await resolveIncident(original.ticket);
  assert.equal(resolved.status, 'Resuelto');
  assert.equal(endorsementCount(await getReport(original.ticket)), 1);
  assert.ok(resolved.resolvedAt);
  assert.equal(isActiveReport(resolved), false);
  await assert.rejects(() => confirmIncident(original.ticket, [], 'other-neighbor'), /no admite confirmaciones/);
});

test('HU-10: the original reporter cannot endorse their own new report', async () => {
  mockIndexedDB();
  const photo = new Blob(['photo'], { type: 'image/png' });
  const created = await createReport({ audio: null, photos: [photo], position: { lat: 10, lng: -84 }, capturedAt: new Date().toISOString(), reporterId: 'author' });
  assert.equal(created.reporterId, 'author');
  await assert.rejects(() => confirmIncident(created.ticket, [], 'author'), /propio/);
  const confirmed = await confirmIncident(created.ticket, [], 'another');
  assert.equal(endorsementCount(confirmed), 1);
});
