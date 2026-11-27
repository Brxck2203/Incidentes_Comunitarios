import {
  INTERNAL_STAFF_ROLES,
  ROLE_CATALOG,
  getAuthorizedModulesForRole,
  getCrewsForDepartment,
  municipalDepartments,
} from './rolePermissions.js';

// Base IndexedDB separada para no alterar el esquema compartido 'reporte-ciudadano' v2.
export const USER_DB_NAME = 'reporte-ciudadano-usuarios';
export const USER_DB_VERSION = 1;
export const USER_STORE_NAME = 'users';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function openUserDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB && !globalThis.window?.indexedDB) {
      reject(new Error('El navegador no permite abrir el almacenamiento de usuarios.'));
      return;
    }
    const idb = globalThis.indexedDB || globalThis.window.indexedDB;
    const request = idb.open(USER_DB_NAME, USER_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(USER_STORE_NAME)
        ? request.transaction.objectStore(USER_STORE_NAME)
        : database.createObjectStore(USER_STORE_NAME, { keyPath: 'id' });
      if (!store.indexNames.contains('email')) {
        store.createIndex('email', 'email', { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error('No se pudo abrir el almacenamiento de administración de usuarios.'));
    request.onblocked = () =>
      reject(new Error('Cierra otras pestañas abiertas de la aplicación e inténtalo de nuevo.'));
  });
}

async function userTransaction(mode, action) {
  const database = await openUserDatabase();
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = database.transaction(USER_STORE_NAME, mode);
    } catch {
      database.close();
      reject(new Error('No se pudo iniciar la transacción de usuarios.'));
      return;
    }

    let result;
    let failure = null;
    let settled = false;

    tx.oncomplete = () => {
      database.close();
      settled = true;
      resolve(result);
    };
    tx.onabort = () => {
      database.close();
      if (settled) return;
      settled = true;
      reject(
        failure ||
          new Error('No se pudo guardar o consultar la cuenta del funcionario.'),
      );
    };
    tx.onerror = () => {};

    const abort = (error) => {
      failure =
        error instanceof Error
          ? error
          : new Error(typeof error === 'string' ? error : 'Operación de usuario rechazada.');
      try {
        tx.abort();
      } catch {
        database.close();
        if (!settled) {
          settled = true;
          reject(failure);
        }
      }
    };

    try {
      action(tx.objectStore(USER_STORE_NAME), (value) => {
        result = value;
      }, abort);
    } catch (error) {
      abort(error);
    }
  });
}

/**
 * Indica si ya existe al menos una cuenta activa con el rol Administrador.
 */
export function hasActiveAdministrator(users = []) {
  if (!Array.isArray(users)) return false;
  return users.some(
    (user) => user && user.role === 'administrador' && user.active !== false,
  );
}

/**
 * Valida de forma pura los datos de creación de un funcionario municipal (HU-33 / RF-19)
 * y le asigna únicamente los módulos autorizados correspondientes a su rol.
 */
