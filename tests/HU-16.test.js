import test from 'node:test';
import assert from 'node:assert/strict';
import { getReport } from '../src/services/reportRepository.js';
import { ASSIGNED_STATUS, reassignReportCrew } from '../src/services/crewReassignment.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

test('HU-16: reassignReportCrew persiste en IndexedDB v2 la nueva cuadrilla y conserva íntegra la bitácora previa', async () => {
  const assignedRecord = {
    ...original,
    status: ASSIGNED_STATUS,
    category: 'Baches',
    assignment: {
      crewId: 'rv-bacheo',
      crewName: 'Cuadrilla de Bacheo y Asfalto',
      department: 'Red Vial',
      assignedAt: '2026-11-16T08:00:00.000Z',
    },
    history: [
      ...original.history,
      { at: '2026-11-16T08:00:00.000Z', action: 'Asignado a Red Vial — Cuadrilla de Bacheo y Asfalto' },
    ],
  };

  mockIndexedDB([assignedRecord], 2);

  const updated = await reassignReportCrew(assignedRecord.ticket, {
    responsible: 'Coordinador Operativo',
    crewId: 'rv-vialidad',
    justification: 'La cuadrilla de bacheo atiende una emergencia en ruta principal; se traslada a mantenimiento vial.',
  });

  assert.equal(updated.status, ASSIGNED_STATUS);
  assert.equal(updated.assignment.crewId, 'rv-vialidad');
  assert.equal(updated.assignment.crewName, 'Cuadrilla de Mantenimiento Vial');
  assert.equal(updated.history.length, assignedRecord.history.length + 1);

  const fromDb = await getReport(assignedRecord.ticket);
  assert.equal(fromDb.assignment.crewId, 'rv-vialidad');
  assert.equal(fromDb.history.length, assignedRecord.history.length + 1);
  assert.deepEqual(fromDb.history.slice(0, assignedRecord.history.length), assignedRecord.history);
  assert.match(fromDb.history.at(-1).action, /Cuadrilla de Mantenimiento Vial/);
  assert.match(fromDb.history.at(-1).action, /emergencia en ruta principal/);
});

test('HU-16: reassignReportCrew rechaza motivos vacíos, tickets inexistentes o estados que no sean Asignado sin alterar IndexedDB', async () => {
  const assignedRecord = {
    ...original,
    status: ASSIGNED_STATUS,
    assignment: {
      crewId: 'rv-bacheo',
      crewName: 'Cuadrilla de Bacheo y Asfalto',
      department: 'Red Vial',
    },
  };
  const notAssignedRecord = {
    ...original,
    ticket: 'RC-not-assigned',
    status: 'En evaluación',
  };

  mockIndexedDB([assignedRecord, notAssignedRecord], 2);

  await assert.rejects(
    () =>
      reassignReportCrew(assignedRecord.ticket, {
        responsible: 'Gestor',
        crewId: 'rv-vialidad',
        justification: '',
      }),
    /motivo de la reasignación es obligatorio/i,
  );

  await assert.rejects(
    () =>
      reassignReportCrew(notAssignedRecord.ticket, {
        responsible: 'Gestor',
        crewId: 'rv-vialidad',
        justification: 'Intento en estado En evaluación',
      }),
    /estado «Asignado»/i,
  );

  await assert.rejects(
    () =>
      reassignReportCrew('RC-inexistente', {
        responsible: 'Gestor',
        crewId: 'rv-vialidad',
        justification: 'Motivo válido',
      }),
    /no existe/i,
  );

  const unchanged = await getReport(assignedRecord.ticket);
  assert.equal(unchanged.assignment.crewId, 'rv-bacheo');
  assert.equal(unchanged.history.length, assignedRecord.history.length);
});
