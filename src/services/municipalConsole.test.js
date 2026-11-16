import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMunicipalReports, hasValidCoordinates, municipalStatusLabel } from './municipalConsole.js';

const reports = [
  { ticket: 'RC-1', category: 'Baches', status: 'Registrado / Recibido', description: 'Hueco en avenida', position: { lat: 10, lng: -84 } },
  { ticket: 'RC-2', category: 'Basura clandestina', status: 'Registrado / Recibido', description: 'Desechos junto al parque' },
  { ticket: 'RC-3', category: 'Baches', status: 'Desestimado', description: 'Hueco fuera de la zona' },
];

test('municipal console filters a single collection by category, effective status, and ticket or description', () => {
  const trackingByTicket = {
    'RC-2': { effectiveStatus: 'En evaluación' },
  };
  const visible = filterMunicipalReports(reports, {
    category: 'Basura clandestina',
    status: 'En evaluación',
    query: 'rc-2',
    trackingByTicket,
  });
  assert.deepEqual(visible, [reports[1]]);
  assert.deepEqual(filterMunicipalReports(reports, { query: 'fuera de la zona' }), [reports[2]]);
  assert.deepEqual(filterMunicipalReports(reports, { status: 'En evaluación', trackingByTicket }), [reports[1]]);
});

test('municipal console keeps reports without valid coordinates eligible for the list', () => {
  assert.equal(hasValidCoordinates(reports[0].position), true);
  assert.equal(hasValidCoordinates(undefined), false);
  assert.equal(hasValidCoordinates({ lat: 91, lng: -84 }), false);
  assert.equal(filterMunicipalReports(reports).length, reports.length);
});

test('municipal console does not present a secondary ticket status as current when its master is unavailable', () => {
  const secondary = { ...reports[0], masterTicket: 'RC-missing' };
  const tracking = {
    'RC-1': {
      isConsolidatedSecondary: true,
      masterUnavailable: true,
      effectiveStatus: null,
    },
  };
  assert.equal(municipalStatusLabel(secondary, tracking), 'Estado del maestro no disponible');
  assert.deepEqual(filterMunicipalReports([secondary], {
    status: 'Registrado / Recibido',
    trackingByTicket: tracking,
  }), []);
});
