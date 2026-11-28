import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateActionAccess,
  evaluateRouteAccess,
  resolveAllowedRedirectRoute,
} from './accessControl.js';

function createSession(role, overrides = {}) {
  return {
    userId: `USR-${role}`,
    email: `${role}@municipalidad.local`,
    role,
    roleLabel: role,
    active: true,
    issuedAt: '2026-11-27T10:00:00.000Z',
    lastActivityAt: '2026-11-27T10:00:00.000Z',
    expiresAt: '2026-11-27T10:30:00.000Z',
    ...overrides,
  };
}

test('deniega el acceso a la consola de admisión y auditoría a Ciudadano y Cuadrilla y redirige a su vista permitida', () => {
  const now = '2026-11-27T10:10:00.000Z';
  const citizen = createSession('ciudadano');
  const crew = createSession('cuadrilla');

  // Ciudadano intentando ingresar a consola de admisión o auditoría
  const citizenRecepcion = evaluateRouteAccess('/recepcion', citizen, { now });
  assert.equal(citizenRecepcion.allowed, false);
  assert.equal(citizenRecepcion.redirectTo, '/reportes');

  const citizenAudit = evaluateRouteAccess('/recepcion/RC-10', citizen, {
    search: '?seccion=auditoria',
    now,
  });
  assert.equal(citizenAudit.allowed, false);
  assert.equal(citizenAudit.redirectTo, '/reportes');

  // Encargado de cuadrilla intentando ingresar a consola de admisión o auditoría
  const crewRecepcion = evaluateRouteAccess('/recepcion', crew, { now });
  assert.equal(crewRecepcion.allowed, false);
  assert.equal(crewRecepcion.redirectTo, '/acceso');

  const crewAudit = evaluateRouteAccess('/auditoria', crew, { now });
  assert.equal(crewAudit.allowed, false);
  assert.equal(crewAudit.redirectTo, '/acceso');

  const crewInlineAudit = evaluateRouteAccess('/recepcion/RC-10', crew, {
    search: '?vista=auditoria',
    now,
  });
  assert.equal(crewInlineAudit.allowed, false);
  assert.equal(crewInlineAudit.redirectTo, '/acceso');

  // Cuadrilla puede ver /recepcion/:ticket para cierre técnico, pero sin permiso de admisión ni auditoría
  assert.equal(evaluateRouteAccess('/recepcion/RC-10', crew, { now }).allowed, true);
  assert.equal(evaluateActionAccess('technical-closure', crew, { now }), true);
  assert.equal(evaluateActionAccess('municipal-admission', crew, { now }), false);
  assert.equal(evaluateActionAccess('audit-log', crew, { now }), false);
});

test('aplica negación por defecto ante sesión nula, sesión caducada, cuenta inactiva o rol desconocido', () => {
  const now = '2026-11-27T10:10:00.000Z';

  // Sin sesión
  const anonymousTry = evaluateRouteAccess('/recepcion', null, { now });
  assert.equal(anonymousTry.allowed, false);
  assert.equal(anonymousTry.redirectTo, '/reportes');

  // Sesión expirada
  const expiredSession = createSession('administrador', {
    expiresAt: '2026-11-27T10:05:00.000Z',
  });
  const expiredTry = evaluateRouteAccess('/recepcion', expiredSession, { now });
  assert.equal(expiredTry.allowed, false);
  assert.equal(expiredTry.redirectTo, '/acceso');
  assert.equal(evaluateActionAccess('audit-log', expiredSession, { now }), false);

  // Rol desconocido
  const unknownRole = createSession('superusuario-inventado');
  const unknownTry = evaluateRouteAccess('/recepcion', unknownRole, { now });
  assert.equal(unknownTry.allowed, false);
  assert.equal(unknownTry.redirectTo, '/reportes');
  assert.equal(resolveAllowedRedirectRoute(unknownRole), '/reportes');

  // Cuenta desactivada
  const inactiveAdmin = createSession('administrador', { active: false });
  assert.equal(evaluateRouteAccess('/recepcion', inactiveAdmin, { now }).allowed, false);
  assert.equal(evaluateActionAccess('audit-log', inactiveAdmin, { now }), false);
});

test('autoriza a Gestor Municipal en recepción/admisión y reserva auditoría y administración de usuarios a Administrador', () => {
  const now = '2026-11-27T10:10:00.000Z';
  const gestor = createSession('gestor');
  const admin = createSession('administrador');

  assert.equal(evaluateRouteAccess('/recepcion', gestor, { now }).allowed, true);
  assert.equal(evaluateActionAccess('municipal-admission', gestor, { now }), true);
  assert.equal(evaluateActionAccess('audit-log', gestor, { now }), false);
  assert.equal(evaluateRouteAccess('/usuarios', gestor, { now }).allowed, false);

  assert.equal(evaluateRouteAccess('/recepcion', admin, { now }).allowed, true);
  assert.equal(evaluateActionAccess('audit-log', admin, { now }), true);
  assert.equal(evaluateRouteAccess('/auditoria', admin, { now }).allowed, true);
  assert.equal(evaluateRouteAccess('/usuarios', admin, { now }).allowed, true);
});
