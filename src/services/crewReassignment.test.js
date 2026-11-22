import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSIGNED_STATUS,
  applyCrewReassignment,
  canReassignReport,
  getAvailableCrewsForReassignment,
  getCurrentAssignment,
} from './crewReassignment.js';

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
      crewId: 'rv-bacheo',
      crewName: 'Cuadrilla de Bacheo y Asfalto',
      department: 'Red Vial',
      instructions: 'Colocar mezcla asfáltica en caliente',
      deadline: '2026-11-25T17:00:00.000Z',
      assignedAt: '2026-11-16T09:00:00.000Z',
      assignedBy: 'Gestor inicial',
    },
    history: [
      { at: '2026-11-15T08:00:00.000Z', action: 'Reporte registrado' },
      { at: '2026-11-15T14:00:00.000Z', action: 'Expediente admitido a trámite.' },
      {
        at: '2026-11-16T09:00:00.000Z',
        action: 'Asignado a Red Vial — Cuadrilla de Bacheo y Asfalto',
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
  assert.equal(canReassignReport({ ...assigned, status: 'Resuelto' }), false);
  assert.equal(canReassignReport({ ...assigned, masterTicket: 'RC-100' }), false);
});

test('getAvailableCrewsForReassignment excluye la cuadrilla actual y prioriza las de la categoría del reporte', () => {
  const assigned = createAssignedReport();
  const options = getAvailableCrewsForReassignment(assigned);

  assert.ok(options.length >= 7);
  assert.ok(!options.some((item) => item.crewId === 'rv-bacheo'));
  // La primera opción sugerida pertenece a la misma categoría (Baches / Red Vial)
  assert.equal(options[0].crewId, 'rv-vialidad');
  assert.equal(options[0].department, 'Red Vial');
});

test('applyCrewReassignment actualiza la cuadrilla responsable y registra el traslado en bitácora sin borrar historial previo', () => {
  const assigned = createAssignedReport();
  const initialHistoryLength = assigned.history.length;
  const reassignmentTime = '2026-11-22T10:00:00.000Z';

  const updated = applyCrewReassignment(
    assigned,
    {
      responsible: 'Ing. Laura Méndez',
      crewId: 'mi-aceras',
      justification: 'En la inspección preliminar se determinó que el daño corresponde a la acera y cordón de caño.',
    },
    reassignmentTime,
  );

  assert.equal(updated.status, ASSIGNED_STATUS);
  assert.equal(updated.updatedAt, reassignmentTime);
  assert.equal(updated.assignment.crewId, 'mi-aceras');
  assert.equal(updated.assignment.department, 'Mantenimiento de Infraestructura');
  assert.equal(updated.assignment.crewName, 'Cuadrilla de Obras y Aceras');
  assert.equal(updated.assignment.previousDepartment, 'Red Vial');
  assert.equal(updated.assignment.previousCrewName, 'Cuadrilla de Bacheo y Asfalto');
  assert.equal(updated.assignment.reassignmentCount, 1);
  // Conserva instrucciones y fecha límite previas
  assert.equal(updated.assignment.instructions, assigned.assignment.instructions);
  assert.equal(updated.assignment.deadline, assigned.assignment.deadline);

  // El historial anterior permanece intacto y se agrega un nuevo registro al final
  assert.equal(updated.history.length, initialHistoryLength + 1);
  assert.deepEqual(updated.history.slice(0, initialHistoryLength), assigned.history);

  const lastEntry = updated.history.at(-1);
  assert.equal(lastEntry.at, reassignmentTime);
  assert.equal(lastEntry.responsible, 'Ing. Laura Méndez');
  assert.equal(lastEntry.previousDepartment, 'Red Vial');
  assert.equal(lastEntry.previousCrew, 'Cuadrilla de Bacheo y Asfalto');
  assert.equal(lastEntry.newDepartment, 'Mantenimiento de Infraestructura');
  assert.equal(lastEntry.newCrew, 'Cuadrilla de Obras y Aceras');
  assert.match(lastEntry.action, /Ing\. Laura Méndez/);
  assert.match(lastEntry.action, /acera y cordón de caño/);

  const currentInfo = getCurrentAssignment(updated);
  assert.equal(currentInfo.crewId, 'mi-aceras');
  assert.equal(currentInfo.department, 'Mantenimiento de Infraestructura');
});

test('applyCrewReassignment valida motivo obligatorio, cuadrilla distinta, estado Asignado y rechaza tickets secundarios', () => {
  const assigned = createAssignedReport();

  // Motivo vacío
  assert.throws(
    () =>
      applyCrewReassignment(assigned, {
        responsible: 'Gestor municipal',
        crewId: 'rv-vialidad',
        justification: '   ',
      }),
    /motivo de la reasignación es obligatorio/i,
  );

  // Misma cuadrilla actual
  assert.throws(
    () =>
      applyCrewReassignment(assigned, {
        responsible: 'Gestor municipal',
        crewId: 'rv-bacheo',
        justification: 'Intento a la misma cuadrilla',
      }),
    /distinta de la que ya tiene asignada/i,
  );

  // Cuadrilla inexistente
  assert.throws(
    () =>
      applyCrewReassignment(assigned, {
        responsible: 'Gestor municipal',
        crewId: 'cuadrilla-fantasma',
        justification: 'Motivo válido',
      }),
    /catálogo municipal/i,
  );

  // Estado distinto de Asignado
  assert.throws(
    () =>
      applyCrewReassignment(
        { ...assigned, status: 'Admitido a trámite' },
        {
          responsible: 'Gestor municipal',
          crewId: 'rv-vialidad',
          justification: 'Motivo válido',
        },
      ),
    /estado «Asignado»/i,
  );

  // Ticket secundario
  assert.throws(
    () =>
      applyCrewReassignment(
        { ...assigned, masterTicket: 'RC-001' },
        {
          responsible: 'Gestor municipal',
          crewId: 'rv-vialidad',
          justification: 'Motivo válido',
        },
      ),
    /expediente maestro/i,
  );
});
