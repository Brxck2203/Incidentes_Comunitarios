// Catálogo unificado de roles (RF-19) compatible con HU-31 y HU-33.
export const SESSION_STORAGE_KEY = 'reporte-ciudadano-sesion';
export const STAFF_DB_NAME = 'reporte-ciudadano-usuarios';
export const STAFF_DB_VERSION = 1;
export const STAFF_STORE_NAME = 'users';

export const CITIZEN_DB_NAME = 'reporte-ciudadano-cuentas-ciudadanas';
export const CITIZEN_DB_VERSION = 1;
export const CITIZEN_STORE_NAME = 'citizens';

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;

export const ROLE_DEFINITIONS = {
  ciudadano: {
    key: 'ciudadano',
    label: 'Ciudadano',
    // Vista permitida al denegar acceso administrativo o de auditoría.
    allowedHomeRoute: '/reportes',
  },
  cuadrilla: {
    key: 'cuadrilla',
    label: 'Encargado de Cuadrilla',
    // TODO: redirigir a '/cuadrilla' cuando se integre la bandeja operativa de HU-17.
    allowedHomeRoute: '/acceso',
  },
  gestor: {
    key: 'gestor',
    label: 'Gestor Municipal',
    allowedHomeRoute: '/recepcion',
  },
  administrador: {
    key: 'administrador',
    label: 'Administrador',
    allowedHomeRoute: '/recepcion',
  },
};

export const ACTION_PERMISSIONS = {
  'municipal-admission': ['gestor', 'administrador'],
  'crew-assignment': ['gestor', 'administrador'],
  'technical-closure': ['cuadrilla', 'gestor', 'administrador'],
  'audit-log': ['administrador'],
  'user-administration': ['administrador'],
};

// Reglas de rutas existentes en main y rutas declaradas de otras HU pendientes de integrar.
export const ROUTE_PERMISSIONS = [
  {
    pattern: /^\/recepcion\/?$/,
    allowedRoles: ['gestor', 'administrador'],
    label: 'la consola municipal de admisión y recepción',
  },
  {
    pattern: /^\/recepcion\/[^/]+\/?$/,
    allowedRoles: ['cuadrilla', 'gestor', 'administrador'],
    label: 'el expediente operativo municipal',
  },
  // TODO: activar sobre la pestaña/ruta dedicada de auditoría cuando se integre HU-22.
  {
    pattern: /^\/auditoria(\/.*)?$/,
    allowedRoles: ['administrador'],
    label: 'el módulo de auditoría de expedientes',
  },
  // TODO: conectar con el panel de administración de usuarios cuando se integre HU-33.
  {
    pattern: /^\/usuarios(\/.*)?$/,
    allowedRoles: ['administrador'],
    label: 'el panel de administración de usuarios',
  },
  // TODO: conectar con el tablero estadístico y mapa de calor cuando se integren HU-27 y HU-29.
  {
    pattern: /^\/estadisticas(\/.*)?$/,
    allowedRoles: ['gestor', 'administrador'],
    label: 'el módulo de estadísticas municipales',
  },
  // TODO: conectar con la bandeja operativa móvil cuando se integre HU-17.
  {
    pattern: /^\/cuadrilla(\/.*)?$/,
    allowedRoles: ['cuadrilla', 'gestor', 'administrador'],
    label: 'la bandeja operativa de cuadrilla',
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ACCESS_EVENT_NAME = 'access-session-changed';
const memorySessionFallback = new Map();

function readStorage(key) {
  try {
    if (globalThis.localStorage) {
      return globalThis.localStorage.getItem(key);
    }
  } catch {
    // Respaldo en memoria cuando el entorno restringe localStorage.
  }
  return memorySessionFallback.has(key) ? memorySessionFallback.get(key) : null;
}

function writeStorage(key, value) {
  const str = String(value);
  memorySessionFallback.set(key, str);
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem(key, str);
    }
  } catch {
    // Mantiene respaldo en memoria.
  }
}

function removeStorage(key) {
  memorySessionFallback.delete(key);
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.removeItem(key);
    }
  } catch {
    // Ignorar fallo de limpieza en entorno restringido.
  }
}

function emitAccessSessionChange(detail) {
  if (
    typeof globalThis.window?.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    globalThis.window.dispatchEvent(new CustomEvent(ACCESS_EVENT_NAME, { detail }));
  }
}

