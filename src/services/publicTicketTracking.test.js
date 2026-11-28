import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublicTicketView,
  normalizePublicStageName,
  validatePublicTicketCode,
} from './publicTicketTracking.js';

test('validatePublicTicketCode acepta códigos RC- válidos y rechaza entradas vacías o malformadas', () => {
  assert.equal(validatePublicTicketCode('  RC-12345  '), 'RC-12345');
  assert.throws(() => validatePublicTicketCode(''), /Ingresa un número de ticket/i);
  assert.throws(() => validatePublicTicketCode('ABC-999'), /formato del número de ticket no es válido/i);
});

test('normalizePublicStageName mapea los estados internos a las etapas oficiales de RF-12', () => {
  assert.equal(normalizePublicStageName('Registrado / Recibido'), 'Registrado / Recibido');
  assert.equal(normalizePublicStageName('En evaluación'), 'En evaluación');
  assert.equal(normalizePublicStageName('Admitido a trámite'), 'Admitido');
  assert.equal(normalizePublicStageName('Asignado'), 'Asignado');
  assert.equal(normalizePublicStageName('En atención'), 'En atención');
  assert.equal(normalizePublicStageName('Resuelto'), 'Atendido');
  assert.equal(normalizePublicStageName('Atendido'), 'Atendido');
  assert.equal(normalizePublicStageName('Desestimado'), 'Desestimado');
});

test('buildPublicTicketView construye la línea de tiempo con etapas reales ocurridas y omite todo dato personal (RNF-05)', () => {
  const report = {
    ticket: 'RC-700',
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-12T15:30:00.000Z',
    status: 'Admitido a trámite',
    category: 'Baches',
    reporterId: 'private-citizen-uuid-999',
    position: { lat: 10.3238, lng: -84.4271, accuracy: 8 },
    originalPosition: { lat: 10.3238, lng: -84.4271, accuracy: 8 },
    audio: { size: 2048, type: 'audio/webm' },
    photos: [{ size: 4096, type: 'image/jpeg' }],
    confirmations: [{ reporterId: 'neighbor-uuid-111', at: '2026-11-11T09:00:00.000Z' }],
    history: [
      { at: '2026-11-10T08:00:00.000Z', action: 'Reporte registrado' },
      { at: '2026-11-10T10:00:00.000Z', action: 'Información complementada' },
      {
        at: '2026-11-11T11:00:00.000Z',
        action: 'Expediente puesto en evaluación.',
        responsible: 'Funcionario Secreto 1',
      },
      {
        at: '2026-11-12T15:30:00.000Z',
        action: 'Expediente admitido a trámite.',
        responsible: 'Funcionario Secreto 2',
      },
    ],
  };

  const view = buildPublicTicketView(report, { 'RC-700': report });

  assert.equal(view.ticket, 'RC-700');
  assert.equal(view.currentStage, 'Admitido');
  assert.equal(view.category, 'Baches');
  assert.equal(view.timeline.length, 3);
  assert.deepEqual(
    view.timeline.map((step) => step.stage),
    ['Registrado / Recibido', 'En evaluación', 'Admitido'],
  );
  assert.equal(view.timeline[0].at, '2026-11-10T08:00:00.000Z');
  assert.equal(view.timeline[1].at, '2026-11-11T11:00:00.000Z');
  assert.equal(view.timeline[2].at, '2026-11-12T15:30:00.000Z');

  // RNF-05: ninguna propiedad privada o nombre de funcionario debe estar expuesta
  const serialized = JSON.stringify(view);
  assert.doesNotMatch(serialized, /private-citizen-uuid-999/);
  assert.doesNotMatch(serialized, /neighbor-uuid-111/);
  assert.doesNotMatch(serialized, /Funcionario Secreto/);
  assert.equal('reporterId' in view, false);
  assert.equal('position' in view, false);
  assert.equal('originalPosition' in view, false);
  assert.equal('audio' in view, false);
  assert.equal('photos' in view, false);
  assert.equal('confirmations' in view, false);
});

test('buildPublicTicketView deriva el estado y línea de tiempo del caso maestro cuando se consulta un ticket secundario consolidado', () => {
  const master = {
    ticket: 'RC-800',
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-15T16:00:00.000Z',
    status: 'Resuelto',
    category: 'Basura clandestina',
    isMaster: true,
    secondaryTickets: ['RC-801', 'RC-802'],
    history: [
      { at: '2026-11-10T08:00:00.000Z', action: 'Reporte registrado' },
      {
        at: '2026-11-12T09:00:00.000Z',
        action: 'Consolidación en caso maestro (RC-801, RC-802) registrada por Gestor. Motivo: Mismo punto',
      },
      { at: '2026-11-15T16:00:00.000Z', action: 'Reporte marcado como resuelto' },
    ],
  };

  const secondary = {
    ticket: 'RC-801',
    createdAt: '2026-11-11T09:30:00.000Z',
    updatedAt: '2026-11-12T09:00:00.000Z',
    status: 'Registrado / Recibido',
    category: 'Basura clandestina',
    masterTicket: 'RC-800',
    reporterId: 'vecino-801',
    history: [
      { at: '2026-11-11T09:30:00.000Z', action: 'Reporte registrado' },
      {
        at: '2026-11-12T09:00:00.000Z',
        action: 'Consolidado como reporte secundario en el caso maestro RC-800 por Gestor. Motivo: Mismo punto',
      },
    ],
  };

  const view = buildPublicTicketView(secondary, {
    'RC-800': master,
    'RC-801': secondary,
  });

  assert.equal(view.ticket, 'RC-801');
  assert.equal(view.isJointAttention, true);
  assert.equal(view.masterTicket, 'RC-800');
  assert.equal(view.currentStage, 'Atendido');
  assert.ok(view.timeline.some((step) => step.stage === 'Atendido'));
  // No debe filtrar el código del otro vecino secundario (RC-802)
  assert.doesNotMatch(JSON.stringify(view), /RC-802/);
});
