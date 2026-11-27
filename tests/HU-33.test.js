import test from 'node:test';
import assert from 'node:assert/strict';
import {
  USER_DB_NAME,
  USER_DB_VERSION,
  USER_STORE_NAME,
  getInternalUsers,
  registerInternalUser,
  setInternalUserActiveStatus,
} from '../src/services/userAdministration.js';
import { hasModulePermission } from '../src/services/rolePermissions.js';

function setupUserIndexedDBMock(initialRecords = []) {
  const records = new Map(initialRecords.map((item) => [item.id, item]));
  const openedDatabases = [];
  let hasEmailIndex = false;
  let currentVersion = initialRecords.length ? USER_DB_VERSION : 0;

  const storeMeta = {
    indexNames: { contains: (name) => name === 'email' && hasEmailIndex },
    createIndex: (name) => {
      if (name === 'email') hasEmailIndex = true;
    },
  };

  const db = {
    objectStoreNames: {
      contains: (name) => name === USER_STORE_NAME && currentVersion >= 1,
    },
    close: () => {},
    createObjectStore: (name) => {
      assert.equal(name, USER_STORE_NAME);
      return storeMeta;
    },
    transaction(storeName) {
      assert.equal(storeName, USER_STORE_NAME);
      let pending = 0;
      let completeTimer = null;
      let aborted = false;

      const tx = {
        oncomplete: null,
        onabort: null,
        onerror: null,
        abort() {
          if (aborted) return;
          aborted = true;
          if (completeTimer) clearTimeout(completeTimer);
          setTimeout(() => tx.onabort?.(), 0);
        },
        objectStore() {
          const schedule = (fn) => {
            const req = { onsuccess: null, onerror: null, transaction: tx };
            pending += 1;
            if (completeTimer) clearTimeout(completeTimer);
            setTimeout(() => {
              if (aborted) return;
              try {
                req.result = fn();
                req.onsuccess?.();
              } catch (err) {
                req.error = err;
                req.onerror?.();
              }
              pending -= 1;
              if (pending === 0 && !aborted) {
                completeTimer = setTimeout(() => tx.oncomplete?.(), 0);
              }
            }, 0);
            return req;
          };

          return {
            getAll: () => schedule(() => Array.from(records.values())),
            add: (value) =>
              schedule(() => {
                const emailClash = Array.from(records.values()).some(
                  (existing) => existing.email === value.email,
                );
                if (records.has(value.id) || emailClash) {
                  throw new Error('duplicate key');
                }
                records.set(value.id, value);
                return value.id;
              }),
            put: (value) =>
              schedule(() => {
                records.set(value.id, value);
                return value.id;
              }),
          };
        },
      };

      return tx;
    },
  };

  const indexedDBMock = {
    open(name, version) {
      openedDatabases.push({ name, version });
      const req = {
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      };
      setTimeout(() => {
        if (version > currentVersion) {
          req.transaction = { objectStore: () => storeMeta };
          req.onupgradeneeded?.();
          currentVersion = version;
        }
        req.onsuccess?.();
      }, 0);
      return req;
    },
  };

  globalThis.window = { indexedDB: indexedDBMock };
  globalThis.indexedDB = indexedDBMock;

  return { records, openedDatabases };
}

test('HU-33: registra funcionarios en base IndexedDB aislada asignando únicamente los módulos de su rol y rechaza duplicados sin sobrescribir', async () => {
  const { openedDatabases } = setupUserIndexedDBMock();

  // 1. Arranque inicial: primer Administrador
  const admin = await registerInternalUser({
    fullName: 'Administración Municipal',
    email: 'admin.sistema@municipalidad.local',
    role: 'administrador',
  });
  assert.equal(admin.role, 'administrador');
  assert.equal(admin.credential, null);

  // 2. Registro de Gestor Municipal y Encargado de Cuadrilla
  const gestor = await registerInternalUser({
    fullName: 'Gestoría de Parques',
    email: 'gestor.parques@municipalidad.local',
    role: 'gestor',
    department: 'Parques y Ornato',
  });
  const cuadrilla = await registerInternalUser({
    fullName: 'Jefatura de Poda',
    email: 'poda.ornato@municipalidad.local',
    role: 'cuadrilla',
    department: 'Parques y Ornato',
    crew: 'Cuadrilla de poda',
  });

  // Verifica que cada perfil recibió únicamente las herramientas de su trabajo
  assert.equal(hasModulePermission(gestor, 'consola-recepcion'), true);
  assert.equal(hasModulePermission(gestor, 'asignacion-cuadrillas'), true);
  assert.equal(hasModulePermission(gestor, 'administracion-usuarios'), false);
  assert.equal(hasModulePermission(gestor, 'bandeja-cuadrilla'), false);

  assert.equal(hasModulePermission(cuadrilla, 'bandeja-cuadrilla'), true);
  assert.equal(hasModulePermission(cuadrilla, 'cierre-tecnico'), true);
  assert.equal(hasModulePermission(cuadrilla, 'consola-recepcion'), false);
  assert.equal(hasModulePermission(cuadrilla, 'administracion-usuarios'), false);

  // 3. Duplicado rechazado sin alterar la cuenta original
  await assert.rejects(
    () =>
      registerInternalUser({
        fullName: 'Intento Duplicado',
        email: 'GESTOR.PARQUES@municipalidad.local',
        role: 'administrador',
      }),
    /ya existe una cuenta registrada/i,
  );

  // 4. Desactivación de cuenta funcional y protección del único administrador
  await assert.rejects(
    () => setInternalUserActiveStatus(admin.id, false),
    /única cuenta de Administrador activa/i,
  );

  const inactiveCrew = await setInternalUserActiveStatus(cuadrilla.id, false);
  assert.equal(inactiveCrew.active, false);
  assert.equal(hasModulePermission(inactiveCrew, 'bandeja-cuadrilla'), false);

  const persisted = await getInternalUsers();
  assert.equal(persisted.length, 3);
  const storedGestor = persisted.find((u) => u.id === gestor.id);
  assert.equal(storedGestor.fullName, 'Gestoría de Parques');
  assert.equal(storedGestor.role, 'gestor');

  // Garantiza que nunca se abrió ni modificó la base compartida 'reporte-ciudadano'
  assert.ok(
    openedDatabases.every(
      (entry) => entry.name === USER_DB_NAME && entry.version === USER_DB_VERSION,
    ),
  );
});
