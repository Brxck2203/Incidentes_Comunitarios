import test from 'node:test';
import assert from 'node:assert/strict';
import { priorityInfo, sortReceptionReports, severityLevels } from '../src/services/reportPriority.js';
import { getReport, setReportSeverity } from '../src/services/reportRepository.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

test('HU-14: severe and critical incidents lead the queue; endorsements increase score', () => {
  const make = (ticket, severity, supporters = 0) => ({
    ...original, ticket, severity, confirmations: Array(supporters).fill({}),
    createdAt: '2026-11-12T10:00:00.000Z',
  });
  const records = [make('mild', 'Leve', 40), make('critical', 'Crítico'),
    make('serious-1', 'Grave', 1), make('serious-2', 'Grave', 2), make('unset', '')];
  assert.deepEqual(severityLevels, ['Leve', 'Moderado', 'Grave', 'Crítico']);
  assert.equal(priorityInfo(records[3]).score, 320);
  assert.deepEqual(sortReceptionReports(records).map((x) => x.ticket), ['critical', 'serious-2', 'serious-1', 'mild', 'unset']);
});

test('HU-14: assigned severity persists without dropping legacy report fields', async () => {
  mockIndexedDB([original]);
  const updated = await setReportSeverity(original.ticket, 'Crítico');
  assert.equal(updated.severity, 'Crítico');
  assert.deepEqual(updated.photos, original.photos);
  assert.equal((await getReport(original.ticket)).severity, 'Crítico');
  assert.throws(() => setReportSeverity(original.ticket, 'Inexistente'), /severidad válida/);
});
