import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCHIVED_CLOSURE_STATUS,
  ATTENDED_STATUS,
  DEFAULT_CLOSURE_CONFIRMATION_HOURS,
  applySolutionConfirmation,
  extractClosureCertificate,
} from './closureConfirmation.js';
import { isActiveReport } from './reportPriority.js';

function createAttendedReport(overrides = {}) {
  return {
    ticket: 'RC-950',
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-18T14:00:00.000Z',
    status: ATTENDED_STATUS,
    category: 'Baches',
    closure: {
      closedAt: '2026-11-18T14:00:00.000Z',
      department: 'Red Vial',
      crewName: 'Cuadrilla de Bacheo y Asfalto',
      technicalNote: 'Se aplicó carpeta asfáltica y compactación mecánica.',
      photos: [{ size: 2048, type: 'image/jpeg', id: 'final-photo-1' }],
    },
    history: [
      { at: '2026-11-15T08:00:00.000Z', action: 'Reporte registrado' },
      { at: '2026-11-18T14:00:00.000Z', action: 'Cierre técnico del incidente registrado' },
    ],
    ...overrides,
  };
}

test('extractClosureCertificate genera la constancia oficial con fecha de cierre, dependencia, nota técnica, foto final y plazo configurable', () => {
  const report = createAttendedReport();
  const cert = extractClosureCertificate(report, {
    now: '2026-11-19T14:00:00.000Z', // 24 horas después del cierre
  });

  assert.ok(cert);
  assert.equal(cert.ticket, 'RC-950');
  assert.equal(cert.closedAt, '2026-11-18T14:00:00.000Z');
  assert.equal(cert.department, 'Red Vial');
  assert.equal(cert.crewName, 'Cuadrilla de Bacheo y Asfalto');
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