export function subscribeToAccessSession(listener) {
  if (typeof globalThis.window?.addEventListener !== 'function') {
    return () => {};
  }
  const handler = (event) => listener(event.detail);
  globalThis.window.addEventListener(ACCESS_EVENT_NAME, handler);
  // También escucha cambios emitidos desde el módulo ciudadano (HU-31) si está presente.
  globalThis.window.addEventListener('citizen-session-changed', handler);
  return () => {
    globalThis.window.removeEventListener(ACCESS_EVENT_NAME, handler);
    globalThis.window.removeEventListener('citizen-session-changed', handler);
  };
}

/**
 * Obtiene la ruta de destino permitida para redirigir cuando se niega el acceso.
 * Política de negación por defecto ante sesión nula, caducada o rol desconocido.
 */
export function resolveAllowedRedirectRoute(session) {
  if (!session || typeof session !== 'object' || session.active === false) {
    return '/reportes';
  }
  const roleInfo = ROLE_DEFINITIONS[String(session.role ?? '').trim()];
  if (!roleInfo) {
    return '/reportes';
  }
  return roleInfo.allowedHomeRoute;
}

/**
 * Valida de forma síncrona la sesión almacenada aplicando negación por defecto
 * si no hay sesión, si expiró, si está inactiva o si el rol no pertenece al catálogo.
 */
export function getActiveAccessSession({ now = new Date().toISOString() } = {}) {
  const raw = readStorage(SESSION_STORAGE_KEY);
  if (!raw) {
    return { valid: false, reason: 'unauthenticated', session: null };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeStorage(SESSION_STORAGE_KEY);
    return { valid: false, reason: 'corrupted', session: null };
  }

  if (!parsed || typeof parsed !== 'object') {
    removeStorage(SESSION_STORAGE_KEY);
    return { valid: false, reason: 'corrupted', session: null };
  }

  if (parsed.active === false) {
    removeStorage(SESSION_STORAGE_KEY);
    return { valid: false, reason: 'deactivated', session: null };
  }

  const roleKey = typeof parsed.role === 'string' ? parsed.role.trim() : '';
  if (!ROLE_DEFINITIONS[roleKey]) {
    removeStorage(SESSION_STORAGE_KEY);
    return { valid: false, reason: 'unknown-role', session: null };
  }

  const nowMs = Date.parse(now);
  const expiresMs = Date.parse(parsed.expiresAt || '');
  if (!Number.isFinite(expiresMs) || (Number.isFinite(nowMs) && nowMs > expiresMs)) {
    removeStorage(SESSION_STORAGE_KEY);
    return { valid: false, reason: 'expired', session: null };
  }

  return { valid: true, reason: 'ok', session: parsed };
}

export function logoutAccessSession() {
  removeStorage(SESSION_STORAGE_KEY);
  emitAccessSessionChange({ type: 'logout', session: null });
}

/**
 * Evalúa de forma pura si una sesión puede ingresar a una ruta (y parámetros de búsqueda).
 * Niega por defecto ante sesión inválida, rol desconocido o falta de privilegio.
 */
