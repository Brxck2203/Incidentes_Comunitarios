import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMunicipalDecision,
  canAdjudicateMunicipalReport,
  canStartMunicipalEvaluation,
  toPublicMunicipalDecision,
} from './municipalDecisions.js';

const report = {
  ticket: 'RC-1',
  status: 'Registrado / Recibido',
  severity: 'Grave',
  audio: { id: 'audio' },
  photos: [{ id: 'photo' }],
  history: [{ at: '2026-11-12T10:00:00.000Z', action: 'Reporte registrado' }],
};

test('municipal evaluation and admission are available only in the proposed states', () => {
  assert.equal(canStartMunicipalEvaluation(report), true);
  assert.equal(canAdjudicateMunicipalReport(report), true);
  assert.equal(canStartMunicipalEvaluation({ ...report, status: 'Admitido a trámite' }), false);
  assert.equal(canAdjudicateMunicipalReport({ ...report, status: 'Admitido a trámite' }), false);
  assert.equal(canAdjudicateMunicipalReport({ ...report, status: 'Resuelto' }), false);
  assert.equal(canAdjudicateMunicipalReport({ ...report, masterTicket: 'RC-master' }), false);
});

test('dismissal requires a catalog cause, non-empty justification, and responsible', () => {
  const base = { action: 'dismiss', responsible: 'Gestor local' };
  assert.throws(() => applyMunicipalDecision(report, { ...base, cause: 'Otra', justification: 'Motivo' }), /causal/i);
  assert.throws(() => applyMunicipalDecision(report, {
    ...base, cause: 'Información inverosímil', justification: '   ',
  }), /justificación/i);
  assert.throws(() => applyMunicipalDecision(report, {
    action: 'admit', responsible: ' '.repeat(2),
  }), /responsable/i);
});

test('municipal decision preserves unrelated properties and prepares a public response without exposing responsible', () => {
  const { report: dismissed } = applyMunicipalDecision(report, {
    action: 'dismiss',
    responsible: 'Gestor local',
    cause: 'Competencia de otra entidad',
    justification: 'El servicio corresponde a otra institución.',
  }, '2026-11-12T11:00:00.000Z');
  const publicDecision = toPublicMunicipalDecision(dismissed.municipalDecision);
  assert.equal(dismissed.status, 'Desestimado');
  assert.equal(dismissed.severity, report.severity);
  assert.equal(dismissed.audio, report.audio);
  assert.equal(dismissed.photos, report.photos);
  assert.equal(dismissed.history.length, report.history.length + 1);
  assert.match(publicDecision.publicResponse, /Competencia de otra entidad/);
  assert.equal('responsible' in publicDecision, false);
});

test('a repeated municipal decision is idempotent and terminal reports cannot transition back', () => {
  const input = { action: 'admit', responsible: 'Gestor local' };
  const first = applyMunicipalDecision(report, input, '2026-11-12T11:00:00.000Z');
  const repeated = applyMunicipalDecision(first.report, input, '2026-11-12T12:00:00.000Z');
  assert.equal(repeated.changed, false);
  assert.equal(repeated.report.history.length, first.report.history.length);
  assert.throws(() => applyMunicipalDecision({
    ...report, status: 'Resuelto',
  }, input), /recibidos o en evaluación/i);
});
