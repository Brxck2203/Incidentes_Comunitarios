import test from 'node:test';
import assert from 'node:assert/strict';
import { assignReportCrew, getReport, recordMunicipalDecision } from '../src/services/reportRepository.js';
import { ASSIGNED_STATUS, MUNICIPAL_CREW_CATALOG, reassignReportCrew } from '../src/services/crewReassignment.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const viasCrew = MUNICIPAL_CREW_CATALOG.find((item) => item.crewName === 'Cuadrilla de vías');

test('HU-16: reassignReportCrew se integra con HU-15 y HU-21, persistiendo la nueva cuadrilla y conservando la bitácora previa', async () => {
  mockIndexedDB([{ ...original, category: 'Baches' }], 2);

  await recordMunicipalDecision(original.ticket, {
    action: 'admit',
    responsible: 'Gestor de Recepción',
  });

  const initiallyAssigned = await assignReportCrew(original.ticket, {
    department: 'Red Vial',
    crew: 'Cuadrilla de bacheo',
    instructions: 'Bacheo con mezcla asfáltica',
    deadline: '2027-01-15',
    responsible: 'Gestor de Asignación',
  });

  const updated = await reassignReportCrew(original.ticket, {
    responsible: 'Coordinador Operativo',
    crewId: viasCrew.crewId,
    justification: 'La cuadrilla de bacheo atiende una emergencia en ruta principal; se traslada a Cuadrilla de vías.',
  });

  assert.equal(updated.status, ASSIGNED_STATUS);
  assert.equal(updated.assignment.crew, 'Cuadrilla de vías');
  assert.equal(updated.assignment.crewName, 'Cuadrilla de vías');
  assert.equal(updated.history.length, initiallyAssigned.history.length + 1);

  const fromDb = await getReport(original.ticket);
  assert.equal(fromDb.assignment.crew, 'Cuadrilla de vías');
  assert.equal(fromDb.history.length, initiallyAssigned.history.length + 1);
  assert.deepEqual(fromDb.history.slice(0, initiallyAssigned.history.length), initiallyAssigned.history);
  assert.match(fromDb.history.at(-1).action, /Cuadrilla de vías/);
  assert.match(fromDb.history.at(-1).action, /emergencia en ruta principal/);
  assert.ok(Array.isArray(fromDb.auditLog) && fromDb.auditLog.length >= 1);
});

test('HU-16: reassignReportCrew rechaza motivos vacíos, tickets inexistentes o estados que no sean Asignado sin alterar IndexedDB', async () => {
  const assignedRecord = {
    ...original,
    status: ASSIGNED_STATUS,
    assignment: {
      department: 'Red Vial',
      crew: 'Cuadrilla de bacheo',
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
        crewId: viasCrew.crewId,
        justification: '',
      }),
    /motivo de la reasignación es obligatorio/i,
  );

  await assert.rejects(
    () =>
      reassignReportCrew(notAssignedRecord.ticket, {
        responsible: 'Gestor',
        crewId: viasCrew.crewId,
        justification: 'Intento en estado En evaluación',
      }),
    /estado «Asignado»/i,
  );

  await assert.rejects(
    () =>
      reassignReportCrew('RC-inexistente', {
        responsible: 'Gestor',
        crewId: viasCrew.crewId,
        justification: 'Motivo válido',
      }),
    /no existe/i,
  );

  const unchanged = await getReport(assignedRecord.ticket);
  assert.equal(unchanged.assignment.crew, 'Cuadrilla de bacheo');
  assert.equal(unchanged.history.length, assignedRecord.history.length);
});