export function evaluateRouteAccess(
  pathname,
  session,
  { search = '', now = new Date().toISOString() } = {},
) {
  const normalizedPath = typeof pathname === 'string' && pathname ? pathname : '/';
  const params = new URLSearchParams(search || '');
  const wantsAuditSection =
    params.get('seccion') === 'auditoria' ||
    params.get('tab') === 'auditoria' ||
    params.get('vista') === 'auditoria';

  const matchedRule = wantsAuditSection
    ? {
        allowedRoles: ['administrador'],
        label: 'el historial de auditoría de expedientes',
      }
    : ROUTE_PERMISSIONS.find((rule) => rule.pattern.test(normalizedPath));

  // Rutas públicas ciudadanas (/, /reportes, /reportes/:ticket, /acceso, /cuenta)
  if (!matchedRule) {
    return { allowed: true, redirectTo: null, reason: '' };
  }

  if (!session || typeof session !== 'object') {
    return {
      allowed: false,
      redirectTo: '/reportes',
      reason: `Acceso restringido: inicia sesión con un perfil autorizado para ingresar a ${matchedRule.label}.`,
    };
  }

  if (session.active === false) {
    return {
      allowed: false,
      redirectTo: '/acceso',
      reason: 'Acceso bloqueado: esta cuenta ha sido desactivada por la administración municipal.',
    };
  }

  const roleKey = typeof session.role === 'string' ? session.role.trim() : '';
  const roleInfo = ROLE_DEFINITIONS[roleKey];
  if (!roleInfo) {
    return {
      allowed: false,
      redirectTo: '/reportes',
      reason: 'Acceso denegado: el perfil de la sesión no es reconocido por el sistema.',
    };
  }

  const nowMs = Date.parse(now);
  const expiresMs = Date.parse(session.expiresAt || '');
  if (!Number.isFinite(expiresMs) || (Number.isFinite(nowMs) && nowMs > expiresMs)) {
    return {
      allowed: false,
      redirectTo: '/acceso',
      reason: 'Tu sesión expiró. Inicia sesión nuevamente para continuar.',
    };
  }

  if (!matchedRule.allowedRoles.includes(roleKey)) {
    return {
      allowed: false,
      redirectTo: resolveAllowedRedirectRoute(session),
      reason: `Acceso denegado: el perfil ${roleInfo.label} no está autorizado para ingresar a ${matchedRule.label}.`,
    };
  }

  return { allowed: true, redirectTo: null, reason: '' };
}

/**
 * Evalúa si una sesión activa tiene permiso para ejecutar o visualizar una acción específica.
 */
export function evaluateActionAccess(
  actionKey,
  session,
  { now = new Date().toISOString() } = {},
) {
  const allowedRoles = ACTION_PERMISSIONS[actionKey];
  if (!allowedRoles || !session || typeof session !== 'object') return false;
  if (session.active === false) return false;

  const roleKey = typeof session.role === 'string' ? session.role.trim() : '';
  if (!ROLE_DEFINITIONS[roleKey]) return false;

  const nowMs = Date.parse(now);
  const expiresMs = Date.parse(session.expiresAt || '');
  if (!Number.isFinite(expiresMs) || (Number.isFinite(nowMs) && nowMs > expiresMs)) {
    return false;
  }

  return allowedRoles.includes(roleKey);
}

function readAllFromStoreIfAvailable(dbName, version, storeName, keyField = 'id') {
  return new Promise((resolve) => {
    const idb = globalThis.indexedDB || globalThis.window?.indexedDB;
    if (!idb) {
      resolve([]);
      return;
    }
    let request;
    try {
      request = idb.open(dbName, version);
    } catch {
      resolve([]);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: keyField });
        if (!store.indexNames.contains('email')) {
          store.createIndex('email', 'email', { unique: true });
        }
      }
    };
    request.onerror = () => resolve([]);
    request.onblocked = () => resolve([]);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve([]);
        return;
      }
      try {
        const tx = db.transaction(storeName, 'readonly');
        const getAllReq = tx.objectStore(storeName).getAll();
        getAllReq.onsuccess = () => {
          db.close();
          resolve(Array.isArray(getAllReq.result) ? getAllReq.result : []);
        };
        getAllReq.onerror = () => {
          db.close();
          resolve([]);
        };
      } catch {
        db.close();
        resolve([]);
      }
    };
  });
}

/**
 * Verifica contra IndexedDB que la cuenta asociada a la sesión actual no haya sido desactivada.
 * Si fue desactivada en el panel de administración (HU-33), revoca de inmediato la sesión
 * sin alterar ni borrar registros de `reporte-ciudadano` (auditLog / history).
 */
export async function verifySessionAccountActive({
  now = new Date().toISOString(),
} = {}) {
  const state = getActiveAccessSession({ now });
  if (!state.valid || !state.session) {
    return state;
  }

  const current = state.session;
  const isCitizen = current.role === 'ciudadano';
  const accounts = await readAllFromStoreIfAvailable(
    isCitizen ? CITIZEN_DB_NAME : STAFF_DB_NAME,
    isCitizen ? CITIZEN_DB_VERSION : STAFF_DB_VERSION,
    isCitizen ? CITIZEN_STORE_NAME : STAFF_STORE_NAME,
  );

  if (accounts.length > 0) {
    const matched = accounts.find(
      (item) =>
        item &&
        (item.id === current.userId ||
          (typeof item.email === 'string' &&
            typeof current.email === 'string' &&
            item.email.trim().toLocaleLowerCase() ===
              current.email.trim().toLocaleLowerCase())),
    );
    if (matched && matched.active === false) {
      logoutAccessSession();
      return { valid: false, reason: 'deactivated', session: null };
    }
  }

  return state;
}

