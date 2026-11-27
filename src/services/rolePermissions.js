import { municipalCrews } from './crewAssignment.js';

// Reutiliza las dependencias y cuadrillas oficiales definidas en HU-15 (RF-10).
export const municipalDepartments = Object.keys(
  Object.fromEntries(
    Object.values(municipalCrews).map((entry) => [entry.department, true]),
  ),
);

export function getCrewsForDepartment(department) {
  if (typeof department !== 'string' || !department.trim()) return [];
  const normalized = department.trim();
  const crews = [];
  for (const entry of Object.values(municipalCrews)) {
    if (entry.department === normalized) {
      for (const crew of entry.crews) {
        if (!crews.includes(crew)) crews.push(crew);
      }
    }
  }
  return crews;
}

export const SYSTEM_MODULES = {
  'reporte-ciudadano': {
    key: 'reporte-ciudadano',
    label: 'Captura rápida de reportes',
    route: '/',
  },
  'mis-reportes': {
    key: 'mis-reportes',
    label: 'Mis reportes y respaldos',
    route: '/reportes',
  },
  'consola-recepcion': {
    key: 'consola-recepcion',
    label: 'Consola de recepción municipal',
    route: '/recepcion',
  },
  'dictamen-y-consolidacion': {
    key: 'dictamen-y-consolidacion',
    label: 'Dictamen preliminar y consolidación',
    route: '/recepcion',
  },
  'asignacion-cuadrillas': {
    key: 'asignacion-cuadrillas',
    label: 'Asignación y canalización de cuadrillas',
    route: '/recepcion',
  },
  'bandeja-cuadrilla': {
    key: 'bandeja-cuadrilla',
    label: 'Bandeja operativa de cuadrilla',
    route: '/cuadrilla',
  },
  'cierre-tecnico': {
    key: 'cierre-tecnico',
    label: 'Registro de avance y cierre técnico',
    route: '/recepcion',
  },
  estadisticas: {
    key: 'estadisticas',
    label: 'Tablero estadístico y mapa de calor',
    route: '/estadisticas',
  },
  'auditoria-expedientes': {
    key: 'auditoria-expedientes',
    label: 'Historial de auditoría de expedientes',
    route: '/recepcion',
  },
  'administracion-usuarios': {
    key: 'administracion-usuarios',
    label: 'Administración de usuarios y roles',
    route: '/usuarios',
  },
};

export const ROLE_CATALOG = {
  ciudadano: {
    key: 'ciudadano',
    label: 'Ciudadano',
    isInternal: false,
    requiresDepartment: false,
    requiresCrew: false,
    modules: ['reporte-ciudadano', 'mis-reportes'],
  },
  gestor: {
    key: 'gestor',
    label: 'Gestor Municipal',
    isInternal: true,
    requiresDepartment: true,
    requiresCrew: false,
    modules: [
      'consola-recepcion',
      'dictamen-y-consolidacion',
      'asignacion-cuadrillas',
      'estadisticas',
    ],
  },
  cuadrilla: {
    key: 'cuadrilla',
    label: 'Encargado de Cuadrilla',
    isInternal: true,
    requiresDepartment: true,
    requiresCrew: true,
    modules: ['bandeja-cuadrilla', 'cierre-tecnico'],
  },
  administrador: {
    key: 'administrador',
    label: 'Administrador',
    isInternal: true,
    requiresDepartment: false,
    requiresCrew: false,
    modules: [
      'administracion-usuarios',
      'auditoria-expedientes',
      'consola-recepcion',
      'estadisticas',
    ],
  },
};

export const INTERNAL_STAFF_ROLES = Object.values(ROLE_CATALOG)
  .filter((role) => role.isInternal)
  .map((role) => role.key);

/**
 * Devuelve la lista detallada de módulos autorizados para un rol del catálogo (RF-19 / HU-33).
 */
export function getAuthorizedModulesForRole(roleKey) {
  const normalized = typeof roleKey === 'string' ? roleKey.trim() : '';
  const role = ROLE_CATALOG[normalized];
  if (!role) {
    throw new Error('Selecciona un rol válido del catálogo.');
  }
  return role.modules.map((moduleKey) => ({ ...SYSTEM_MODULES[moduleKey] }));
}

/**
 * Verifica si una cuenta o rol tiene permiso sobre un módulo específico.
 * TODO: utilizar en guardas de navegación y acciones operativas cuando se integre HU-34.
 */
export function hasModulePermission(subject, moduleKey) {
  if (!subject || typeof moduleKey !== 'string' || !SYSTEM_MODULES[moduleKey]) {
    return false;
  }
  if (typeof subject === 'string') {
    const role = ROLE_CATALOG[subject.trim()];
    return Boolean(role && role.modules.includes(moduleKey));
  }
  if (typeof subject === 'object') {
    if (subject.active === false) return false;
    if (Array.isArray(subject.authorizedModules)) {
      return subject.authorizedModules.includes(moduleKey);
    }
    const role = ROLE_CATALOG[String(subject.role ?? '').trim()];
    return Boolean(role && role.modules.includes(moduleKey));
  }
  return false;
}
