import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateConsolidationInput,
  applyConsolidationToRecords,
} from './consolidationService.js';

function createSampleReport(ticket, overrides = {}) {
  return {
    ticket,
    createdAt: '2026-11-10T08:00:00.000Z',
    capturedAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-10T08:00:00.000Z',
    status: 'Registrado / Recibido',
    category: 'Baches',
    description: `Descripción de ${ticket}`,
    transcription: '',
    references: '',
    position: { lat: 10.3238, lng: -84.4271 },
    audio: { size: 1024, type: 'audio/webm', id: `audio-${ticket}` },
    photos: [{ size: 2048, type: 'image/jpeg', id: `photo-${ticket}` }],
    receptionEvent: 'Nuevo reporte',
    history: [{ at: '2026-11-10T08:00:00.000Z', action: 'Reporte registrado' }],
    ...overrides,
  };
}

test('validateConsolidationInput exige al menos dos reportes, un maestro válido y motivo obligatorio', () => {
  assert.throws(
    () => validateConsolidationInput({ tickets: ['RC-001'], masterTicket: 'RC-001', reason: 'Mismo daño' }),
    /al menos dos reportes/i,
  );

  assert.throws(
    () => validateConsolidationInput({ tickets: ['RC-001', 'RC-002'], masterTicket: 'RC-999', reason: 'Mismo daño' }),
    /reporte principal/i,
  );

  assert.throws(
    () => validateConsolidationInput({ tickets: ['RC-001', 'RC-002'], masterTicket: 'RC-001', reason: '   ' }),
    /motivo obligatorio/i,
  );
});

test('applyConsolidationToRecords consolida múltiples reportes en un caso maestro conservando tickets, fusionando evidencias y registrando bitácora', () => {
  const r1 = createSampleReport('RC-001', { createdAt: '2026-11-10T08:00:00.000Z' });
  const r2 = createSampleReport('RC-002', { createdAt: '2026-11-10T09:00:00.000Z' });
  const r3 = createSampleReport('RC-003', { createdAt: '2026-11-10T10:00:00.000Z' });

  const reportsByTicket = {
    'RC-001': r1,
    'RC-002': r2,
    'RC-003': r3,
  };

  const consolidationTime = '2026-11-14T11:00:00.000Z';
  const result = applyConsolidationToRecords({
    reportsByTicket,
    tickets: ['RC-001', 'RC-002', 'RC-003'],
    masterTicket: 'RC-001',
    reason: 'Solicitudes vecinales sobre el mismo bache frente a la escuela.',
    official: 'Ing. Carlos Ramírez',
    at: consolidationTime,
  });

  const { masterReport, secondaryReports } = result;

  // 1. Maestro conserva su ticket y enlaza secundarios
  assert.equal(masterReport.ticket, 'RC-001');
  assert.equal(masterReport.isMaster, true);
  assert.deepEqual(masterReport.secondaryTickets, ['RC-002', 'RC-003']);

  // 2. Evidencias (fotos y audios) de los vecinos están fusionadas bajo el maestro con trazabilidad del ticket original
  assert.equal(masterReport.mergedEvidence.length, 2);
  assert.equal(masterReport.mergedEvidence[0].sourceTicket, 'RC-002');
  assert.equal(masterReport.mergedEvidence[0].audio.id, 'audio-RC-002');
  assert.equal(masterReport.mergedEvidence[0].photos[0].id, 'photo-RC-002');
  assert.equal(masterReport.mergedEvidence[1].sourceTicket, 'RC-003');

  // 3. Bitácora del maestro registra funcionario, fecha/hora y motivo obligatorio
  const lastMasterLog = masterReport.history.at(-1);
  assert.equal(lastMasterLog.at, consolidationTime);
  assert.equal(lastMasterLog.official, 'Ing. Carlos Ramírez');
  assert.match(lastMasterLog.action, /Ing\. Carlos Ramírez/);
  assert.match(lastMasterLog.action, /Solicitudes vecinales sobre el mismo bache/);

  // 4. Reportes secundarios conservan sus propios tickets individuales y quedan enlazados al maestro
  assert.equal(secondaryReports.length, 2);
  for (const sec of secondaryReports) {
    assert.ok(['RC-002', 'RC-003'].includes(sec.ticket));
    assert.equal(sec.masterTicket, 'RC-001');
    const lastSecLog = sec.history.at(-1);
    assert.equal(lastSecLog.at, consolidationTime);
    assert.equal(lastSecLog.official, 'Ing. Carlos Ramírez');
    assert.equal(lastSecLog.reason, 'Solicitudes vecinales sobre el mismo bache frente a la escuela.');
  }
});

test('applyConsolidationToRecords rechaza consolidar si un reporte ya es secundario de otro caso o si no existe', () => {
  const r1 = createSampleReport('RC-001');
  const alreadySecondary = createSampleReport('RC-002', { masterTicket: 'RC-099' });

  // Intentar usar como secundario un reporte que ya pertenece a RC-099
  assert.throws(
    () =>
      applyConsolidationToRecords({
        reportsByTicket: { 'RC-001': r1, 'RC-002': alreadySecondary },
        tickets: ['RC-001', 'RC-002'],
        masterTicket: 'RC-001',
        reason: 'Intento duplicado',
        official: 'Gestor municipal',
      }),
    /ya fue consolidado previamente bajo el expediente maestro RC-099/i,
  );

  // Intentar elegir como maestro un reporte que ya es secundario
  assert.throws(
    () =>
      applyConsolidationToRecords({
        reportsByTicket: { 'RC-001': r1, 'RC-002': alreadySecondary },
        tickets: ['RC-001', 'RC-002'],
        masterTicket: 'RC-002',
        reason: 'Maestro inválido',
        official: 'Gestor municipal',
      }),
    /ya es secundario del expediente maestro RC-099/i,
  );

  // Ticket inexistente
  assert.throws(
    () =>
      applyConsolidationToRecords({
        reportsByTicket: { 'RC-001': r1 },
        tickets: ['RC-001', 'RC-404'],
        masterTicket: 'RC-001',
        reason: 'No existe',
        official: 'Gestor municipal',
      }),
    /No se encontró el reporte seleccionado \(RC-404\)/i,
  );
});

test('applyConsolidationToRecords permite agregar un nuevo secundario a un caso maestro existente sin duplicar vínculos previos', () => {
  const r1 = createSampleReport('RC-001');
  const r2 = createSampleReport('RC-002');
  const r3 = createSampleReport('RC-003');

  const firstPass = applyConsolidationToRecords({
    reportsByTicket: { 'RC-001': r1, 'RC-002': r2 },
    tickets: ['RC-001', 'RC-002'],
    masterTicket: 'RC-001',
    reason: 'Primera consolidación',
    official: 'Gestor municipal',
  });

  const secondPass = applyConsolidationToRecords({
    reportsByTicket: {
      'RC-001': firstPass.masterReport,
      'RC-002': firstPass.secondaryReports[0],
      'RC-003': r3,
    },
    tickets: ['RC-001', 'RC-003'],
    masterTicket: 'RC-001',
    reason: 'Nuevo reporte vecinal del mismo daño',
    official: 'Gestor municipal',
  });

  assert.deepEqual(secondPass.masterReport.secondaryTickets, ['RC-002', 'RC-003']);
  assert.equal(secondPass.masterReport.mergedEvidence.length, 2);
});
