import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, nearbyMatches } from '../src/services/reportDuplicates.js';
import { createReport, getReport, findPotentialDuplicates } from '../src/services/reportRepository.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

test('HU-06: category, status and actual 50-meter radius filter', () => {
  const center = { lat: 10, lng: -84 };
  assert.ok(distanceMeters(center, { lat: 10.0004, lng: -84 }) < 50);
  assert.ok(distanceMeters(center, { lat: 10.0005, lng: -84 }) > 50);
  const candidate = (ticket, lat, category = 'Baches', status = 'Registrado / Recibido') =>
    ({ ...original, ticket, category, status, position: { lat, lng: -84 } });
  const result = nearbyMatches([
    candidate('near', 10.0004), candidate('far', 10.0005),
    candidate('other', 10, 'Aceras dañadas'), candidate('resolved', 10, 'Baches', 'Resuelto'),
  ], center, 'Baches');
  assert.deepEqual(result.map((r) => r.ticket), ['near']);
  assert.equal(nearbyMatches([candidate('near', 10)], center, 'Baches', 'near').length, 0);
});

test('HU-06: IndexedDB v1 records migrate to v2 and category index preserves reports', async () => {
  const mock = mockIndexedDB([original]);
  assert.deepEqual(await getReport(original.ticket), original);
  assert.equal(mock.state.version, 2);
  assert.equal(mock.state.hasCategoryIndex, true);
  assert.equal((await findPotentialDuplicates({ lat: 10.0002, lng: -84 }, 'Baches')).length, 1);
  assert.equal((await findPotentialDuplicates({ lat: 10, lng: -84 }, 'Basura clandestina')).length, 0);
  assert.equal((await findPotentialDuplicates({ lat: 10, lng: -84 }, 'Baches', original.ticket)).length, 0);
  const photo = new Blob(['photo'], { type: 'image/png' });
  const created = await createReport({ audio: null, photos: [photo], position: { lat: 10, lng: -84 }, capturedAt: new Date().toISOString(), category: 'Baches' });
  assert.equal(created.category, 'Baches');
  assert.equal((await getReport(created.ticket)).photos[0].size, photo.size);
});