/**
 * Inicia sesión verificando el estado activo de la cuenta en el padrón de usuarios (HU-33).
 * Si la cuenta existe con `active: false`, bloquea de inmediato el inicio de sesión.
 * Si aún no hay cuentas creadas en `reporte-ciudadano-usuarios` (antes de fusionar HU-33),
 * permite abrir sesión local indicando correo y perfil para validar el control de acceso.
 */
export async function loginRoleSession(
  input = {},
  {
    now = new Date().toISOString(),
    timeoutMinutes = DEFAULT_SESSION_TIMEOUT_MINUTES,
  } = {},
) {
  const rawEmail = typeof input?.email === 'string' ? input.email.trim() : '';
  if (!rawEmail || rawEmail.length > 160 || !EMAIL_PATTERN.test(rawEmail)) {
    throw new Error('Ingresa un correo electrónico con formato válido.');
  }
  const normalizedEmail = rawEmail.toLocaleLowerCase();

  const staffAccounts = await readAllFromStoreIfAvailable(
    STAFF_DB_NAME,
    STAFF_DB_VERSION,
    STAFF_STORE_NAME,
  );

  const matchedStaff = staffAccounts.find(
    (item) =>
      typeof item?.email === 'string' &&
      item.email.trim().toLocaleLowerCase() === normalizedEmail,
  );

  if (matchedStaff) {
    if (matchedStaff.active === false) {
      logoutAccessSession();
      throw new Error(
        'Esta cuenta fue desactivada en el panel de administración y su inicio de sesión está bloqueado.',
      );
    }
    const roleInfo = ROLE_DEFINITIONS[matchedStaff.role];
    if (!roleInfo) {
      throw new Error('El rol asignado a la cuenta no es válido.');
    }

    const nowMs = Date.parse(now);
    const session = {
      userId: matchedStaff.id,
      fullName: matchedStaff.fullName || roleInfo.label,
      email: normalizedEmail,
      role: roleInfo.key,
      roleLabel: roleInfo.label,
      department: matchedStaff.department || '',
      crew: matchedStaff.crew || '',
      active: true,
      issuedAt: now,
      lastActivityAt: now,
      expiresAt: new Date(nowMs + timeoutMinutes * 60 * 1000).toISOString(),
      timeoutMinutes,
    };

    writeStorage(SESSION_STORAGE_KEY, JSON.stringify(session));
    emitAccessSessionChange({ type: 'login', session });
    return session;
  }

  // Si ya existen cuentas internas registradas (HU-33 integrada), exige estar en el padrón
  // salvo cuando el usuario elija perfil ciudadano demostrativo.
  const requestedRole = typeof input?.role === 'string' ? input.role.trim() : '';
  if (staffAccounts.length > 0 && requestedRole !== 'ciudadano') {
    throw new Error('No se encontró una cuenta interna registrada para ese correo.');
  }

  // TODO: exigir siempre registro previo en HU-31 / HU-33 cuando ambas ramas se fusionen en main.
  const roleInfo = ROLE_DEFINITIONS[requestedRole];
  if (!roleInfo) {
    throw new Error('Selecciona un perfil válido para iniciar sesión.');
  }

  const nowMs = Date.parse(now);
  const fallbackSession = {
    userId: `SES-${crypto.randomUUID()}`,
    fullName: roleInfo.label,
    email: normalizedEmail,
    role: roleInfo.key,
    roleLabel: roleInfo.label,
    department: '',
    crew: '',
    active: true,
    issuedAt: now,
    lastActivityAt: now,
    expiresAt: new Date(nowMs + timeoutMinutes * 60 * 1000).toISOString(),
    timeoutMinutes,
  };

  writeStorage(SESSION_STORAGE_KEY, JSON.stringify(fallbackSession));
  emitAccessSessionChange({ type: 'login', session: fallbackSession });
  return fallbackSession;
}