export function validateStaffRegistration(input, existingUsers = [], options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Los datos del funcionario no son válidos.');
  }
  if (!Array.isArray(existingUsers)) {
    throw new Error('La colección de usuarios existentes no es válida.');
  }

  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  if (!fullName) {
    throw new Error('Ingresa el nombre completo del funcionario.');
  }
  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error('El nombre del funcionario debe tener entre 2 y 120 caracteres.');
  }

  const rawEmail = typeof input.email === 'string' ? input.email.trim() : '';
  if (!rawEmail) {
    throw new Error('Ingresa el correo institucional del funcionario.');
  }
  if (rawEmail.length > 160 || !EMAIL_PATTERN.test(rawEmail)) {
    throw new Error('Ingresa un correo electrónico con formato válido.');
  }
  const normalizedEmail = rawEmail.toLocaleLowerCase();

  const duplicateExists = existingUsers.some(
    (user) =>
      typeof user?.email === 'string' &&
      user.email.trim().toLocaleLowerCase() === normalizedEmail,
  );
  if (duplicateExists) {
    throw new Error('Ya existe una cuenta registrada con ese correo electrónico.');
  }

  const roleKey = typeof input.role === 'string' ? input.role.trim() : '';
  if (!INTERNAL_STAFF_ROLES.includes(roleKey)) {
    throw new Error(
      'Selecciona un rol interno válido (Gestor Municipal, Encargado de Cuadrilla o Administrador).',
    );
  }

  if (!hasActiveAdministrator(existingUsers) && roleKey !== 'administrador') {
    throw new Error(
      'Para el arranque inicial del sistema debes registrar primero una cuenta con el rol Administrador.',
    );
  }

  const roleConfig = ROLE_CATALOG[roleKey];
  const department = typeof input.department === 'string' ? input.department.trim() : '';

  if (roleConfig.requiresDepartment) {
    if (!department) {
      throw new Error('Selecciona la dependencia municipal asociada al funcionario.');
    }
    if (!municipalDepartments.includes(department)) {
      throw new Error('Selecciona una dependencia municipal válida del catálogo.');
    }
  } else if (department && !municipalDepartments.includes(department)) {
    throw new Error('Selecciona una dependencia municipal válida del catálogo.');
  }

  const crew = typeof input.crew === 'string' ? input.crew.trim() : '';
  if (roleConfig.requiresCrew) {
    if (!crew) {
      throw new Error('Selecciona la cuadrilla vinculada a la dependencia elegida.');
    }
    const allowedCrews = getCrewsForDepartment(department);
    if (!allowedCrews.includes(crew)) {
      throw new Error('La cuadrilla seleccionada no pertenece a la dependencia indicada.');
    }
  } else if (crew) {
    throw new Error(
      'Solo el rol Encargado de Cuadrilla se vincula a una cuadrilla específica.',
    );
  }

  const authorizedModules = getAuthorizedModulesForRole(roleKey).map((mod) => mod.key);
  const at = options.at || new Date().toISOString();
  const id = options.id || `USR-${crypto.randomUUID()}`;

  // TODO: enlazar asignación y verificación de credenciales cifradas cuando se integre HU-31.
  return {
    id,
    fullName,
    email: normalizedEmail,
    role: roleKey,
    roleLabel: roleConfig.label,
    department,
    crew: roleConfig.requiresCrew ? crew : '',
    authorizedModules,
    active: true,
    credential: null,
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * Aplica de forma pura la activación o desactivación de una cuenta interna (RF-19),
 * impidiendo dejar al sistema sin ningún Administrador activo.
 */
export function applyStaffStatusChange(
  existingUsers = [],
  userId,
  active,
  at = new Date().toISOString(),
) {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new Error('El identificador del funcionario no es válido.');
  }
  if (typeof active !== 'boolean') {
    throw new Error('El estado de acceso indicado no es válido.');
  }

  const target = existingUsers.find((item) => item && item.id === userId.trim());
  if (!target) {
    throw new Error('No se encontró la cuenta del funcionario solicitado.');
  }

  if (!active && target.role === 'administrador' && target.active !== false) {
    const remainingActiveAdmins = existingUsers.filter(
      (item) =>
        item &&
        item.id !== target.id &&
        item.role === 'administrador' &&
        item.active !== false,
    );
    if (remainingActiveAdmins.length === 0) {
      throw new Error('No se puede desactivar la única cuenta de Administrador activa.');
    }
  }

  // TODO: invalidar sesión activa del funcionario de inmediato cuando se integren HU-31 y HU-34.
  return {
    ...target,
    active,
    updatedAt: at,
  };
}

export function getInternalUsers() {
  return userTransaction('readonly', (store, done, abort) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const sorted = [...request.result].sort((a, b) =>
        String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
      );
      done(sorted);
    };
    request.onerror = () => abort(new Error('No se pudo leer el padrón de funcionarios.'));
  });
}

export function registerInternalUser(input) {
  return userTransaction('readwrite', (store, done, abort) => {
    const listReq = store.getAll();
    listReq.onsuccess = () => {
      try {
        const account = validateStaffRegistration(input, listReq.result);
        const addReq = store.add(account);
        addReq.onsuccess = () => done(account);
        addReq.onerror = () =>
          abort(new Error('Ya existe una cuenta registrada con ese correo electrónico.'));
      } catch (error) {
        abort(error);
      }
    };
    listReq.onerror = () =>
      abort(new Error('No se pudo verificar la existencia previa del correo.'));
  });
}

export function setInternalUserActiveStatus(userId, active) {
  return userTransaction('readwrite', (store, done, abort) => {
    const listReq = store.getAll();
    listReq.onsuccess = () => {
      try {
        const updated = applyStaffStatusChange(listReq.result, userId, active);
        const putReq = store.put(updated);
        putReq.onsuccess = () => done(updated);
        putReq.onerror = () =>
          abort(new Error('No se pudo actualizar el estado de la cuenta.'));
      } catch (error) {
        abort(error);
      }
    };
    listReq.onerror = () =>
      abort(new Error('No se pudo consultar la cuenta del funcionario.'));
  });
}
