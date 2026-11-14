import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveReportTracking,
  resolveReportsListTracking,
} from './consolidatedTracking.js';

function createBaseReport(ticket, overrides = {}) {
  return {
    ticket,
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-10T08:00:00.000Z',
    status: 'Registrado / Recibido',
    category: 'Baches',
    description: `Reporte de ${ticket}`,
    history: [{ at: '2026-11-10T08:00:00.000Z', action: 'Reporte registrado' }],
    ...overrides,
  };
}

test('resolveReportTracking mantiene sin cambios un reporte no consolidado', () => {
  const solo = createBaseReport('RC-100');
  const tracking = resolveReportTracking(solo, { 'RC-100': solo });

  assert.equal(tracking.isConsolidatedSecondary, false);
  assert.equal(tracking.masterTicket, null);
  assert.equal(tracking.effectiveStatus, 'Registrado / Recibido');
  assert.equal(tracking.masterProgressHistory.length, 0);
});

test('resolveReportTracking muestra que el ticket secundario fue integrado a una atención conjunta y deriva el avance del maestro', () => {
  const master = createBaseReport('RC-200', {
    isMaster: true,
    secondaryTickets: ['RC-201', 'RC-202'],
    status: 'En atención por cuadrilla',
    updatedAt: '2026-11-14T09:00:00.000Z',
    history: [
      { at: '2026-11-10T08:00:00.000Z', action: 'Reporte registrado' },
      {
        at: '2026-11-12T10:00:00.000Z',
        action: 'Consolidación en caso maestro (RC-201, RC-202) registrada por Gestor. Motivo: Mismo bache',
      },
      { at: '2026-11-14T09:00:00.000Z', action: 'Cuadrilla municipal asignada al punto' },
    ],
  });

  const secondary = createBaseReport('RC-201', {
    masterTicket: 'RC-200',
    status: 'Registrado / Recibido', // Estado local antiguo
    updatedAt: '2026-11-12T10:00:00.000Z',
  });

  const tracking = resolveReportTracking(secondary, {
    'RC-200': master,
    'RC-201': secondary,
  });

  assert.equal(tracking.ticket, 'RC-201');
  assert.equal(tracking.isConsolidatedSecondary, true);
  assert.equal(tracking.masterTicket, 'RC-200');
  assert.equal(tracking.masterAvailable, true);
  assert.equal(tracking.effectiveStatus, 'En atención por cuadrilla');
  assert.equal(tracking.effectiveUpdatedAt, '2026-11-14T09:00:00.000Z');
  assert.equal(tracking.masterProgressHistory.length, 3);

  // Verifica que la entrada de consolidación esté saneada y no filtre los tickets de terceros informantes
  assert.doesNotMatch(tracking.masterProgressHistory[1].action, /RC-202/);
  assert.match(tracking.masterProgressHistory[2].action, /Cuadrilla municipal asignada/);
});

test('resolveReportsListTracking actualiza automáticamente el estado visible en todos los tickets unificados cuando el caso maestro cambia o se resuelve', () => {
  const master = createBaseReport('RC-300', {
    isMaster: true,
    secondaryTickets: ['RC-301', 'RC-302'],
    status: 'En inspección',
    updatedAt: '2026-11-13T10:00:00.000Z',
  });
  const sec1 = createBaseReport('RC-301', { masterTicket: 'RC-300' });
  const sec2 = createBaseReport('RC-302', { masterTicket: 'RC-300' });

  // Estado inicial en inspección
  const firstTracking = resolveReportsListTracking([master, sec1, sec2]);
  assert.equal(firstTracking['RC-301'].effectiveStatus, 'En inspección');
  assert.equal(firstTracking['RC-302'].effectiveStatus, 'En inspección');

  // El caso maestro se actualiza a Resuelto
  const resolvedMaster = {
    ...master,
    status: 'Resuelto',
    updatedAt: '2026-11-14T15:00:00.000Z',
    history: [
      ...master.history,
      { at: '2026-11-14T15:00:00.000Z', action: 'Incidente reparado y cerrado' },
    ],
  };

  const secondTracking = resolveReportsListTracking([resolvedMaster, sec1, sec2]);
  assert.equal(secondTracking['RC-301'].effectiveStatus, 'Resuelto');
  assert.equal(secondTracking['RC-302'].effectiveStatus, 'Resuelto');
  assert.equal(secondTracking['RC-301'].effectiveUpdatedAt, '2026-11-14T15:00:00.000Z');
  assert.equal(secondTracking['RC-302'].effectiveUpdatedAt, '2026-11-14T15:00:00.000Z');
});

test('resolveReportTracking maneja de forma segura cuando el caso maestro referenciado no está disponible', () => {
  const orphanSecondary = createBaseReport('RC-401', {
    masterTicket: 'RC-999',
    status: 'Registrado / Recibido',
  });

  const tracking = resolveReportTracking(orphanSecondary, { 'RC-401': orphanSecondary });
  assert.equal(tracking.isConsolidatedSecondary, true);
  assert.equal(tracking.masterTicket, 'RC-999');
  assert.equal(tracking.masterUnavailable, true);
  assert.equal(tracking.effectiveStatus, 'Registrado / Recibido');
});
