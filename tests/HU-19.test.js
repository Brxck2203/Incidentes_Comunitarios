import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignReportCrew,
  closeTechnicalOrder,
  createReport,
  recordMunicipalDecision,
} from '../src/services/reportRepository.js';
import { lookupPublicTicket } from '../src/services/publicTicketTracking.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto'], { type: 'image/png' });

test('HU-19: lookupPublicTicket devuelve estado actual y línea de tiempo completa (incluyendo Asignado y Atendido de HU-15/HU-18) sin sesión ni datos personales', async () => {
  mockIndexedDB([original], 2);

  const created = await createReport({
    reporterId: 'ciudadano-privado-123',
    audio: null,
    photos: [photo()],
    category: 'Aceras dañadas',
    position: { lat: 10.3238, lng: -84.4271, accuracy: 9 },
    capturedAt: '2026-11-18T08:00:00.000Z',
  });

  await recordMunicipalDecision(created.ticket, {
    action: 'evaluation',
    responsible: 'Inspector Municipal Uno',
  });
  await recordMunicipalDecision(created.ticket, {
    action: 'admit',
    responsible: 'Inspector Municipal Dos',
  });
  await assignReportCrew(created.ticket, {
    department: 'Mantenimiento de Infraestructura',
    crew: 'Cuadrilla de aceras',
    instructions: 'Reparar losa fracturada',
    deadline: '2027-01-20',
    responsible: 'Gestor de Despacho',
  });
  await closeTechnicalOrder(created.ticket, {
    worker: 'Encargado de Cuadrilla Secreto',
    note: 'Acera reparada y nivelada.',
    photos: [photo()],
  });

  const publicResult = await lookupPublicTicket(created.ticket);

  assert.ok(publicResult);
  assert.equal(publicResult.ticket, created.ticket);
  assert.equal(publicResult.currentStage, 'Atendido');
  assert.equal(publicResult.category, 'Aceras dañadas');
  assert.deepEqual(
    publicResult.timeline.map((item) => item.stage),
    ['Registrado / Recibido', 'En evaluación', 'Admitido', 'Asignado', 'Atendido'],
  );

  for (const step of publicResult.timeline) {
    assert.ok(step.at, `Falta fecha/hora en etapa ${step.stage}`);
  }

  const rawJson = JSON.stringify(publicResult);
  assert.doesNotMatch(rawJson, /ciudadano-privado-123/);
  assert.doesNotMatch(rawJson, /Inspector Municipal/);
  assert.doesNotMatch(rawJson, /Gestor de Despacho/);
  assert.doesNotMatch(rawJson, /Encargado de Cuadrilla Secreto/);
  assert.equal('reporterId' in publicResult, false);
  assert.equal('position' in publicResult, false);
  assert.equal('photos' in publicResult, false);
  assert.equal('technicalClosure' in publicResult, false);
});

test('HU-19: lookupPublicTicket devuelve null para un ticket inexistente y lanza error claro ante formato inválido', async () => {
  mockIndexedDB([original], 2);

  const missing = await lookupPublicTicket('RC-no-registrado-999');
  assert.equal(missing, null);

  await assert.rejects(() => lookupPublicTicket('   '), /Ingresa un número de ticket/i);
  await assert.rejects(() => lookupPublicTicket('ticket-invalido'), /formato del número de ticket no es válido/i);
});
