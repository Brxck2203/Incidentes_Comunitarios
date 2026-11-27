import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAuthorizedModulesForRole,
  getCrewsForDepartment,
  hasModulePermission,
  municipalDepartments,
} from './rolePermissions.js';
import {
  applyStaffStatusChange,
  validateStaffRegistration,
} from './userAdministration.js';

test('el arranque inicial exige crear primero una cuenta con el rol Administrador sin almacenar contraseñas', () => {
  assert.throws(
    () =>
      validateStaffRegistration(
        {
          fullName: 'Gestor Inicial',
          email: 'gestor.inicial@municipalidad.local',
          role: 'gestor',
          department: 'Red Vial',
        },
        [],
      ),
    /arranque inicial.*Administrador/i,
  );

  const firstAdmin = validateStaffRegistration(
    {
      fullName: 'Administración General',
      email: 'Admin.General@Municipalidad.Local',
      role: 'administrador',
      password: 'no-debe-guardarse-nunca',
    },
    [],
    { id: 'USR-1', at: '2026-11-26T12:00:00.000Z' },
  );

  assert.equal(firstAdmin.id, 'USR-1');
  assert.equal(firstAdmin.email, 'admin.general@municipalidad.local');
  assert.equal(firstAdmin.role, 'administrador');
  assert.equal(firstAdmin.department, '');
  assert.equal(firstAdmin.credential, null);
  assert.equal('password' in firstAdmin, false);
  assert.equal(hasModulePermission(firstAdmin, 'administracion-usuarios'), true);
  assert.equal(hasModulePermission(firstAdmin, 'bandeja-cuadrilla'), false);
});

test('cada rol interno recibe exclusivamente los módulos autorizados de su perfil y valida dependencia y cuadrilla', () => {
  const baseAdmin = validateStaffRegistration(
    {
      fullName: 'Administración General',
      email: 'admin@municipalidad.local',
      role: 'administrador',
    },
    [],
    { id: 'USR-ADMIN' },
  );

  assert.deepEqual(municipalDepartments, [
    'Red Vial',
    'Gestión Ambiental',
    'Parques y Ornato',
    'Mantenimiento de Infraestructura',
  ]);
  assert.deepEqual(getCrewsForDepartment('Red Vial'), [
    'Cuadrilla de bacheo',
    'Cuadrilla de vías',
  ]);

  const gestor = validateStaffRegistration(
    {
      fullName: 'Gestor Vial',
      email: 'gestor.vial@municipalidad.local',
      role: 'gestor',
      department: 'Red Vial',
    },
    [baseAdmin],
    { id: 'USR-GESTOR' },
  );

  assert.deepEqual(gestor.authorizedModules, [
    'consola-recepcion',
    'dictamen-y-consolidacion',
    'asignacion-cuadrillas',
    'estadisticas',
  ]);
  assert.equal(hasModulePermission(gestor, 'consola-recepcion'), true);
  assert.equal(hasModulePermission(gestor, 'administracion-usuarios'), false);
  assert.equal(hasModulePermission(gestor, 'bandeja-cuadrilla'), false);

  const encargadoCuadrilla = validateStaffRegistration(
    {
      fullName: 'Encargado de Bacheo',
      email: 'cuadrilla.bacheo@municipalidad.local',
      role: 'cuadrilla',
      department: 'Red Vial',
      crew: 'Cuadrilla de bacheo',
    },
    [baseAdmin, gestor],
    { id: 'USR-CUADRILLA' },
  );

  assert.deepEqual(encargadoCuadrilla.authorizedModules, [
    'bandeja-cuadrilla',
    'cierre-tecnico',
  ]);
  assert.equal(encargadoCuadrilla.crew, 'Cuadrilla de bacheo');
  assert.equal(hasModulePermission(encargadoCuadrilla, 'bandeja-cuadrilla'), true);
  assert.equal(hasModulePermission(encargadoCuadrilla, 'consola-recepcion'), false);
  assert.equal(hasModulePermission(encargadoCuadrilla, 'administracion-usuarios'), false);

  const citizenModules = getAuthorizedModulesForRole('ciudadano').map((m) => m.key);
  assert.deepEqual(citizenModules, ['reporte-ciudadano', 'mis-reportes']);
});

test('validateStaffRegistration rechaza duplicados sin sobrescribir, correos inválidos, rol ciudadano en panel interno y cuadrillas ajenas', () => {
  const admin = validateStaffRegistration(
    {
      fullName: 'Administración General',
      email: 'admin@municipalidad.local',
      role: 'administrador',
    },
    [],
    { id: 'USR-ADMIN' },
  );

  // Correo duplicado (insensible a mayúsculas)
  assert.throws(
    () =>
      validateStaffRegistration(
        {
          fullName: 'Otro Funcionario',
          email: 'ADMIN@municipalidad.local',
          role: 'gestor',
          department: 'Red Vial',
        },
        [admin],
      ),
    /ya existe una cuenta registrada/i,
  );

  // Rol ciudadano no es un funcionario interno del panel administrativo
  assert.throws(
    () =>
      validateStaffRegistration(
        {
          fullName: 'Vecino',
          email: 'vecino@correo.local',
          role: 'ciudadano',
        },
        [admin],
      ),
    /rol interno válido/i,
  );

  // Gestor sin dependencia obligatoria
  assert.throws(
    () =>
      validateStaffRegistration(
        {
          fullName: 'Gestor Sin Área',
          email: 'sin.area@municipalidad.local',
          role: 'gestor',
          department: '',
        },
        [admin],
      ),
    /dependencia municipal asociada/i,
  );

  // Encargado de cuadrilla con cuadrilla de otra dependencia
  assert.throws(
    () =>
      validateStaffRegistration(
        {
          fullName: 'Encargado Cruzado',
          email: 'cruzado@municipalidad.local',
          role: 'cuadrilla',
          department: 'Red Vial',
          crew: 'Cuadrilla de poda',
        },
        [admin],
      ),
    /no pertenece a la dependencia/i,
  );
});

test('applyStaffStatusChange desactiva accesos revocando permisos efectivos e impide desactivar al único administrador activo', () => {
  const admin1 = validateStaffRegistration(
    {
      fullName: 'Administración Principal',
      email: 'admin1@municipalidad.local',
      role: 'administrador',
    },
    [],
    { id: 'USR-A1' },
  );
  const gestor = validateStaffRegistration(
    {
      fullName: 'Gestor Ambiental',
      email: 'ambiental@municipalidad.local',
      role: 'gestor',
      department: 'Gestión Ambiental',
    },
    [admin1],
    { id: 'USR-G1' },
  );

  assert.throws(
    () => applyStaffStatusChange([admin1, gestor], 'USR-A1', false),
    /única cuenta de Administrador activa/i,
  );

  const deactivatedGestor = applyStaffStatusChange(
    [admin1, gestor],
    'USR-G1',
    false,
    '2026-11-26T15:00:00.000Z',
  );
  assert.equal(deactivatedGestor.active, false);
  assert.equal(hasModulePermission(deactivatedGestor, 'consola-recepcion'), false);
});
