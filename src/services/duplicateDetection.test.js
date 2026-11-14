import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RADIUS_METERS,
  calculateDistanceMeters,
  findDuplicateCandidates,
  buildDuplicateMap,
  getRadiusForCategory,
} from './duplicateDetection.js';

const BASE_POINT = { lat: 10.3238, lng: -84.4271 }; // Ciudad Quesada, San Carlos

// ~18 metros al norte
const NEAR_POINT_18M = { lat: 10.323962, lng: -84.4271 };

// ~49 metros al norte (dentro del radio por defecto de 50 m)
const LIMIT_INSIDE_49M = { lat: 10.32424, lng: -84.4271 };

// ~55 metros al norte (fuera del radio por defecto de 50 m)
const OUTSIDE_55M = { lat: 10.3243, lng: -84.4271 };

test('calculateDistanceMeters calcula distancia cero para el mismo punto y ~18 m para punto cercano', () => {
  assert.equal(Math.round(calculateDistanceMeters(BASE_POINT, BASE_POINT)), 0);
  const dist = calculateDistanceMeters(BASE_POINT, NEAR_POINT_18M);
  assert.ok(dist >= 17 && dist <= 19, `Distancia esperada ~18m, obtenida: ${dist}`);
});

test('findDuplicateCandidates detecta reporte coincidente en misma categoría y dentro de 50 m', () => {
  const original = {
    ticket: 'RC-001',
    createdAt: '2026-11-10T08:00:00.000Z',
    category: 'Baches',
    status: 'Registrado / Recibido',
    position: BASE_POINT,
  };
  const incoming = {
    ticket: 'RC-002',
    createdAt: '2026-11-10T09:30:00.000Z',
    category: 'Baches',
    status: 'Registrado / Recibido',
    position: NEAR_POINT_18M,
  };

  const incomingMatches = findDuplicateCandidates(incoming, [original, incoming]);
  assert.equal(incomingMatches.length, 1);
  assert.equal(incomingMatches[0].originalReport.ticket, 'RC-001');
  assert.equal(incomingMatches[0].distanceMeters, 18);
  assert.equal(incomingMatches[0].maxRadiusMeters, DEFAULT_RADIUS_METERS);

  // El reporte original más antiguo no debe marcarse como duplicado del reporte posterior
  const originalMatches = findDuplicateCandidates(original, [original, incoming]);
  assert.equal(originalMatches.length, 0);
});

test('findDuplicateCandidates respeta el umbral de 50 m por defecto y permite radio configurable por categoría', () => {
  const original = {
    ticket: 'RC-010',
    createdAt: '2026-11-10T08:00:00.000Z',
    category: 'Basura clandestina',
    status: 'Registrado / Recibido',
    position: BASE_POINT,
  };
  const inside49m = {
    ticket: 'RC-011',
    createdAt: '2026-11-10T09:00:00.000Z',
    category: 'Basura clandestina',
    status: 'Registrado / Recibido',
    position: LIMIT_INSIDE_49M,
  };
  const outside55m = {
    ticket: 'RC-012',
    createdAt: '2026-11-10T10:00:00.000Z',
    category: 'Basura clandestina',
    status: 'Registrado / Recibido',
    position: OUTSIDE_55M,
  };

  assert.equal(findDuplicateCandidates(inside49m, [original, inside49m]).length, 1);
  assert.equal(findDuplicateCandidates(outside55m, [original, outside55m]).length, 0);

  // Si se configura un radio mayor (ej. 75 m) para Basura clandestina, sí debe detectarlo
  const customMatches = findDuplicateCandidates(outside55m, [original, outside55m], {
    categoryRadii: { 'Basura clandestina': 75 },
  });
  assert.equal(customMatches.length, 1);
  assert.equal(getRadiusForCategory('Basura clandestina', { 'Basura clandestina': 75 }), 75);
});

test('findDuplicateCandidates no marca duplicado si la categoría es distinta o está sin clasificar', () => {
  const original = {
    ticket: 'RC-020',
    createdAt: '2026-11-10T08:00:00.000Z',
    category: 'Baches',
    status: 'Registrado / Recibido',
    position: BASE_POINT,
  };
  const differentCategory = {
    ticket: 'RC-021',
    createdAt: '2026-11-10T09:00:00.000Z',
    category: 'Aceras dañadas',
    status: 'Registrado / Recibido',
    position: NEAR_POINT_18M,
  };
  const unclassified = {
    ticket: 'RC-022',
    createdAt: '2026-11-10T09:30:00.000Z',
    category: '',
    status: 'Registrado / Recibido',
    position: NEAR_POINT_18M,
  };

  assert.equal(findDuplicateCandidates(differentCategory, [original, differentCategory]).length, 0);
  assert.equal(findDuplicateCandidates(unclassified, [original, unclassified]).length, 0);
});

test('findDuplicateCandidates valida ventana temporal de 30 días o estado sin resolver', () => {
  const oldResolved = {
    ticket: 'RC-030',
    createdAt: '2026-09-01T08:00:00.000Z', // > 30 días antes
    category: 'Ramas/arbolado',
    status: 'Resuelto',
    position: BASE_POINT,
  };
  const oldUnresolved = {
    ticket: 'RC-031',
    createdAt: '2026-09-01T08:00:00.000Z', // > 30 días antes pero aún sin resolver
    category: 'Ramas/arbolado',
    status: 'Registrado / Recibido',
    position: BASE_POINT,
  };
  const recentResolved = {
    ticket: 'RC-032',
    createdAt: '2026-11-01T08:00:00.000Z', // Dentro de 30 días
    category: 'Ramas/arbolado',
    status: 'Resuelto',
    position: BASE_POINT,
  };
  const incoming = {
    ticket: 'RC-033',
    createdAt: '2026-11-14T10:00:00.000Z',
    category: 'Ramas/arbolado',
    status: 'Registrado / Recibido',
    position: NEAR_POINT_18M,
  };

  // Resuelto hace más de 30 días -> NO debe alertar duplicado
  assert.equal(findDuplicateCandidates(incoming, [oldResolved, incoming]).length, 0);

  // Sin resolver aunque tenga más de 30 días -> SÍ debe alertar duplicado
  assert.equal(findDuplicateCandidates(incoming, [oldUnresolved, incoming]).length, 1);

  // Dentro de la ventana de 30 días -> SÍ debe alertar duplicado
  assert.equal(findDuplicateCandidates(incoming, [recentResolved, incoming]).length, 1);
});

test('buildDuplicateMap procesa la bandeja completa cumpliendo RNF-02 (< 1.5 s)', () => {
  const reports = [
    {
      ticket: 'RC-100',
      createdAt: '2026-11-12T10:00:00.000Z',
      category: 'Baches',
      status: 'Registrado / Recibido',
      position: BASE_POINT,
    },
    {
      ticket: 'RC-101',
      createdAt: '2026-11-12T11:00:00.000Z',
      category: 'Baches',
      status: 'Registrado / Recibido',
      position: NEAR_POINT_18M,
    },
  ];

  const start = performance.now();
  const map = buildDuplicateMap(reports);
  const elapsedMs = performance.now() - start;

  assert.ok(elapsedMs < 1500, `RNF-02 incumplido: tardó ${elapsedMs} ms`);
  assert.equal(map['RC-100'].isSuspectedDuplicate, false);
  assert.equal(map['RC-101'].isSuspectedDuplicate, true);
  assert.equal(map['RC-101'].primaryMatch.originalReport.ticket, 'RC-100');
  assert.equal(map['RC-101'].primaryMatch.distanceMeters, 18);
});
