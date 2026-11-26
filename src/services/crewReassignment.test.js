import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSIGNED_STATUS,
  MUNICIPAL_CREW_CATALOG,
  applyCrewReassignment,
  canReassignReport,
  getAvailableCrewsForReassignment,
  getCurrentAssignment,
} from './crewReassignment.js';

const bacheoCrew = MUNICIPAL_CREW_CATALOG.find((item) => item.crewName === 'Cuadrilla de bacheo');
const viasCrew = MUNICIPAL_CREW_CATALOG.find((item) => item.crewName === 'Cuadrilla de vías');
const acerasCrew = MUNICIPAL_CREW_CATALOG.find((item) => item.crewName === 'Cuadrilla de aceras');

function createAssignedReport(overrides = {}) {
  return {
    ticket: 'RC-500',
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-16T09:00:00.000Z',
    status: ASSIGNED_STATUS,
    category: 'Baches',
    description: 'Bache profundo frente al parque',
    position: { lat: 10.3238, lng: -84.4271 },
    assignment: {
      department: 'Red Vial',
      crew: 'Cuadrilla de bacheo',
      instructions: 'Colocar mezcla asfáltica en caliente',
      deadline: '2026-11-25',
      responsible: 'Gestor inicial',
      at: '2026-11-16T09:00:00.000Z',
    },
    auditLog: [
      {
        id: 'RC-500:1',
        at: '2026-11-15T08:00:00.000Z',
        action: 'Reporte registrado',
        actor: 'Ciudadano anónimo',
        role: 'ciudadano',
        previousStatus: '',
        newStatus: 'Registrado / Recibido',
      },
    ],
    history: [
      { at: '2026-11-15T08:00:00.000Z', action: 'Reporte registrado' },
      { at: '2026-11-15T14:00:00.000Z', action: 'Expediente admitido a trámite.' },
      {
        at: '2026-11-16T09:00:00.000Z',
        action: 'Asignado a Cuadrilla de bacheo (Red Vial), hasta 2026-11-25.',
        responsible: 'Gestor inicial',
      },
    ],
    ...overrides,
  };
}

test('canReassignReport permite reasignar solo expedientes activos y no secundarios en estado Asignado', () => {
  const assigned = createAssignedReport();
  assert.equal(canReassignReport(assigned), true);
  assert.equal(canReassignReport({ ...assigned, status: 'Admitido a trámite' }), false);
  assert.equal(canReassignReport({ ...assigned, status: 'Registrado / Recibido' }), false);
  assert.equal(canReassignReport({ ...assigned, status: 'Desestimado' }), false);
  assert.equal(canReassignReport({ ...assigned, status: 'Atendido' }), false);
  assert.equal(canReassignReport({ ...assigned, status: 'Resuelto' }), false);
  assert.equal(canReassignReport({ ...assigned, masterTicket: 'RC-100' }), false);
});

test('getAvailableCrewsForReassignment excluye la cuadrilla actual de HU-15 y prioriza las de la categoría del reporte', () => {
  const assigned = createAssignedReport();
  const options = getAvailableCrewsForReassignment(assigned);

  assert.ok(options.length >= 7);
  assert.ok(!options.some((item) => item.crewName === 'Cuadrilla de bacheo'));
  assert.equal(options[0].crewId, viasCrew.crewId);
  assert.equal(options[0].department, 'Red Vial');
});

test('applyCrewReassignment actualiza la cuadrilla responsable y registra el traslado en history y auditLog sin borrar historial previo', () => {
  const assigned = createAssignedReport();
  const initialHistoryLength = assigned.history.length;
  const initialAuditLength = assigned.auditLog.length;
  const reassignmentTime = '2026-11-22T10:00:00.000Z';

  const updated = applyCrewReassignment(
    assigned,
    {
      responsible: 'Ing. Laura Méndez',
      crewId: acerasCrew.crewId,
      justification: 'En la inspección preliminar se determinó que el daño corresponde a la acera y cordón de caño.',
    },
    reassignmentTime,
  );

  assert.equal(updated.status, ASSIGNED_STATUS);
  assert.equal(updated.updatedAt, reassignmentTime);
  assert.equal(updated.assignment.crewId, acerasCrew.crewId);
  assert.equal(updated.assignment.department, 'Mantenimiento de Infraestructura');
  assert.equal(updated.assignment.crew, 'Cuadrilla de aceras');
  assert.equal(updated.assignment.crewName, 'Cuadrilla de aceras');
  assert.equal(updated.assignment.previousDepartment, 'Red Vial');
  assert.equal(updated.assignment.previousCrewName, 'Cuadrilla de bacheo');
  assert.equal(updated.assignment.reassignmentCount, 1);
  assert.equal(updated.assignment.instructions, assigned.assignment.instructions);
  assert.equal(updated.assignment.deadline, assigned.assignment.deadline);

  assert.equal(updated.history.length, initialHistoryLength + 1);
  assert.deepEqual(updated.history.slice(0, initialHistoryLength), assigned.history);

  assert.equal(updated.auditLog.length, initialAuditLength + 1);
  assert.equal(updated.auditLog.at(-1).actor, 'Ing. Laura Méndez');
  assert.equal(updated.auditLog.at(-1).role, 'gestor');

  const lastEntry = updated.history.at(-1);
  assert.equal(lastEntry.at, reassignmentTime);
  assert.equal(lastEntry.responsible, 'Ing. Laura Méndez');
  assert.equal(lastEntry.previousDepartment, 'Red Vial');
  assert.equal(lastEntry.previousCrew, 'Cuadrilla de bacheo');
  assert.equal(lastEntry.newDepartment, 'Mantenimiento de Infraestructura');
  assert.equal(lastEntry.newCrew, 'Cuadrilla de aceras');
  assert.match(lastEntry.action, /Ing\. Laura Méndez/);
  assert.match(lastEntry.action, /acera y cordón de caño/);

  const currentInfo = getCurrentAssignment(updated);
  assert.equal(currentInfo.crewId, acerasCrew.crewId);
  assert.equal(currentInfo.department, 'Mantenimiento de Infraestructura');
});

test('applyCrewReassignment valida motivo obligatorio, cuadrilla distinta, estado Asignado y rechaza tickets secundarios', () => {
  const assigned = createAssignedReport();

  assert.throws(
    () =>
      applyCrewReassignment(assigned, {
        responsible: 'Gestor municipal',
        crewId: viasCrew.crewId,
        justification: '   ',
      }),
    /motivo de la reasignación es obligatorio/i,
  );

  assert.throws(
    () =>
      applyCrewReassignment(assigned, {
        responsible: 'Gestor municipal',
        crewId: bacheoCrew.crewId,
        justification: 'Intento a la misma cuadrilla',
      }),
    /distinta de la que ya tiene asignada/i,
  );

  assert.throws(
    () =>
      applyCrewReassignment(assigned, {
        responsible: 'Gestor municipal',
        crewId: 'cuadrilla-fantasma',
        justification: 'Motivo válido',
      }),
    /catálogo municipal/i,
  );

  assert.throws(
    () =>
      applyCrewReassignment(
        { ...assigned, status: 'Admitido a trámite' },
        {
          responsible: 'Gestor municipal',
          crewId: viasCrew.crewId,
          justification: 'Motivo válido',
        },
      ),
    /estado «Asignado»/i,
  );

  assert.throws(
    () =>
      applyCrewReassignment(
        { ...assigned, masterTicket: 'RC-001' },
        {
          responsible: 'Gestor municipal',
          crewId: viasCrew.crewId,
          justification: 'Motivo válido',
        },
      ),
    /expediente maestro/i,
  );
});
