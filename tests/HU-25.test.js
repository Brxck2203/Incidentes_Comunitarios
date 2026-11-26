import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignReportCrew,
  closeTechnicalOrder,
  createReport,
  getReport,
  recordMunicipalDecision,
} from '../src/services/reportRepository.js';
import {
  ARCHIVED_CLOSURE_STATUS,
  ATTENDED_STATUS,
  confirmClosureSolution,
  extractClosureCertificate,
} from '../src/services/closureConfirmation.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto-final'], { type: 'image/jpeg' });

test('HU-25: flujo completo con HU-15, HU-18 y HU-21 persiste en IndexedDB v2 el archivo definitivo dentro del plazo y registra auditoría', async () => {
  mockIndexedDB([], 2);

  const created = await createReport({
    photos: [photo()],
    position: { lat: 9.935, lng: -84.091 },
    category: 'Aceras dañadas',
    reporterId: 'ciudadano-hu25',
  });

  await recordMunicipalDecision(created.ticket, {
    action: 'admit',
    responsible: 'Valeria Gestora',
  });

  await assignReportCrew(created.ticket, {
    department: 'Mantenimiento de Infraestructura',
    crew: 'Cuadrilla de aceras',
    instructions: 'Reconstruir losa de concreto fracturada en esquina.',
    deadline: '2099-12-31',
    responsible: 'Valeria Gestora',
  });

  const closedOrder = await closeTechnicalOrder(created.ticket, {
    worker: 'Esteban Encargado',
    note: 'Reconstrucción de losa de concreto en esquina completada.',
    photos: [photo()],
  });

  const closedTimeMs = Date.parse(closedOrder.technicalClosure.at);
  const twentyFourHoursLater = new Date(closedTimeMs + 24 * 60 * 60 * 1000).toISOString();
  const thirtyHoursLater = new Date(closedTimeMs + 30 * 60 * 60 * 1000).toISOString();

  const beforeConfirmCert = extractClosureCertificate(closedOrder, {
    now: twentyFourHoursLater,
  });
  assert.equal(beforeConfirmCert.canConfirmSolution, true);
  assert.equal(beforeConfirmCert.department, 'Mantenimiento de Infraestructura');
  assert.equal(beforeConfirmCert.crewName, 'Cuadrilla de aceras');
  assert.equal(beforeConfirmCert.hasClosurePhoto, true);
  assert.match(beforeConfirmCert.technicalNote, /losa de concreto/);

  const confirmed = await confirmClosureSolution(closedOrder.ticket, {
    now: thirtyHoursLater,
  });

  assert.equal(confirmed.status, ARCHIVED_CLOSURE_STATUS);
  assert.equal(confirmed.closureArchived, true);
  assert.equal(confirmed.solutionConfirmedAt, thirtyHoursLater);

  const stored = await getReport(closedOrder.ticket);
  assert.equal(stored.status, ARCHIVED_CLOSURE_STATUS);
  assert.equal(stored.closureArchived, true);
  assert.equal(stored.history.length, closedOrder.history.length + 1);
  assert.deepEqual(stored.history.slice(0, closedOrder.history.length), closedOrder.history);
  assert.equal(stored.auditLog.at(-1).action, 'Solución confirmada y expediente archivado');
  assert.equal(stored.auditLog.at(-1).previousStatus, ATTENDED_STATUS);
  assert.equal(stored.auditLog.at(-1).newStatus, ARCHIVED_CLOSURE_STATUS);
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
