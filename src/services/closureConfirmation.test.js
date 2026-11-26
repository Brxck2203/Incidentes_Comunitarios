import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCHIVED_CLOSURE_STATUS,
  ATTENDED_STATUS,
  DEFAULT_CLOSURE_CONFIRMATION_HOURS,
  applySolutionConfirmation,
  extractClosureCertificate,
} from './closureConfirmation.js';
import { validateCrewAssignment } from './crewAssignment.js';
import { isActiveReport } from './reportPriority.js';
import { validateTechnicalClosure } from './technicalClosure.js';

function createAttendedReport(overrides = {}) {
  const base = {
    ticket: 'RC-950',
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-16T08:00:00.000Z',
    status: 'Admitido a trámite',
    category: 'Baches',
    reporterId: 'ciudadano-demo-950',
    auditLog: [
      {
        id: 'RC-950:1',
        at: '2026-11-15T08:00:00.000Z',
        action: 'Reporte registrado',
        actor: 'ciudadano-demo-950',
        role: 'ciudadano',
        previousStatus: '',
        newStatus: 'Registrado / Recibido',
      },
    ],
    history: [
      { at: '2026-11-15T08:00:00.000Z', action: 'Reporte registrado' },
    ],
  };

  const assigned = validateCrewAssignment(
    base,
    {
      department: 'Red Vial',
      crew: 'Cuadrilla de bacheo',
      instructions: 'Aplicar carpeta asfáltica caliente.',
      deadline: '2026-11-25',
      responsible: 'Laura Gestora',
    },
    '2026-11-17T09:00:00.000Z',
  );

  const closed = validateTechnicalClosure(
    assigned,
    {
      worker: 'Carlos Jefe de Cuadrilla',
      note: 'Se aplicó carpeta asfáltica y compactación mecánica.',
      photos: [{ size: 2048, type: 'image/jpeg', id: 'final-photo-1' }],
    },
    '2026-11-18T14:00:00.000Z',
  );

  return {
    ...closed,
    ...overrides,
  };
}

test('extractClosureCertificate genera la constancia oficial desde el cierre técnico de HU-18 y la asignación de HU-15', () => {
  const report = createAttendedReport();
  const cert = extractClosureCertificate(report, {
    now: '2026-11-19T14:00:00.000Z', // 24 horas después del cierre
  });

  assert.ok(cert);
  assert.equal(report.status, ATTENDED_STATUS);
  assert.equal(cert.ticket, 'RC-950');
  assert.equal(cert.closedAt, '2026-11-18T14:00:00.000Z');
  assert.equal(cert.department, 'Red Vial');
  assert.equal(cert.crewName, 'Cuadrilla de bacheo');
  assert.equal(cert.worker, 'Carlos Jefe de Cuadrilla');
  assert.match(cert.technicalNote, /carpeta asfáltica/);
  assert.equal(cert.hasClosurePhoto, true);
  assert.equal(cert.photos.length, 1);
  assert.equal(cert.confirmationWindowHours, DEFAULT_CLOSURE_CONFIRMATION_HOURS);
  assert.equal(cert.remainingHours, 48);
  assert.equal(cert.canConfirmSolution, true);
  assert.equal(cert.windowExpired, false);
});

test('extractClosureCertificate maneja sin error cuando el registro técnico no incluye fotografía final y respeta plazos personalizados', () => {
  const legacyResolved = {
    ticket: 'RC-951',
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
    resolvedAt: '2026-11-18T10:00:00.000Z',
    status: 'Resuelto',
    category: 'Ramas/arbolado',
    history: [{ at: '2026-11-18T10:00:00.000Z', action: 'Reporte marcado como resuelto' }],
  };

  const cert = extractClosureCertificate(legacyResolved, {
    confirmationHours: 48,
    now: '2026-11-19T10:00:00.000Z',
  });

  assert.equal(cert.department, 'Parques y Ornato');
  assert.equal(cert.hasClosurePhoto, false);
  assert.equal(cert.photos.length, 0);
  assert.equal(cert.confirmationWindowHours, 48);
  assert.equal(cert.remainingHours, 24);
  assert.equal(cert.canConfirmSolution, true);
});

test('applySolutionConfirmation archiva definitivamente el expediente dentro del plazo configurado y conserva la bitácora previa', () => {
  const report = createAttendedReport();
  const confirmTime = '2026-11-20T10:00:00.000Z'; // 44 horas después (< 72 h)

  const archived = applySolutionConfirmation(report, { now: confirmTime });

  assert.equal(archived.status, ARCHIVED_CLOSURE_STATUS);
  assert.equal(archived.closureArchived, true);
  assert.equal(archived.solutionConfirmedAt, confirmTime);
  assert.equal(isActiveReport(archived), false);
  assert.equal(archived.history.length, report.history.length + 1);
  assert.deepEqual(archived.history.slice(0, report.history.length), report.history);
  assert.match(archived.history.at(-1).action, /Solución confirmada por el ciudadano/);
  assert.equal(archived.auditLog.length, report.auditLog.length + 1);
  assert.equal(archived.auditLog.at(-1).previousStatus, ATTENDED_STATUS);
  assert.equal(archived.auditLog.at(-1).newStatus, ARCHIVED_CLOSURE_STATUS);

  // La fecha original del cierre técnico se conserva intacta tras confirmar solución
  const archivedCert = extractClosureCertificate(archived, { now: confirmTime });
  assert.equal(archivedCert.closedAt, '2026-11-18T14:00:00.000Z');
  assert.equal(archivedCert.isConfirmedByCitizen, true);
  assert.equal(archivedCert.canConfirmSolution, false);
});

test('applySolutionConfirmation rechaza confirmar si el plazo configurado venció, si ya estaba archivado o si el reporte sigue abierto', () => {
  const report = createAttendedReport();

  // Plazo vencido: 75 horas después del cierre (> 72 h)
  assert.throws(
    () =>
      applySolutionConfirmation(report, {
        now: '2026-11-21T17:00:00.000Z',
      }),
    /plazo de 72 horas para confirmar la solución ya expiró/i,
  );

  // Ya confirmado previamente
  const alreadyArchived = applySolutionConfirmation(report, {
    now: '2026-11-19T10:00:00.000Z',
  });
  assert.throws(
    () =>
      applySolutionConfirmation(alreadyArchived, {
        now: '2026-11-19T12:00:00.000Z',
      }),
    /ya fue confirmada y archivada anteriormente/i,
  );

  // Reporte aún abierto
  assert.throws(
    () =>
      applySolutionConfirmation({
        ...report,
        status: 'En atención',
      }),
    /marcados como «Atendido» o resueltos/i,
  );
});
