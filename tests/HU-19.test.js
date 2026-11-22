import test from 'node:test';
import assert from 'node:assert/strict';
import { createReport, recordMunicipalDecision, resolveIncident } from '../src/services/reportRepository.js';
import { lookupPublicTicket } from '../src/services/publicTicketTracking.js';
import { mockIndexedDB, original } from './helpers/mockIndexedDB.js';

const photo = () => new Blob(['foto'], { type: 'image/png' });

test('HU-19: lookupPublicTicket devuelve estado actual y línea de tiempo cronológica sin sesión y sin datos personales', async () => {
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
  await resolveIncident(created.ticket);

  const publicResult = await lookupPublicTicket(created.ticket);

  assert.ok(publicResult);
  assert.equal(publicResult.ticket, created.ticket);
  assert.equal(publicResult.currentStage, 'Atendido');
  assert.equal(publicResult.category, 'Aceras dañadas');
  assert.deepEqual(
    publicResult.timeline.map((item) => item.stage),
    ['Registrado / Recibido', 'En evaluación', 'Admitido', 'Atendido'],
  );

  for (const step of publicResult.timeline) {
    assert.ok(step.at, `Falta fecha/hora en etapa ${step.stage}`);
  }

  const rawJson = JSON.stringify(publicResult);
  assert.doesNotMatch(rawJson, /ciudadano-privado-123/);
  assert.doesNotMatch(rawJson, /Inspector Municipal/);
  assert.equal('reporterId' in publicResult, false);
  assert.equal('position' in publicResult, false);
  assert.equal('photos' in publicResult, false);
});

test('HU-19: lookupPublicTicket devuelve null para un ticket inexistente y lanza error claro ante formato inválido', async () => {
  mockIndexedDB([original], 2);

  const missing = await lookupPublicTicket('RC-no-registrado-999');
  assert.equal(missing, null);

  await assert.rejects(() => lookupPublicTicket('   '), /Ingresa un número de ticket/i);
  await assert.rejects(() => lookupPublicTicket('ticket-invalido'), /formato del número de ticket no es válido/i);
});
