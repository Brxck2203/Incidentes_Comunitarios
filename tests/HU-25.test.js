import test from 'node:test';
import assert from 'node:assert/strict';
import { getReport } from '../src/services/reportRepository.js';
import {
  ARCHIVED_CLOSURE_STATUS,
  ATTENDED_STATUS,
  confirmClosureSolution,
  extractClosureCertificate,
} from '../src/services/closureConfirmation.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto-final'], { type: 'image/jpeg' });

test('HU-25: confirmClosureSolution persiste en IndexedDB v2 el archivo definitivo dentro del plazo y conserva la constancia de cierre', async () => {
  const attendedRecord = {
    ...original,
    status: ATTENDED_STATUS,
    category: 'Aceras dañadas',
    closure: {
      closedAt: '2026-11-20T09:00:00.000Z',
      department: 'Mantenimiento de Infraestructura',
      crewName: 'Cuadrilla de Obras y Aceras',
      technicalNote: 'Reconstrucción de losa de concreto en esquina.',
      photos: [photo()],
    },
    history: [
      ...original.history,
      { at: '2026-11-20T09:00:00.000Z', action: 'Incidente marcado como Atendido' },
    ],
  };

  mockIndexedDB([attendedRecord], 2);

  const beforeConfirmCert = extractClosureCertificate(attendedRecord, {
    now: '2026-11-21T09:00:00.000Z',
  });
  assert.equal(beforeConfirmCert.canConfirmSolution, true);
  assert.equal(beforeConfirmCert.department, 'Mantenimiento de Infraestructura');
  assert.equal(beforeConfirmCert.hasClosurePhoto, true);

  const confirmed = await confirmClosureSolution(attendedRecord.ticket, {
    now: '2026-11-21T15:00:00.000Z',
  });

  assert.equal(confirmed.status, ARCHIVED_CLOSURE_STATUS);
  assert.equal(confirmed.closureArchived, true);
  assert.equal(confirmed.solutionConfirmedAt, '2026-11-21T15:00:00.000Z');

  const stored = await getReport(attendedRecord.ticket);
  assert.equal(stored.status, ARCHIVED_CLOSURE_STATUS);
  assert.equal(stored.closureArchived, true);
  assert.equal(stored.history.length, attendedRecord.history.length + 1);
  assert.deepEqual(stored.history.slice(0, attendedRecord.history.length), attendedRecord.history);
});

test('HU-25: confirmClosureSolution rechaza confirmar fuera del plazo configurado o en reportes abiertos sin alterar IndexedDB', async () => {
  const attendedRecord = {
    ...original,
    status: ATTENDED_STATUS,
    closure: {
      closedAt: '2026-11-10T08:00:00.000Z',
      department: 'Red Vial',
      technicalNote: 'Bache reparado',
      photos: [],
    },
  };

  mockIndexedDB([attendedRecord], 2);

  // Fuera del plazo de 72 horas
  await assert.rejects(
    () =>
      confirmClosureSolution(attendedRecord.ticket, {
        now: '2026-11-15T08:00:00.000Z',
      }),
    /plazo de 72 horas para confirmar la solución ya expiró/i,
  );

  const stored = await getReport(attendedRecord.ticket);
  assert.equal(stored.status, ATTENDED_STATUS);
  assert.equal(Boolean(stored.closureArchived), false);
});
